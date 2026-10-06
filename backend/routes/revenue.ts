import { Router } from 'express';
import { randomUUID } from 'crypto';
import { sendNotification } from '../utils/notify.js';

export function revenueRoutes(db: any) {
  const router = Router();

  // GET all revenue reports (not deleted, last 6 months)
  router.get('/', async (req, res) => {
    try {
      const user = (req as any).user;
      const perms = user?.permissions || [];
      const canViewAll = perms.includes('view_all_reports') || perms.includes('director_feedback') || perms.includes('admin_panel') || perms.includes('view_all_tasks');
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      let query = 'SELECT * FROM revenue_reports WHERE (isDeleted IS NULL OR isDeleted = 0) AND createdAt >= ?';
      const params: any[] = [sixMonthsAgo.toISOString()];
      if (!canViewAll && user) {
        query += ' AND (authorId = ? OR department = ?)';
        params.push(user.id, user.department || '');
      }
      query += ' ORDER BY createdAt DESC';
      const rows = await db.all(query, params);
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
    const { id, title, reportType, periodStart, periodEnd, content, totalPreTax, totalDelivered, totalCumulative, department, status, submittedAt, generationMode } = req.body;
    const authorId = (req as any).user?.id;
    if (!authorId) return res.status(401).json({ error: 'Unauthorized' });
    if (!title) return res.status(400).json({ error: 'Thiếu tiêu đề' });
    const me = (req as any).user;
    const canFileAnywhere = me?.role === 'Admin' || me?.role === 'Director' || me?.role === 'Giám đốc' || me?.role === 'Manager';
    const effectiveDepartment = canFileAnywhere ? (department || me?.department) : me?.department;
    try {
      const now = new Date().toISOString();
      await db.run(
        `INSERT INTO revenue_reports (id, title, reportType, periodStart, periodEnd, content, totalPreTax, totalDelivered, totalCumulative, authorId, department, status, createdAt, submittedAt, generationMode)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, title, reportType, periodStart, periodEnd, content ?? null, totalPreTax ?? 0, totalDelivered ?? 0, totalCumulative ?? 0, authorId, effectiveDepartment, status || 'Draft', now, submittedAt ?? null, generationMode || 'manual']
      );

      // Log activity
      await db.run(
        'INSERT INTO activity_logs (id, userId, action, entityId, entityType, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
        [randomUUID(), authorId, 'revenue_report.created', id, 'revenue_report', now]
      );

      // Notify manager if submitting
      if (status === 'Pending Manager') {
        const dept = await db.get('SELECT managerId FROM departments WHERE name = ? OR id = ?', [effectiveDepartment, effectiveDepartment]);
        if (dept?.managerId) {
          await sendNotification(db, dept.managerId, 'revenue_submitted', 'Báo cáo doanh thu mới', `Nhân viên vừa nộp báo cáo doanh thu: ${title}`, id);
        }
      }

      res.status(201).json({ id });
    } catch (e: any) { res.status(500).json({ error: 'Failed to create revenue report', detail: e.message }); }
  });

  // UPDATE (also used for approve/reject)
  router.put('/:id', async (req, res) => {
    const { title, content, reportType, periodStart, periodEnd, totalPreTax, totalDelivered, totalCumulative, status, submittedAt, managerFeedback, directorFeedback, generationMode } = req.body;
    try {
      const existing = await db.get('SELECT * FROM revenue_reports WHERE id = ?', [req.params.id]);
      if (!existing) return res.status(404).json({ error: 'Not found' });
      const me = (req as any).user;
      const isAdmin = me?.role === 'Admin';
      const isDirector = me?.role === 'Director' || isAdmin;
      const isOwner = existing.authorId === me?.id;
      const statusChanging = status && status !== existing.status;
      const wantsApprove = statusChanging && (status === 'Approved' || status === 'Rejected' || String(status).startsWith('Pending'));
      if (wantsApprove && !(isAdmin || isDirector)) {
        const isManager = me?.role === 'Manager';
        if (!(isManager && me?.department === existing.department)) {
          return res.status(403).json({ error: 'Bạn không có quyền duyệt báo cáo doanh thu này' });
        }
      }
      if (!isOwner && !isAdmin && !isDirector && me?.role !== 'Manager') {
        return res.status(403).json({ error: 'Bạn không có quyền sửa báo cáo này' });
      }
      const approvedBy = (status === 'Approved' || status === 'Rejected') ? (me?.id ?? existing.approvedBy ?? null) : (existing.approvedBy ?? null);
      const approvedAt = (status === 'Approved' || status === 'Rejected') ? new Date().toISOString() : (existing.approvedAt ?? null);

      await db.run(
        `UPDATE revenue_reports SET title=?, content=?, reportType=?, periodStart=?, periodEnd=?, totalPreTax=?, totalDelivered=?, totalCumulative=?, status=?, submittedAt=?, approvedAt=?, approvedBy=?, managerFeedback=?, directorFeedback=?, generationMode=? WHERE id=?`,
        [title, content ?? null, reportType, periodStart, periodEnd, totalPreTax ?? 0, totalDelivered ?? 0, totalCumulative ?? 0, status, submittedAt ?? null, approvedAt, approvedBy, managerFeedback ?? existing.managerFeedback ?? null, directorFeedback ?? existing.directorFeedback ?? null, generationMode || 'manual', req.params.id]
      );

      // Log
      await db.run(
        'INSERT INTO activity_logs (id, userId, action, entityId, entityType, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
        [randomUUID(), me?.id || 'system', `revenue_report.${status}`, req.params.id, 'revenue_report', new Date().toISOString()]
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

  // SOFT DELETE (only Draft/Rejected, unless Admin/Giám đốc; owners only otherwise)
  router.delete('/:id', async (req, res) => {
    try {
      const report = await db.get('SELECT authorId, department, status FROM revenue_reports WHERE id = ?', [req.params.id]);
      if (!report) return res.status(404).json({ error: 'Not found' });

      const me = (req as any).user;
      const isSuperUser = me?.role === 'Admin' || me?.role === 'Giám đốc' || me?.role === 'Director';

      if (!isSuperUser && report.authorId !== me?.id) {
        return res.status(403).json({ error: 'Bạn không có quyền xóa báo cáo này' });
      }

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
