import { Router } from 'express';
import { randomUUID } from 'crypto';
import { canManageDepartment } from '../middleware/auth.js';

export function taskTemplateRoutes(db: any) {
  const router = Router();

  // GET /api/task-templates - List templates
  router.get('/', async (req, res) => {
    try {
      const { departmentId, taskType } = req.query;
      let query = `
        SELECT t.*, d.name as departmentName, d.code as departmentCode
        FROM task_templates t
        LEFT JOIN departments d ON t.departmentId = d.id
        WHERE 1=1
      `;
      const params: any[] = [];

      if (departmentId) {
        query += ' AND t.departmentId = ?';
        params.push(departmentId);
      }
      if (taskType) {
        query += ' AND t.taskType = ?';
        params.push(taskType);
      }

      query += ' ORDER BY t.createdAt DESC';
      const rows = await db.all(query, params);

      res.json(
        rows.map((r: any) => ({
          ...r,
          checklist: r.checklist ? JSON.parse(r.checklist) : [],
          defaultTags: r.defaultTags ? JSON.parse(r.defaultTags) : [],
        }))
      );
    } catch (e: any) {
      console.error('GET /api/task-templates error:', e);
      res.status(500).json({ error: 'Failed to fetch task templates', detail: e.message });
    }
  });

  // GET /api/task-templates/:id
  router.get('/:id', async (req, res) => {
    try {
      const r = await db.get(
        `SELECT t.*, d.name as departmentName, d.code as departmentCode
         FROM task_templates t
         LEFT JOIN departments d ON t.departmentId = d.id
         WHERE t.id = ?`,
        [req.params.id]
      );
      if (!r) return res.status(404).json({ error: 'Template not found' });
      res.json({
        ...r,
        checklist: r.checklist ? JSON.parse(r.checklist) : [],
        defaultTags: r.defaultTags ? JSON.parse(r.defaultTags) : [],
      });
    } catch (e: any) {
      res.status(500).json({ error: 'Failed to fetch template detail', detail: e.message });
    }
  });

  // POST /api/task-templates - Create template
  router.post('/', async (req, res) => {
    const { departmentId, code, title, description, estimatedHours, priority, taskType, checklist, defaultTags, requiresApproval } = req.body;

    if (!departmentId || !title?.trim() || !taskType) {
      return res.status(400).json({ error: 'Phòng ban, tiêu đề và loại công việc là bắt buộc' });
    }
    if (!canManageDepartment(req.user, departmentId)) return res.status(403).json({ error: 'Forbidden' });

    try {
      const id = `tpl-${randomUUID().slice(0, 8)}`;
      const templateCode = code || `TPL-${Date.now().toString().slice(-4)}`;
      const now = new Date().toISOString();

      await db.run(
        `INSERT INTO task_templates (
           id, departmentId, code, title, description, estimatedHours,
           priority, taskType, checklist, defaultTags, requiresApproval, createdAt
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          departmentId,
          templateCode,
          title.trim(),
          description || '',
          estimatedHours || 0,
          priority || 'Medium',
          taskType,
          checklist ? JSON.stringify(checklist) : '[]',
          defaultTags ? JSON.stringify(defaultTags) : '[]',
          requiresApproval ? 1 : 0,
          now,
        ]
      );

      res.status(201).json({ id, code: templateCode, success: true });
    } catch (e: any) {
      console.error('POST /api/task-templates error:', e);
      res.status(500).json({ error: 'Failed to create task template', detail: e.message });
    }
  });

  // POST /api/task-templates/:id/instantiate - Instantiate into a Task
  router.post('/:id/instantiate', async (req, res) => {
    const { projectId, contractId, customTitle, dueDate } = req.body;

    try {
      const tpl = await db.get('SELECT * FROM task_templates WHERE id = ?', [req.params.id]);
      if (!tpl) return res.status(404).json({ error: 'Template not found' });
      if (!canManageDepartment(req.user, tpl.departmentId)) return res.status(403).json({ error: 'Forbidden' });

      const dept = await db.get('SELECT name FROM departments WHERE id = ?', [tpl.departmentId]);
      const taskId = `t-${Date.now()}`;
      const now = new Date().toISOString();
      const todayStr = now.split('T')[0];

      await db.run(
        `INSERT INTO tasks (
           id, title, description, startDate, dueDate, estimatedHours,
           priority, status, createdBy, department, departmentId, projectId,
           contractId, taskType, requiresApproval
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          taskId,
          customTitle || tpl.title,
          tpl.description || '',
          todayStr,
          dueDate || todayStr,
          tpl.estimatedHours || 0,
          tpl.priority || 'Medium',
          'Todo',
           req.user!.id,
          dept?.name || '',
          tpl.departmentId,
          projectId || null,
          contractId || null,
          tpl.taskType || 'general',
          tpl.requiresApproval || 0,
        ]
      );

      // Assign creator
       await db.run('INSERT INTO task_assignees (taskId, userId) VALUES (?, ?)', [taskId, req.user!.id]);

      // Add subtasks from checklist
      const subtasks = tpl.checklist ? JSON.parse(tpl.checklist) : [];
      for (let i = 0; i < subtasks.length; i++) {
        const st = subtasks[i];
        const stId = `st-${Date.now()}-${i}`;
        await db.run(
          'INSERT INTO task_subtasks (id, taskId, title, isCompleted, sortOrder) VALUES (?, ?, ?, ?, ?)',
          [stId, taskId, st.title || st, 0, i]
        );
      }

      // Add default tags
      const tags = tpl.defaultTags ? JSON.parse(tpl.defaultTags) : [];
      for (const tag of tags) {
        await db.run('INSERT INTO task_tags (taskId, tag) VALUES (?, ?)', [taskId, tag]);
      }

      res.status(201).json({ success: true, taskId });
    } catch (e: any) {
      console.error('instantiate template error:', e);
      res.status(500).json({ error: 'Failed to instantiate task from template', detail: e.message });
    }
  });

  // DELETE /api/task-templates/:id
  router.delete('/:id', async (req, res) => {
    try {
      const template = await db.get('SELECT departmentId FROM task_templates WHERE id = ?', [req.params.id]);
      if (!template) return res.status(404).json({ error: 'Template not found' });
      if (!canManageDepartment(req.user, template.departmentId)) return res.status(403).json({ error: 'Forbidden' });
      await db.run('DELETE FROM task_templates WHERE id = ?', [req.params.id]);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: 'Failed to delete template', detail: e.message });
    }
  });

  return router;
}
