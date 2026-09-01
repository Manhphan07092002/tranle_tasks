import { Router } from 'express';
import { randomUUID } from 'crypto';
import { sendNotification } from '../utils/notify.js';

export function taskRoutes(db: any) {
  const router = Router();

  function groupByKey(rows: any[], key: string): Record<string, any[]> {
    return rows.reduce((acc: Record<string, any[]>, r: any) => {
      (acc[r[key]] ??= []).push(r);
      return acc;
    }, {});
  }

  async function buildTasks(thresholdDate?: string, filters?: { departmentId?: string; teamId?: string; projectId?: string }) {
    let tasksQuery = `
      SELECT t.*,
             d.name as departmentName, d.code as departmentCode,
             tm.name as teamName,
             p.name as projectName, p.projectCode
      FROM tasks t
      LEFT JOIN departments d ON (t.departmentId = d.id OR t.department = d.name)
      LEFT JOIN teams tm ON t.teamId = tm.id
      LEFT JOIN projects p ON t.projectId = p.id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (thresholdDate) {
      tasksQuery += ' AND (t.startDate >= ? OR t.dueDate >= ? OR t.startDate IS NULL OR t.dueDate IS NULL)';
      params.push(thresholdDate, thresholdDate);
    }
    if (filters?.departmentId) {
      tasksQuery += ' AND (t.departmentId = ? OR t.department = ?)';
      params.push(filters.departmentId, filters.departmentId);
    }
    if (filters?.teamId) {
      tasksQuery += ' AND t.teamId = ?';
      params.push(filters.teamId);
    }
    if (filters?.projectId) {
      tasksQuery += ' AND t.projectId = ?';
      params.push(filters.projectId);
    }

    tasksQuery += ' ORDER BY t.startDate DESC, t.id DESC';

    const [tasks, assignees, tags, subtasks, comments] = await Promise.all([
      db.all(tasksQuery, params),
      db.all('SELECT taskId, userId FROM task_assignees'),
      db.all('SELECT taskId, tag FROM task_tags'),
      db.all('SELECT id, taskId, title, isCompleted FROM task_subtasks ORDER BY sortOrder'),
      db.all('SELECT id, taskId, userId, content, createdAt FROM task_comments ORDER BY createdAt'),
    ]);

    const aMap = groupByKey(assignees, 'taskId');
    const tMap = groupByKey(tags, 'taskId');
    const sMap = groupByKey(subtasks, 'taskId');
    const cMap = groupByKey(comments, 'taskId');

    return tasks.map((t: any) => ({
      ...t,
      assignees: (aMap[t.id] ?? []).map((r: any) => r.userId),
      tags: (tMap[t.id] ?? []).map((r: any) => r.tag),
      subtasks: (sMap[t.id] ?? []).map((r: any) => ({
        id: r.id,
        title: r.title,
        isCompleted: Boolean(r.isCompleted),
      })),
      comments: (cMap[t.id] ?? []).map((r: any) => ({
        id: r.id,
        userId: r.userId,
        content: r.content,
        createdAt: r.createdAt,
      })),
    }));
  }

  async function saveRelated(taskId: string, t: any) {
    await db.run('DELETE FROM task_assignees WHERE taskId = ?', [taskId]);
    await db.run('DELETE FROM task_tags WHERE taskId = ?', [taskId]);
    await db.run('DELETE FROM task_subtasks WHERE taskId = ?', [taskId]);
    await db.run('DELETE FROM task_comments WHERE taskId = ?', [taskId]);

    for (const userId of t.assignees ?? []) {
      await db.run('INSERT INTO task_assignees (taskId, userId) VALUES (?, ?)', [taskId, userId]);
    }
    for (const tag of t.tags ?? []) {
      await db.run('INSERT INTO task_tags (taskId, tag) VALUES (?, ?)', [taskId, tag]);
    }
    const subtasks: any[] = t.subtasks ?? [];
    for (let i = 0; i < subtasks.length; i++) {
      const s = subtasks[i];
      await db.run(
        'INSERT INTO task_subtasks (id, taskId, title, isCompleted, sortOrder) VALUES (?, ?, ?, ?, ?)',
        [s.id ?? randomUUID(), taskId, s.title, s.isCompleted ? 1 : 0, i]
      );
    }
    for (const c of t.comments ?? []) {
      await db.run(
        'INSERT INTO task_comments (id, taskId, userId, content, createdAt) VALUES (?, ?, ?, ?, ?)',
        [c.id ?? randomUUID(), taskId, c.userId, c.content, c.createdAt ?? new Date().toISOString()]
      );
    }
  }

  router.get('/', async (req, res) => {
    try {
      const { departmentId, teamId, projectId } = req.query;
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      res.json(
        await buildTasks(sixMonthsAgo.toISOString(), {
          departmentId: departmentId as string,
          teamId: teamId as string,
          projectId: projectId as string,
        })
      );
    } catch (e: any) {
      console.error('GET /api/tasks error:', e);
      res.status(500).json({ error: 'Failed to fetch tasks', detail: e.message });
    }
  });

  router.get('/archive', async (_req, res) => {
    try {
      res.json(await buildTasks());
    } catch (e) {
      res.status(500).json({ error: 'Failed to fetch tasks archive' });
    }
  });

  router.post('/', async (req, res) => {
    const t = req.body;
    try {
      const taskId = t.id || `t-${Date.now()}`;
      
      // Auto-resolve departmentId
      let resolvedDeptId = t.departmentId;
      if (!resolvedDeptId && t.department) {
        const d = await db.get('SELECT id FROM departments WHERE name = ?', [t.department]);
        if (d) resolvedDeptId = d.id;
      }

      await db.run(
        `INSERT INTO tasks (
           id, title, description, startDate, dueDate, estimatedEndAt, priority, status,
           createdBy, department, departmentId, teamId, projectId, milestoneId, customerId,
           taskType, estimatedHours, recurrence, contractId, requiresApproval, approvalStatus
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          taskId,
          t.title,
          t.description ?? null,
          t.startDate ?? null,
          t.dueDate ?? null,
          t.estimatedEndAt ?? null,
          t.priority ?? 'Medium',
          t.status ?? 'Todo',
          t.createdBy ?? null,
          t.department ?? null,
          resolvedDeptId ?? null,
          t.teamId ?? null,
          t.projectId ?? null,
          t.milestoneId ?? null,
          t.customerId ?? null,
          t.taskType ?? 'general',
          Number(t.estimatedHours || 0),
          t.recurrence ?? null,
          t.contractId ?? null,
          t.requiresApproval ? 1 : 0,
          t.approvalStatus ?? 'none',
        ]
      );
      await saveRelated(taskId, t);

      if (t.createdBy) {
        await db.run(
          'INSERT INTO activity_logs (id, userId, action, entityId, entityType, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
          [randomUUID(), t.createdBy, 'task.created', taskId, 'task', new Date().toISOString()]
        );
      }
      if (Array.isArray(t.assignees)) {
        for (const assigneeId of t.assignees) {
          if (assigneeId !== t.createdBy) {
            await sendNotification(
              db,
              assigneeId,
              'task_assigned',
              'Công việc mới',
              `Bạn vừa được giao một công việc mới: ${t.title}`,
              taskId
            );
          }
        }
      }
      res.json({ id: taskId });
    } catch (e: any) {
      console.error('POST /api/tasks error:', e);
      res.status(500).json({ error: 'Failed task create', detail: e.message });
    }
  });

  router.put('/:id', async (req, res) => {
    const t = req.body;
    try {
      let resolvedDeptId = t.departmentId;
      if (!resolvedDeptId && t.department) {
        const d = await db.get('SELECT id FROM departments WHERE name = ?', [t.department]);
        if (d) resolvedDeptId = d.id;
      }

      await db.run(
        `UPDATE tasks
         SET title=?, description=?, startDate=?, dueDate=?, estimatedEndAt=?, priority=?, status=?,
             department=?, departmentId=?, teamId=?, projectId=?, milestoneId=?, customerId=?,
             taskType=?, estimatedHours=?, actualHours=?, recurrence=?, contractId=?,
             requiresApproval=?, approvalStatus=?, approvedBy=?, completedAt=?
         WHERE id=?`,
        [
          t.title,
          t.description ?? null,
          t.startDate ?? null,
          t.dueDate ?? null,
          t.estimatedEndAt ?? null,
          t.priority ?? null,
          t.status ?? null,
          t.department ?? null,
          resolvedDeptId ?? null,
          t.teamId ?? null,
          t.projectId ?? null,
          t.milestoneId ?? null,
          t.customerId ?? null,
          t.taskType ?? 'general',
          Number(t.estimatedHours || 0),
          Number(t.actualHours || 0),
          t.recurrence ?? null,
          t.contractId ?? null,
          t.requiresApproval !== undefined ? (t.requiresApproval ? 1 : 0) : 0,
          t.approvalStatus ?? 'none',
          t.approvedBy ?? null,
          t.status === 'Done' ? (t.completedAt || new Date().toISOString()) : null,
          req.params.id,
        ]
      );
      await saveRelated(req.params.id, t);

      if (t.updatedBy || t.createdBy) {
        await db.run(
          'INSERT INTO activity_logs (id, userId, action, entityId, entityType, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
          [randomUUID(), t.updatedBy ?? t.createdBy ?? 'system', 'task.updated', req.params.id, 'task', new Date().toISOString()]
        );
      }
      res.json({ success: true });
    } catch (e: any) {
      console.error('PUT /api/tasks error:', e);
      res.status(500).json({ error: 'Failed task update', detail: e.message });
    }
  });

  router.delete('/:id', async (req, res) => {
    try {
      await db.run('DELETE FROM task_assignees WHERE taskId = ?', [req.params.id]);
      await db.run('DELETE FROM task_tags WHERE taskId = ?', [req.params.id]);
      await db.run('DELETE FROM task_subtasks WHERE taskId = ?', [req.params.id]);
      await db.run('DELETE FROM task_comments WHERE taskId = ?', [req.params.id]);
      await db.run('DELETE FROM tasks WHERE id = ?', [req.params.id]);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: 'Failed to delete task' });
    }
  });

  return router;
}
