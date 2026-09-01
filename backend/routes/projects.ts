import { Router } from 'express';
import { randomUUID } from 'crypto';
import { sendNotification } from '../utils/notify.js';

export function projectRoutes(db: any) {
  const router = Router();

  async function logActivity(userId: string, action: string, entityId: string, metadata: any) {
    const id = randomUUID();
    await db.run(
      'INSERT INTO activity_logs (id, userId, action, entityId, entityType, metadata, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, userId, action, entityId, 'project', JSON.stringify(metadata), new Date().toISOString()]
    );
  }

  // GET all projects (with participating departments)
  router.get('/', async (req, res) => {
    try {
      const user = (req as any).user;
      if (!user) return res.status(401).json({ error: 'Unauthorized' });

      const perms = user.permissions || [];
      const canViewAll = perms.includes('view_all_reports') || perms.includes('director_feedback') || perms.includes('admin_panel') || perms.includes('view_all_tasks');

      let query = `
        SELECT p.*
        FROM projects p
        WHERE (p.isDeleted IS NULL OR p.isDeleted = 0)
      `;
      const params: any[] = [];

      if (!canViewAll) {
        query += `
          AND (
            p.managerId = ? 
            OR p.departmentId = ? 
            OR p.department = ?
            OR p.id IN (SELECT projectId FROM project_departments WHERE departmentId = ?)
          )
        `;
        params.push(user.id, user.departmentId || '', user.department || '', user.departmentId || '');
      }
      
      query += ' ORDER BY p.createdAt DESC';
      const rows = await db.all(query, params);

      // Attach participating departments to each project
      const allDepts = await db.all(`
        SELECT pd.projectId, pd.departmentId, pd.role, d.name as departmentName, d.code as departmentCode, d.color as departmentColor
        FROM project_departments pd
        JOIN departments d ON pd.departmentId = d.id
      `);

      const deptsByProj = new Map<string, any[]>();
      for (const d of allDepts) {
        if (!deptsByProj.has(d.projectId)) deptsByProj.set(d.projectId, []);
        deptsByProj.get(d.projectId)!.push(d);
      }

      const enrichedRows = rows.map((p: any) => ({
        ...p,
        participatingDepartments: deptsByProj.get(p.id) || []
      }));

      res.json(enrichedRows);
    } catch (e) { res.status(500).json({ error: 'Failed to fetch projects' }); }
  });

  // GET single project with its contracts, reports, and participating departments
  router.get('/:id', async (req, res) => {
    try {
      const project = await db.get('SELECT * FROM projects WHERE id = ?', [req.params.id]);
      if (!project) return res.status(404).json({ error: 'Project not found' });
      
      const contracts = await db.all('SELECT * FROM contracts WHERE projectId = ? AND (isDeleted IS NULL OR isDeleted = 0)', [req.params.id]);
      const reports = await db.all('SELECT * FROM project_reports WHERE projectId = ? ORDER BY createdAt DESC', [req.params.id]);
      const participatingDepartments = await db.all(`
        SELECT pd.projectId, pd.departmentId, pd.role, d.name as departmentName, d.code as departmentCode, d.color as departmentColor
        FROM project_departments pd
        JOIN departments d ON pd.departmentId = d.id
        WHERE pd.projectId = ?
      `, [req.params.id]);
      
      res.json({ project: { ...project, participatingDepartments }, contracts, reports });
    } catch (e) { res.status(500).json({ error: 'Failed to fetch project details' }); }
  });

  // GET participating departments for a project
  router.get('/:id/departments', async (req, res) => {
    try {
      const rows = await db.all(`
        SELECT pd.projectId, pd.departmentId, pd.role, d.name as departmentName, d.code as departmentCode, d.color as departmentColor
        FROM project_departments pd
        JOIN departments d ON pd.departmentId = d.id
        WHERE pd.projectId = ?
      `, [req.params.id]);
      res.json(rows);
    } catch (e) { res.status(500).json({ error: 'Failed to fetch project departments' }); }
  });

  // ADD participating department to project
  router.post('/:id/departments', async (req, res) => {
    const { departmentId, role } = req.body;
    if (!departmentId) return res.status(400).json({ error: 'departmentId is required' });
    try {
      await db.run(
        'INSERT INTO project_departments (projectId, departmentId, role) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE role = VALUES(role)',
        [req.params.id, departmentId, role || 'member']
      );
      res.status(201).json({ success: true });
    } catch (e: any) { res.status(500).json({ error: 'Failed to add project department', detail: e.message }); }
  });

  // REMOVE participating department from project
  router.delete('/:id/departments/:departmentId', async (req, res) => {
    try {
      await db.run(
        'DELETE FROM project_departments WHERE projectId = ? AND departmentId = ?',
        [req.params.id, req.params.departmentId]
      );
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Failed to remove project department' }); }
  });

  // CREATE project
  router.post('/', async (req, res) => {
    const {
      id, projectCode, name, clientName, department, departmentId, primaryDepartmentId,
      managerId, status, startDate, endDate, budget, description, biddingCode,
      biddingDate, procurementMethod, investor, biddingPrice, winningPrice,
      priority, phase, participatingDepartments
    } = req.body;

    try {
      const projectId = id || randomUUID();
      const now = new Date().toISOString();
      const resolvedDeptId = departmentId || primaryDepartmentId || null;

      await db.run(
        `INSERT INTO projects (
          id, projectCode, name, clientName, department, departmentId, primaryDepartmentId,
          managerId, status, startDate, endDate, budget, description, biddingCode,
          biddingDate, procurementMethod, investor, biddingPrice, winningPrice,
          priority, phase, createdAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          projectId, projectCode, name, clientName, department || '', resolvedDeptId, resolvedDeptId,
          managerId, status || 'planning', startDate, endDate, budget || 0, description, biddingCode,
          biddingDate, procurementMethod, investor, biddingPrice || 0, winningPrice || 0,
          priority || 'medium', phase || 'initiation', now
        ]
      );

      // If primary department specified, also ensure it's in project_departments as 'lead'
      if (resolvedDeptId) {
        await db.run(
          'INSERT INTO project_departments (projectId, departmentId, role) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE role = VALUES(role)',
          [projectId, resolvedDeptId, 'lead']
        );
      }

      // Sync any additional participating departments
      if (Array.isArray(participatingDepartments) && participatingDepartments.length > 0) {
        for (const pd of participatingDepartments) {
          const dId = typeof pd === 'string' ? pd : pd.departmentId;
          const role = typeof pd === 'string' ? 'member' : (pd.role || 'member');
          if (dId) {
            await db.run(
              'INSERT INTO project_departments (projectId, departmentId, role) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE role = VALUES(role)',
              [projectId, dId, role]
            );
          }
        }
      }

      // Auto-create a Task for this new project
      const taskId = randomUUID();
      const createdBy = (req as any).user?.id || 'system';
      await db.run(
        'INSERT INTO tasks (id, title, description, startDate, priority, status, createdBy, department, departmentId, projectId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [taskId, `Thực hiện DA: ${projectCode || name}`, `Dự án: ${name}\nKhách hàng: ${clientName || ''}`, now.split('T')[0], 'Medium', 'Todo', createdBy, department || '', resolvedDeptId, projectId]
      );
      if (createdBy && createdBy !== 'system') {
        await db.run('INSERT INTO task_assignees (taskId, userId) VALUES (?, ?)', [taskId, createdBy]);
      }

      await logActivity((req as any).user?.id || 'system', 'Tạo Dự án', projectId, { projectCode, name });

      res.status(201).json({ id: projectId });
    } catch (e: any) { res.status(500).json({ error: 'Failed to create project', detail: e.message }); }
  });

  // UPDATE project
  router.put('/:id', async (req, res) => {
    const {
      projectCode, name, clientName, department, departmentId, primaryDepartmentId,
      managerId, status, startDate, endDate, budget, description, biddingCode,
      biddingDate, procurementMethod, investor, biddingPrice, winningPrice,
      priority, phase, participatingDepartments
    } = req.body;

    try {
      const resolvedDeptId = departmentId || primaryDepartmentId || null;

      await db.run(
        `UPDATE projects SET 
          projectCode=?, name=?, clientName=?, department=?, departmentId=?, primaryDepartmentId=?,
          managerId=?, status=?, startDate=?, endDate=?, budget=?, description=?, biddingCode=?,
          biddingDate=?, procurementMethod=?, investor=?, biddingPrice=?, winningPrice=?,
          priority=?, phase=?, updatedAt=? 
        WHERE id=?`,
        [
          projectCode, name, clientName, department || '', resolvedDeptId, resolvedDeptId,
          managerId, status, startDate, endDate, budget, description, biddingCode,
          biddingDate, procurementMethod, investor, biddingPrice, winningPrice,
          priority || 'medium', phase || 'initiation', new Date().toISOString(), req.params.id
        ]
      );

      // Sync participating departments if passed
      if (Array.isArray(participatingDepartments)) {
        await db.run('DELETE FROM project_departments WHERE projectId = ?', [req.params.id]);
        
        // Ensure primary lead department is included
        if (resolvedDeptId) {
          await db.run(
            'INSERT INTO project_departments (projectId, departmentId, role) VALUES (?, ?, ?)',
            [req.params.id, resolvedDeptId, 'lead']
          );
        }

        for (const pd of participatingDepartments) {
          const dId = typeof pd === 'string' ? pd : pd.departmentId;
          const role = typeof pd === 'string' ? 'member' : (pd.role || 'member');
          if (dId && dId !== resolvedDeptId) {
            await db.run(
              'INSERT INTO project_departments (projectId, departmentId, role) VALUES (?, ?, ?)',
              [req.params.id, dId, role]
            );
          }
        }
      }

      await logActivity((req as any).user?.id || 'system', 'Cập nhật Dự án', req.params.id, { status, budget });

      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: 'Failed to update project', detail: e.message }); }
  });

  // DELETE project
  router.delete('/:id', async (req, res) => {
    try {
      await db.run('UPDATE projects SET isDeleted = 1 WHERE id = ?', [req.params.id]);
      await logActivity((req as any).user?.id || 'system', 'Xóa Dự án', req.params.id, {});
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Failed to delete project' }); }
  });

  // --- PROJECT REPORTS ---
  
  router.get('/:id/reports', async (req, res) => {
    try {
      const rows = await db.all('SELECT * FROM project_reports WHERE projectId = ? ORDER BY createdAt DESC', [req.params.id]);
      res.json(rows);
    } catch (e) { res.status(500).json({ error: 'Failed to fetch project reports' }); }
  });

  router.post('/:id/reports', async (req, res) => {
    const { id, title, content, progress, authorId, status } = req.body;
    try {
      const reportId = id || randomUUID();
      await db.run(
        'INSERT INTO project_reports (id, projectId, title, content, progress, authorId, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [reportId, req.params.id, title, content, progress || 0, authorId, status || 'draft', new Date().toISOString()]
      );

      // notify manager
      if (status === 'submitted') {
        const project = await db.get('SELECT managerId, name FROM projects WHERE id = ?', [req.params.id]);
        if (project?.managerId) {
          await sendNotification(db, project.managerId, 'project_report_submitted', 'Báo cáo dự án mới', `Dự án: ${project.name} có báo cáo mới`, req.params.id);
        }
      }

      await logActivity((req as any).user?.id || 'system', 'Tạo Báo cáo DA', req.params.id, { reportId, title, progress });
      res.status(201).json({ id: reportId });
    } catch (e: any) { res.status(500).json({ error: 'Failed to create project report', detail: e.message }); }
  });

  router.put('/:id/reports/:reportId', async (req, res) => {
    const { title, content, progress, status } = req.body;
    try {
      await db.run(
        'UPDATE project_reports SET title=?, content=?, progress=?, status=?, updatedAt=? WHERE id=? AND projectId=?',
        [title, content, progress, status, new Date().toISOString(), req.params.reportId, req.params.id]
      );
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Failed to update project report' }); }
  });

  router.delete('/:id/reports/:reportId', async (req, res) => {
    try {
      await db.run('DELETE FROM project_reports WHERE id = ? AND projectId = ?', [req.params.reportId, req.params.id]);
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Failed to delete project report' }); }
  });

  // --- PROJECT MILESTONES ---

  router.get('/:id/milestones', async (req, res) => {
    try {
      const rows = await db.all('SELECT * FROM project_milestones WHERE projectId = ? ORDER BY sortOrder ASC, createdAt ASC', [req.params.id]);
      res.json(rows);
    } catch (e) { res.status(500).json({ error: 'Failed to fetch milestones' }); }
  });

  router.post('/:id/milestones', async (req, res) => {
    const { id, title, dueDate, status, sortOrder } = req.body;
    try {
      const mId = id || randomUUID();
      await db.run(
        'INSERT INTO project_milestones (id, projectId, title, dueDate, status, sortOrder, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [mId, req.params.id, title, dueDate, status || 'pending', sortOrder || 0, new Date().toISOString()]
      );
      res.status(201).json({ id: mId });
    } catch (e: any) { res.status(500).json({ error: 'Failed to create milestone', detail: e.message }); }
  });

  router.put('/:id/milestones/:milestoneId', async (req, res) => {
    const { title, dueDate, status, completedAt, sortOrder } = req.body;
    try {
      await db.run(
        'UPDATE project_milestones SET title=?, dueDate=?, status=?, completedAt=?, sortOrder=? WHERE id=? AND projectId=?',
        [title, dueDate, status, completedAt, sortOrder, req.params.milestoneId, req.params.id]
      );
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Failed to update milestone' }); }
  });

  router.delete('/:id/milestones/:milestoneId', async (req, res) => {
    try {
      await db.run('DELETE FROM project_milestones WHERE id = ? AND projectId = ?', [req.params.milestoneId, req.params.id]);
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Failed to delete milestone' }); }
  });

  return router;
}
