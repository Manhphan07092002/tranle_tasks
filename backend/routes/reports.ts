import { Router } from 'express';
import { randomUUID } from 'crypto';
import { sendNotification } from '../utils/notify.js';

export function reportRoutes(db: any) {
  const router = Router();

  router.get('/', async (req, res) => {
    try {
      const user = (req as any).user;
      const perms = user?.permissions || [];
      const canViewAll = perms.includes('view_all_reports') || perms.includes('director_feedback') || perms.includes('admin_panel') || perms.includes('view_all_tasks');
      // Time-boxing: only load data from the last 6 months
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const thresholdDate = sixMonthsAgo.toISOString();

      let query = 'SELECT * FROM reports WHERE (isDeleted IS NULL OR isDeleted = 0) AND createdAt >= ?';
      const params: any[] = [thresholdDate];
      if (!canViewAll && user) {
        query += ' AND (authorId = ? OR department = ?)';
        params.push(user.id, user.department || '');
      }
      query += ' ORDER BY createdAt DESC';

      const reports = await db.all(query, params);
      res.json(reports);
    } catch (e) { res.status(500).json({ error: 'Failed to fetch reports' }); }
  });

  router.get('/archive', async (_req, res) => {
    try {
      const reports = await db.all('SELECT * FROM reports WHERE isDeleted IS NULL OR isDeleted = 0');
      res.json(reports);
    } catch (e) { res.status(500).json({ error: 'Failed to fetch reports archive' }); }
  });

  router.post('/', async (req, res) => {
    const { id, title, content, department, status, createdAt, submittedAt } = req.body;
    // Identity + timestamps come from the server, never from the client.
    const authorId = (req as any).user?.id;
    if (!authorId) return res.status(401).json({ error: 'Unauthorized' });
    if (!title) return res.status(400).json({ error: 'Thiếu tiêu đề báo cáo' });
    // Only privileged users may file into another department.
    const me = (req as any).user;
    const canFileAnywhere = me?.role === 'Admin' || me?.role === 'Director' || me?.role === 'Giám đốc' || me?.role === 'Manager';
    const effectiveDepartment = canFileAnywhere ? (department || me?.department) : me?.department;
    const now = new Date().toISOString();
    try {
      let finalContent = content;
      try {
        if (content) {
          const parsed = JSON.parse(content);
          const docs = await db.all(
            'SELECT name, url, size, type FROM documents WHERE linkedId = ? AND category = ? AND (isDeleted IS NULL OR isDeleted = 0)',
            [id, 'reports']
          );
          if (docs && docs.length > 0) {
            parsed.attachments = docs.map((d: any) => ({
              name: d.name,
              url: d.url,
              size: d.size,
              type: d.type
            }));
          } else {
            delete parsed.attachments;
          }
          finalContent = JSON.stringify(parsed);
        }
      } catch (err) {
        console.error('Lỗi đồng bộ đính kèm báo cáo:', err);
      }

      await db.run(
        'INSERT INTO reports (id, title, content, authorId, department, status, createdAt, submittedAt, approvedAt, approvedBy, directorFeedback, managerFeedback) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [id, title, finalContent ?? null, authorId, effectiveDepartment, status, now, submittedAt ?? null, null, null, null, null],
      );
      await db.run(
        'INSERT INTO activity_logs (id, userId, action, entityId, entityType, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
        [randomUUID(), authorId, 'report.created', id, 'report', new Date().toISOString()],
      );

      if (status === 'Pending Manager') {
        const dept = await db.get('SELECT managerId FROM departments WHERE name = ? OR id = ?', [effectiveDepartment, effectiveDepartment]);
        if (dept?.managerId) {
          await sendNotification(db, dept.managerId, 'report_submitted', 'Báo cáo mới', `Nhân viên vừa nộp báo cáo: ${title}`, id);
        }
      }

      res.status(201).json({ id });
    } catch (e) { res.status(500).json({ error: 'Failed to create report' }); }
  });

  router.put('/:id', async (req, res) => {
    const { title, content, status, submittedAt, directorFeedback, managerFeedback } = req.body;
    try {
      const existing = await db.get('SELECT * FROM reports WHERE id = ?', [req.params.id]);
      if (!existing) return res.status(404).json({ error: 'Report not found' });
      const me = (req as any).user;
      const isAdmin = me?.role === 'Admin';
      const isDirector = me?.role === 'Director' || isAdmin;
      const isOwner = existing.authorId === me?.id;
      // Only owner (draft edits) or privileged approvers may update.
      const wantsApprove = status === 'Approved' || directorFeedback || (existing.status !== status && (status === 'Approved' || status === 'Rejected'));
      if (wantsApprove && !(isAdmin || isDirector)) {
        // Managers may approve their own department's reports.
        const isManager = me?.role === 'Manager';
        if (!(isManager && existing.department && me?.department === existing.department)) {
          return res.status(403).json({ error: 'Bạn không có quyền duyệt báo cáo này' });
        }
      }
      if (!isOwner && !isAdmin && !isDirector && me?.role !== 'Manager') {
        return res.status(403).json({ error: 'Bạn không có quyền sửa báo cáo này' });
      }

      let finalContent = content;
      try {
        if (content) {
          const parsed = JSON.parse(content);
          const docs = await db.all(
            'SELECT name, url, size, type FROM documents WHERE linkedId = ? AND category = ? AND (isDeleted IS NULL OR isDeleted = 0)',
            [req.params.id, 'reports']
          );
          if (docs && docs.length > 0) {
            parsed.attachments = docs.map((d: any) => ({
              name: d.name,
              url: d.url,
              size: d.size,
              type: d.type
            }));
          } else {
            delete parsed.attachments;
          }
          finalContent = JSON.stringify(parsed);
        }
      } catch (err) {
        console.error('Lỗi đồng bộ đính kèm báo cáo:', err);
      }

      await db.run(
        'UPDATE reports SET title=?, content=?, status=?, submittedAt=?, approvedAt=?, approvedBy=?, directorFeedback=?, managerFeedback=? WHERE id=?',
        [title, finalContent ?? null, status, submittedAt ?? null, (status === 'Approved' || status === 'Rejected') ? new Date().toISOString() : existing.approvedAt ?? null, (status === 'Approved' || status === 'Rejected') ? ((req as any).user?.id ?? existing.approvedBy ?? null) : existing.approvedBy ?? null, directorFeedback ?? existing.directorFeedback ?? null, managerFeedback ?? existing.managerFeedback ?? null, req.params.id],
      );
      await db.run(
        'INSERT INTO activity_logs (id, userId, action, entityId, entityType, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
        [randomUUID(), (req as any).user?.id || 'system', `report.${status}`, req.params.id, 'report', new Date().toISOString()],
      );

      if (existing && existing.status !== status) {
        let msg = `Báo cáo của bạn đã chuyển sang trạng thái: ${status}`;
        if (status === 'Approved') msg = 'Báo cáo của bạn đã được duyệt.';
        if (status === 'Rejected') msg = 'Báo cáo của bạn đã bị từ chối.';
        await sendNotification(db, existing.authorId, 'report_updated', 'Cập nhật báo cáo', msg, req.params.id);
      }

      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Failed to update report' }); }
  });

  // Soft delete – only allow deleting Draft or Rejected reports, unless user is Admin or Giám đốc.
  // Ownership required: non-privileged users can only delete their own reports.
  router.delete('/:id', async (req, res) => {
    try {
      const report = await db.get('SELECT authorId, department, status FROM reports WHERE id = ?', [req.params.id]);
      if (!report) return res.status(404).json({ error: 'Report not found' });

      const me = (req as any).user;
      const isSuperUser = me?.role === 'Admin' || me?.role === 'Giám đốc' || me?.role === 'Director';

      if (!isSuperUser && report.authorId !== me?.id) {
        return res.status(403).json({ error: 'Bạn không có quyền xóa báo cáo này' });
      }

      if (!isSuperUser && (report.status === 'Approved' || report.status === 'Pending')) {
        return res.status(403).json({ error: 'Cannot delete an approved or pending report' });
      }

      if (!req.user || isSuperUser) {
        await db.run('DELETE FROM reports WHERE id = ?', [req.params.id]);
      } else {
        await db.run('UPDATE reports SET isDeleted = 1 WHERE id = ?', [req.params.id]);
      }
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Failed to delete report' }); }
  });

  return router;
}
