import { Router } from 'express';
import { randomUUID } from 'crypto';
import { sendNotification } from '../utils/notify.js';

export function taskRoutes(db: any) {
  const router = Router();

  const hasPermission = (user: any, permission: string) =>
    user?.role === 'Admin' || user?.permissions?.includes(permission);

  const canViewTask = (user: any, task: any, assignees: string[]) =>
    hasPermission(user, 'admin_panel') ||
    hasPermission(user, 'view_all_tasks') ||
    (hasPermission(user, 'manage_dept_tasks') && task.department === user.department) ||
    task.createdBy === user?.id ||
    assignees.includes(user?.id);

  const canEditTask = (user: any, task: any, assignees: string[]) =>
    task.createdBy === user?.id || assignees.includes(user?.id);

  const canDeleteTask = (user: any, task: any) =>
    task.createdBy === user?.id || hasPermission(user, 'admin_panel');

  function groupByKey(rows: any[], key: string): Record<string, any[]> {
    return rows.reduce((acc: Record<string, any[]>, r: any) => {
      (acc[r[key]] ??= []).push(r);
      return acc;
    }, {});
  }

  async function buildTasks(user: any, thresholdDate?: string) {
    let tasksQuery = 'SELECT * FROM tasks WHERE 1=1';
    const params: any[] = [];
    if (thresholdDate) {
      tasksQuery += ' AND (startDate >= ? OR dueDate >= ? OR startDate IS NULL OR dueDate IS NULL)';
      params.push(thresholdDate, thresholdDate);
    }
    
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

    return tasks
      .filter((t: any) => canViewTask(user, t, (aMap[t.id] ?? []).map((r: any) => r.userId)))
      .map((t: any) => ({
      ...t,
      assignees: (aMap[t.id] ?? []).map((r: any) => r.userId),
      tags: (tMap[t.id] ?? []).map((r: any) => r.tag),
      subtasks: (sMap[t.id] ?? []).map((r: any) => ({
        id: r.id, title: r.title, isCompleted: Boolean(r.isCompleted),
      })),
      comments: (cMap[t.id] ?? []).map((r: any) => ({
        id: r.id, userId: r.userId, content: r.content, createdAt: r.createdAt,
      })),
      }));
  }

  /**
   * Comments arrive inside the task payload, so `userId` and `createdAt` are
   * client-supplied. Trusting them let any assignee rewrite history and post
   * comments as the director or the CEO. Known comment ids keep their original
   * author and timestamp; anything new is attributed to whoever sent the request.
   */
  async function saveRelated(
    taskId: string,
    t: any,
    authorId: string,
    existingComments: Map<string, { userId: string; createdAt: string }> = new Map(),
  ) {
    await db.run('DELETE FROM task_assignees WHERE taskId = ?', [taskId]);
    await db.run('DELETE FROM task_tags WHERE taskId = ?', [taskId]);
    await db.run('DELETE FROM task_subtasks WHERE taskId = ?', [taskId]);
    await db.run('DELETE FROM task_comments WHERE taskId = ?', [taskId]);

    for (const userId of (t.assignees ?? [])) {
      await db.run('INSERT INTO task_assignees (taskId, userId) VALUES (?, ?)', [taskId, userId]);
    }
    for (const tag of (t.tags ?? [])) {
      await db.run('INSERT INTO task_tags (taskId, tag) VALUES (?, ?)', [taskId, tag]);
    }
    const subtasks: any[] = t.subtasks ?? [];
    for (let i = 0; i < subtasks.length; i++) {
      const s = subtasks[i];
      await db.run(
        'INSERT INTO task_subtasks (id, taskId, title, isCompleted, sortOrder) VALUES (?, ?, ?, ?, ?)',
        [s.id ?? randomUUID(), taskId, s.title, s.isCompleted ? 1 : 0, i],
      );
    }
    for (const c of (t.comments ?? [])) {
      const prior = c.id ? existingComments.get(c.id) : undefined;
      await db.run(
        'INSERT INTO task_comments (id, taskId, userId, content, createdAt) VALUES (?, ?, ?, ?, ?)',
        [
          c.id ?? randomUUID(),
          taskId,
          prior ? prior.userId : authorId,
          c.content,
          prior ? prior.createdAt : new Date().toISOString(),
        ],
      );
    }
  }

  router.get('/', async (req, res) => {
    try {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      res.json(await buildTasks(req.user, sixMonthsAgo.toISOString()));
    } catch (e) { res.status(500).json({ error: 'Failed to fetch tasks' }); }
  });

  router.get('/archive', async (req, res) => {
    try {
      res.json(await buildTasks(req.user));
    } catch (e) { res.status(500).json({ error: 'Failed to fetch tasks archive' }); }
  });

  router.post('/', async (req, res) => {
    const t = req.body;
    const user = req.user!;
    const isManager = hasPermission(user, 'manage_dept_tasks');
    const canAssignAcrossOrg = isManager || hasPermission(user, 'view_all_tasks') || hasPermission(user, 'admin_panel');
    const assignees = Array.isArray(t.assignees) ? t.assignees : [];
    if (!canAssignAcrossOrg && assignees.some((id: string) => id !== user.id)) {
      return res.status(403).json({ error: 'Bạn chỉ có thể giao công việc cho chính mình' });
    }
    try {
      await db.run(
        'INSERT INTO tasks (id, title, description, startDate, dueDate, estimatedEndAt, priority, status, createdBy, department, recurrence, contractId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [t.id, t.title, t.description ?? null, t.startDate ?? null, t.dueDate ?? null,
          t.estimatedEndAt ?? null, t.priority ?? null, t.status ?? null,
          user.id, canAssignAcrossOrg ? (t.department ?? user.department) : user.department, t.recurrence ?? null, t.contractId ?? null],
      );
      await saveRelated(t.id, { ...t, assignees }, user.id);

      if (user.id) {
        await db.run(
          'INSERT INTO activity_logs (id, userId, action, entityId, entityType, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
          [randomUUID(), user.id, 'task.created', t.id, 'task', new Date().toISOString()],
        );
      }
      if (Array.isArray(assignees)) {
        for (const assigneeId of assignees) {
          if (assigneeId !== user.id) {
            await sendNotification(db, assigneeId, 'task_assigned', 'Công việc mới', `Bạn vừa được giao một công việc mới: ${t.title}`, t.id);
          }
        }
      }
      res.json({ id: t.id });
    } catch (e) { res.status(500).json({ error: 'Failed task create' }); }
  });

  router.put('/:id', async (req, res) => {
    const t = req.body;
    try {
      const existing = await db.get('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
      if (!existing) return res.status(404).json({ error: 'Task not found' });
      const existingAssignees = (await db.all('SELECT userId FROM task_assignees WHERE taskId = ?', [req.params.id])).map((row: any) => row.userId);
      if (!canEditTask(req.user, existing, existingAssignees)) {
        return res.status(403).json({ error: 'Bạn không có quyền chỉnh sửa công việc này' });
      }
      // POST already refuses cross-org assignment; PUT had no such check, so any
      // assignee could hand the task to arbitrary users — each of whom then gains
      // canEditTask on it.
      const isManager = hasPermission(req.user, 'manage_dept_tasks');
      const canAssignAcrossOrg = isManager || hasPermission(req.user, 'view_all_tasks') || hasPermission(req.user, 'admin_panel');
      const nextAssignees = Array.isArray(t.assignees) ? t.assignees : [];
      if (!canAssignAcrossOrg && nextAssignees.some((id: string) => id !== req.user?.id)) {
        return res.status(403).json({ error: 'Bạn chỉ có thể giao công việc cho chính mình' });
      }
      // department drives canViewTask's manage_dept_tasks scoping, so letting an
      // assignee rewrite it moves the task out from under the department head who
      // is supposed to review it. Also stops 't.department ?? null' from silently
      // erasing the department on any PUT that omits the field.
      const nextDepartment = canAssignAcrossOrg ? (t.department ?? existing.department) : existing.department;
      const existingComments = new Map<string, { userId: string; createdAt: string }>(
        (await db.all('SELECT id, userId, createdAt FROM task_comments WHERE taskId = ?', [req.params.id]))
          .map((row: any) => [row.id, { userId: row.userId, createdAt: row.createdAt }]),
      );
      await db.run(
        'UPDATE tasks SET title=?, description=?, startDate=?, dueDate=?, estimatedEndAt=?, priority=?, status=?, department=?, recurrence=?, contractId=? WHERE id=?',
        [t.title, t.description ?? null, t.startDate ?? null, t.dueDate ?? null,
          t.estimatedEndAt ?? null, t.priority ?? null, t.status ?? null,
          nextDepartment, t.recurrence ?? null, t.contractId ?? null, req.params.id],
      );
      await saveRelated(req.params.id, t, req.user?.id ?? 'system', existingComments);

      if (req.user?.id) {
        await db.run(
          'INSERT INTO activity_logs (id, userId, action, entityId, entityType, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
          [randomUUID(), req.user.id, 'task.updated', req.params.id, 'task', new Date().toISOString()],
        );
      }
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Failed task update' }); }
  });

  router.delete('/:id', async (req, res) => {
    try {
      const existing = await db.get('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
      if (!existing) return res.status(404).json({ error: 'Task not found' });
      if (!canDeleteTask(req.user, existing)) {
        return res.status(403).json({ error: 'Bạn không có quyền xóa công việc này' });
      }
      await db.run('DELETE FROM task_assignees WHERE taskId = ?', [req.params.id]);
      await db.run('DELETE FROM task_tags WHERE taskId = ?', [req.params.id]);
      await db.run('DELETE FROM task_subtasks WHERE taskId = ?', [req.params.id]);
      await db.run('DELETE FROM task_comments WHERE taskId = ?', [req.params.id]);
      await db.run('DELETE FROM tasks WHERE id = ?', [req.params.id]);
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
  });

  return router;
}
