import { Router } from 'express';
import { randomUUID } from 'crypto';
import { sendNotification } from '../utils/notify.js';

export function revenueRoutes(db: any) {
  const router = Router();

  // GET all revenue reports (not deleted, last 6 months)
  router.get('/', async (_req, res) => {
    try {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const rows = await db.all(
        'SELECT * FROM revenue_reports WHERE (isDeleted IS NULL OR isDeleted = 0) AND createdAt >= ? ORDER BY createdAt DESC',
        [sixMonthsAgo.toISOString()]
      );
      res.json(rows);
    } catch (e) { res.status(500).json({ error: 'Failed to fetch revenue reports' }); }
  });

  // GET archive
  router.get('/archive', async (_req, res) => {
    try {
      const rows = await db.all('SELECT * FROM revenue_reports WHERE isDeleted IS NULL OR isDeleted = 0 ORDER BY createdAt DESC');
      res.json(rows);
    } catch (e) { res.status(500).json({ error: 'Failed to fetch revenue reports archive' }); }
  });

  // CREATE
  router.post('/', async (req, res) => {
    const { id, title, reportType, periodStart, periodEnd, content, totalPreTax, totalDelivered, totalCumulative, authorId, department, status, submittedAt, generationMode } = req.body;
    try {
      const now = new Date().toISOString();
      await db.run(
        `INSERT INTO revenue_reports (id, title, reportType, periodStart, periodEnd, content, totalPreTax, totalDelivered, totalCumulative, authorId, department, status, createdAt, submittedAt, generationMode)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, title, reportType, periodStart, periodEnd, content ?? null, totalPreTax ?? 0, totalDelivered ?? 0, totalCumulative ?? 0, authorId, department, status || 'Draft', now, submittedAt ?? null, generationMode || 'manual']
      );

      // Log activity
      await db.run(
        'INSERT INTO activity_logs (id, userId, action, entityId, entityType, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
        [randomUUID(), authorId, 'revenue_report.created', id, 'revenue_report', now]
      );

      // Notify manager if submitting
      if (status === 'Pending Manager') {
        const dept = await db.get('SELECT managerId FROM departments WHERE name = ? OR id = ?', [department, department]);
        if (dept?.managerId) {
          await sendNotification(db, dept.managerId, 'revenue_submitted', 'Báo cáo doanh thu mới', `Nhân viên vừa nộp báo cáo doanh thu: ${title}`, id);
        }
      }

      res.status(201).json({ id });
    } catch (e: any) { res.status(500).json({ error: 'Failed to create revenue report', detail: e.message }); }
  });

  // UPDATE (also used for approve/reject)
  router.put('/:id', async (req, res) => {
    const { title, content, reportType, periodStart, periodEnd, totalPreTax, totalDelivered, totalCumulative, status, submittedAt, approvedAt, approvedBy, managerFeedback, directorFeedback, generationMode } = req.body;
    try {
      const existing = await db.get('SELECT * FROM revenue_reports WHERE id = ?', [req.params.id]);

      await db.run(
        `UPDATE revenue_reports SET title=?, content=?, reportType=?, periodStart=?, periodEnd=?, totalPreTax=?, totalDelivered=?, totalCumulative=?, status=?, submittedAt=?, approvedAt=?, approvedBy=?, managerFeedback=?, directorFeedback=?, generationMode=? WHERE id=?`,
        [title, content ?? null, reportType, periodStart, periodEnd, totalPreTax ?? 0, totalDelivered ?? 0, totalCumulative ?? 0, status, submittedAt ?? null, approvedAt ?? null, approvedBy ?? null, managerFeedback ?? null, directorFeedback ?? null, generationMode || 'manual', req.params.id]
      );

      // Log
      await db.run(
        'INSERT INTO activity_logs (id, userId, action, entityId, entityType, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
        [randomUUID(), approvedBy || 'system', `revenue_report.${status}`, req.params.id, 'revenue_report', new Date().toISOString()]
      );

      // Notify on status change
      if (existing && existing.status !== status) {
        // 1. Notify the author
        let msg = `Báo cáo doanh thu đã chuyển sang: ${status}`;
        if (status === 'Approved') msg = `Báo cáo doanh thu "${title}" đã được Giám đốc phê duyệt hoàn tất.`;
        if (status === 'Rejected') msg = `Báo cáo doanh thu "${title}" đã bị từ chối.`;
        await sendNotification(db, existing.authorId, 'revenue_updated', 'Cập nhật báo cáo doanh thu', msg, req.params.id);

        // 2. TP DUYỆT XONG -> TỰ ĐỘNG GỬI GIÁM ĐỐC XEM
        if (status === 'Pending Director') {
          // Notify Director(s)
          const directors = await db.all("SELECT id FROM users WHERE role = 'Director' OR role = 'Admin'");
          for (const dir of directors) {
            await sendNotification(
              db,
              dir.id,
              'revenue_pending_director',
              'Báo cáo doanh thu chờ duyệt',
              `Trưởng phòng đã duyệt báo cáo doanh thu "${title}". Yêu cầu Giám đốc xem và phê duyệt.`,
              req.params.id
            );
          }
        }

        // 3. GIÁM ĐỐC DUYỆT XONG -> ĐẨY THÔNG BÁO LẠI CHO TP VÀ PHÒNG
        if (status === 'Approved') {
          const deptName = existing.department;
          
          // Find TP of department
          const deptInfo = await db.get("SELECT managerId FROM departments WHERE name = ? OR id = ?", [deptName, deptName]);
          
          // Find all users in the department
          const deptUsers = await db.all("SELECT id FROM users WHERE department = ?", [deptName]);
          
          const notifiedUserIds = new Set<string>();

          // Send to TP
          if (deptInfo?.managerId) {
            await sendNotification(
              db,
              deptInfo.managerId,
              'revenue_approved_tp',
              'Báo cáo doanh thu đã hoàn thành',
              `Giám đốc đã phê duyệt hoàn tất báo cáo doanh thu "${title}" của phòng ban.`,
              req.params.id
            );
            notifiedUserIds.add(deptInfo.managerId);
          }

          // Send to department staff (phòng)
          for (const u of deptUsers) {
            if (notifiedUserIds.has(u.id)) continue; // avoid duplicates
            await sendNotification(
              db,
              u.id,
              'revenue_approved_dept',
              'Báo cáo doanh thu đã hoàn thành',
              `Báo cáo doanh thu "${title}" của phòng ban đã được phê duyệt hoàn tất.`,
              req.params.id
            );
          }
        }
      }

      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Failed to update revenue report' }); }
  });

  // SOFT DELETE (only Draft/Rejected, unless Admin/Giám đốc)
  router.delete('/:id', async (req, res) => {
    try {
      const report = await db.get('SELECT status FROM revenue_reports WHERE id = ?', [req.params.id]);
      if (!report) return res.status(404).json({ error: 'Not found' });
      
      const isSuperUser = req.user?.role === 'Admin' || req.user?.role === 'Giám đốc';
      
      if (!isSuperUser && (report.status === 'Approved' || report.status.startsWith('Pending'))) {
        return res.status(403).json({ error: 'Cannot delete approved or pending report' });
      }
      
      if (isSuperUser) {
        await db.run('DELETE FROM revenue_reports WHERE id = ?', [req.params.id]);
      } else {
        await db.run('UPDATE revenue_reports SET isDeleted = 1 WHERE id = ?', [req.params.id]);
      }
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Failed to delete revenue report' }); }
  });

  return router;
}
