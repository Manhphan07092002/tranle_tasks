import { Router } from 'express';
import { randomUUID } from 'crypto';
import { sendNotification } from '../utils/notify.js';
import { requireAuth } from '../middleware/auth.js';

export function reportRoutes(db: any) {
  const router = Router();

  router.use(requireAuth);

  router.get('/', async (_req, res) => {
    try {
      // Time-boxing: only load data from the last 6 months
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const thresholdDate = sixMonthsAgo.toISOString();
      
      const reports = await db.all(
        'SELECT * FROM reports WHERE (isDeleted IS NULL OR isDeleted = 0) AND createdAt >= ?',
        [thresholdDate]
      );
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
    const { id, title, content, authorId, department, status, createdAt, submittedAt, approvedAt, approvedBy, directorFeedback, managerFeedback } = req.body;
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
        [id, title, finalContent ?? null, authorId || req.user?.id, department, status, createdAt || new Date().toISOString(), submittedAt ?? null, approvedAt ?? null, approvedBy ?? null, directorFeedback ?? null, managerFeedback ?? null],
      );
      await db.run(
        'INSERT INTO activity_logs (id, userId, action, entityId, entityType, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
        [randomUUID(), authorId || req.user?.id, 'report.created', id, 'report', new Date().toISOString()],
      );

      if (status === 'Pending Manager') {
        const dept = await db.get('SELECT managerId FROM departments WHERE name = ? OR id = ?', [department, department]);
        if (dept?.managerId) {
          await sendNotification(db, dept.managerId, 'report_submitted', 'Báo cáo mới', `Nhân viên vừa nộp báo cáo: ${title}`, id);
        }
      }

      res.status(201).json({ id });
    } catch (e) { res.status(500).json({ error: 'Failed to create report' }); }
  });

  router.put('/:id', async (req, res) => {
    const { title, content, status, submittedAt, approvedAt, approvedBy, directorFeedback, managerFeedback } = req.body;
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    try {
      const existing = await db.get('SELECT * FROM reports WHERE id = ?', [req.params.id]);
      if (!existing) return res.status(404).json({ error: 'Không tìm thấy báo cáo' });

      // RBAC check for status transitions:
      if (status && status !== existing.status) {
        if (status === 'Approved' || status === 'Pending Director') {
          const isManagerOrAbove = 
            user.role === 'Admin' ||
            user.role === 'Director' ||
            user.role === 'Giám Đốc' ||
            user.role === 'Manager' ||
            user.role === 'Trưởng Phòng' ||
            user.role === 'Phó Phòng';

          if (!isManagerOrAbove) {
            return res.status(403).json({ error: 'Forbidden: Bạn không có quyền phê duyệt báo cáo này' });
          }
        }
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
        [title, finalContent ?? null, status, submittedAt ?? null, approvedAt ?? null, approvedBy ?? null, directorFeedback ?? null, managerFeedback ?? null, req.params.id],
      );
      await db.run(
        'INSERT INTO activity_logs (id, userId, action, entityId, entityType, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
        [randomUUID(), approvedBy || user.id, `report.${status}`, req.params.id, 'report', new Date().toISOString()],
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

  // Soft delete – only allow deleting Draft or Rejected reports, unless user is Admin or Giám đốc
  router.delete('/:id', async (req, res) => {
    try {
      const report = await db.get('SELECT status FROM reports WHERE id = ?', [req.params.id]);
      if (!report) return res.status(404).json({ error: 'Report not found' });
      
      const isSuperUser = req.user?.role === 'Admin' || req.user?.role === 'Director' || req.user?.role === 'Giám Đốc';
      
      if (!isSuperUser && (report.status === 'Approved' || report.status === 'Pending')) {
        return res.status(403).json({ error: 'Không thể xóa báo cáo đã duyệt hoặc đang chờ duyệt' });
      }
      
      if (isSuperUser) {
        await db.run('DELETE FROM reports WHERE id = ?', [req.params.id]);
      } else {
        await db.run('UPDATE reports SET isDeleted = 1 WHERE id = ?', [req.params.id]);
      }
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Failed to delete report' }); }
  });

  return router;
}
