import { Router } from 'express';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { sendNotification } from '../utils/notify.js';
import { validate } from '../middleware/validate.js';

// P1: chặn payload rác/quá khổ trước khi chạm DB (các field khác cho qua — validate chỉ kiểm tra, không strip body).
const TaskPayloadSchema = z.object({
  title: z.string().trim().min(1, 'Tiêu đề không được để trống').max(500),
  description: z.string().max(20000).optional().nullable(),
  priority: z.string().max(32).optional().nullable(),
  status: z.string().max(32).optional().nullable(),
  assignees: z.array(z.string().max(191)).max(50).optional(),
  tags: z.array(z.string().max(191)).max(20).optional(),
  subtasks: z.array(z.object({
    id: z.string().max(191).optional(),
    title: z.string().min(1).max(500),
    isCompleted: z.boolean().optional(),
  }).passthrough()).max(100).optional(),
  comments: z.array(z.object({
    id: z.string().max(191).optional(),
    userId: z.string().max(191),
    content: z.string().min(1).max(5000),
  }).passthrough()).max(100).optional(),
}).passthrough();

export function taskRoutes(db: any) {
  const router = Router();

  function groupByKey(rows: any[], key: string): Record<string, any[]> {
    return rows.reduce((acc: Record<string, any[]>, r: any) => {
      (acc[r[key]] ??= []).push(r);
      return acc;
    }, {});
  }

  // P2: related tables chỉ load theo task IDs trả về (trước đây full-scan 4 bảng mỗi GET).
  // limit/offset tùy chọn — không truyền thì giữ hành vi cũ (trả tất cả) để tương thích frontend.
  async function buildTasks(
    thresholdDate?: string,
    filters?: { departmentId?: string; teamId?: string; projectId?: string },
    paging?: { limit?: number; offset?: number },
    requester?: any,
  ) {
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
    const canViewAll = requester?.role === 'Admin' || requester?.role === 'Director' || requester?.role === 'Giám Đốc'
      || (requester?.permissions || []).includes('view_all_tasks');
    if (!canViewAll && requester) {
      tasksQuery += ' AND (t.createdBy = ? OR t.assigneeId = ? OR t.id IN (SELECT taskId FROM task_assignees WHERE userId = ?))';
      params.push(requester.id, requester.id, requester.id);
    }

    tasksQuery += ' ORDER BY t.startDate DESC, t.id DESC';

    if (paging?.limit) {
      const limit = Math.min(Math.max(1, Math.floor(paging.limit)), 500);
      const offset = Math.max(0, Math.floor(paging.offset ?? 0));
      tasksQuery += ' LIMIT ? OFFSET ?';
      params.push(limit, offset);
    }

    const tasks = await db.all(tasksQuery, params);
    const ids = tasks.map((t: any) => t.id);

    let assignees: any[] = [];
    let tags: any[] = [];
    let subtasks: any[] = [];
    let comments: any[] = [];
    if (ids.length > 0) {
      [assignees, tags, subtasks, comments] = await Promise.all([
        db.all('SELECT taskId, userId FROM task_assignees WHERE taskId IN (?)', [ids]),
        db.all('SELECT taskId, tag FROM task_tags WHERE taskId IN (?)', [ids]),
        db.all('SELECT id, taskId, title, isCompleted FROM task_subtasks WHERE taskId IN (?) ORDER BY sortOrder', [ids]),
        db.all('SELECT id, taskId, userId, content, createdAt FROM task_comments WHERE taskId IN (?) ORDER BY createdAt', [ids]),
      ]);
    }

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

  async function saveRelated(taskId: string, t: any, actorId: string) {
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
        [c.id ?? randomUUID(), taskId, actorId, c.content, c.createdAt ?? new Date().toISOString()]
      );
    }
  }

  router.get('/', async (req, res) => {
    try {
      const { departmentId, teamId, projectId, limit, offset } = req.query;
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      // P2: limit/offset tùy chọn (VD: ?limit=50&offset=0); không truyền = hành vi cũ.
      const paging = limit !== undefined
        ? { limit: Number(limit), offset: offset !== undefined ? Number(offset) : 0 }
        : undefined;
      res.json(
        await buildTasks(sixMonthsAgo.toISOString(), {
          departmentId: departmentId as string,
          teamId: teamId as string,
          projectId: projectId as string,
        }, paging, req.user)
      );
    } catch (e: any) {
      console.error('GET /api/tasks error:', e);
      res.status(500).json({ error: 'Failed to fetch tasks', detail: e.message });
    }
  });

  router.get('/archive', async (req, res) => {
    try {
      res.json(await buildTasks(undefined, undefined, undefined, req.user));
    } catch (e) {
      res.status(500).json({ error: 'Failed to fetch tasks archive' });
    }
  });

  router.post('/', validate(TaskPayloadSchema), async (req, res) => {
    const t = req.body;
    try {
      const requester = req.user!;
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
          requester.id,
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
      await saveRelated(taskId, t, requester.id);

      if (requester.id) {
        await db.run(
          'INSERT INTO activity_logs (id, userId, action, entityId, entityType, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
          [randomUUID(), requester.id, 'task.created', taskId, 'task', new Date().toISOString()]
        );
      }
      if (Array.isArray(t.assignees)) {
        for (const assigneeId of t.assignees) {
          if (assigneeId !== requester.id) {
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

  // PUT cho phép cập nhật từng phần nên dùng bản partial (title không bắt buộc).
  router.put('/:id', validate(TaskPayloadSchema.partial()), async (req, res) => {
    const t = req.body;
    try {
      const requester = req.user!;
      const existing = await db.get('SELECT id, createdBy FROM tasks WHERE id = ?', [req.params.id]);
      if (!existing) return res.status(404).json({ error: 'Task not found' });
      const canManageAll = requester.role === 'Admin' || requester.role === 'Director' || requester.role === 'Giám Đốc'
        || (requester.permissions || []).includes('view_all_tasks');
      const assignment = await db.get('SELECT 1 FROM task_assignees WHERE taskId = ? AND userId = ?', [req.params.id, requester.id]);
      if (!canManageAll && existing.createdBy !== requester.id && !assignment) {
        return res.status(403).json({ error: 'Forbidden: Bạn chỉ được cập nhật công việc của mình hoặc được giao' });
      }
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
      // Route '/:id' luôn cho single string; cast vì Express 5 widen type khi có nhiều middlewares.
      await saveRelated(req.params.id as string, t, requester.id);

      if (requester.id) {
        await db.run(
          'INSERT INTO activity_logs (id, userId, action, entityId, entityType, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
          [randomUUID(), requester.id, 'task.updated', req.params.id, 'task', new Date().toISOString()]
        );
      }
      res.json({ success: true });
    } catch (e: any) {
      console.error('PUT /api/tasks error:', e);
      res.status(500).json({ error: 'Failed task update', detail: e.message });
    }
  });

  // P0 RBAC: chỉ người tạo task hoặc Admin (role Admin hoặc quyền admin_panel/manage_users) mới được xóa.
  // Khớp checkPermission('delete') ở frontend/App.tsx (isCreator || isAdmin theo permission flags).
  router.delete('/:id', async (req, res) => {
    try {
      const requester = (req as any).user;
      const perms: string[] = requester?.permissions || [];
      const isAdminLike = requester?.role === 'Admin' || perms.includes('admin_panel') || perms.includes('manage_users');
      if (!isAdminLike) {
        const existing = await db.get('SELECT id, createdBy FROM tasks WHERE id = ?', [req.params.id]);
        if (!existing) return res.status(404).json({ error: 'Task not found' });
        if (!existing.createdBy || existing.createdBy !== requester?.id) {
          return res.status(403).json({ error: 'Forbidden: Chỉ người tạo task hoặc Admin được xóa' });
        }
      }
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
