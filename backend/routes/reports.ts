import { Router } from 'express';
import { randomUUID } from 'crypto';
import { sendNotification } from '../utils/notify.js';
import { APPROVED, inspectUpdate, isVerdictChange } from '../utils/workflowPolicy.js';

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

  // The archive must be scoped exactly like the list endpoint. Unscoped, any
  // authenticated employee enumerates every report in the company — other
  // departments' figures, content and director feedback included.
  router.get('/archive', async (req, res) => {
    try {
      const user = (req as any).user;
      const perms = user?.permissions || [];
      const canViewAll = perms.includes('view_all_reports') || perms.includes('director_feedback') || perms.includes('admin_panel') || perms.includes('view_all_tasks');

      let query = 'SELECT * FROM reports WHERE (isDeleted IS NULL OR isDeleted = 0)';
      const params: any[] = [];
      if (!canViewAll && user) {
        query += ' AND (authorId = ? OR department = ?)';
        params.push(user.id, user.department || '');
      }
      query += ' ORDER BY createdAt DESC LIMIT 500';

      const reports = await db.all(query, params);
      res.json(reports);
    } catch (e) { res.status(500).json({ error: 'Failed to fetch reports archive' }); }
  });

  // A new record may only be created in a "not yet approved" state. Otherwise
  // `POST /api/reports {status:'Approved'}` mints a report that looks
  // director-approved while approvedBy/approvedAt stay NULL — skipping the
  // whole Manager -> Director chain and its notifications.
  const CREATE_STATUS_ALLOWLIST = new Set(['Draft', 'Pending', 'Pending Manager', 'Pending Director']);

  router.post('/', async (req, res) => {
    const { id, title, content, department, status, createdAt, submittedAt } = req.body;
    // Identity + timestamps come from the server, never from the client.
    const authorId = (req as any).user?.id;
    if (!authorId) return res.status(401).json({ error: 'Unauthorized' });
    if (!title) return res.status(400).json({ error: 'Thiếu tiêu đề báo cáo' });
    const initialStatus = CREATE_STATUS_ALLOWLIST.has(status) ? status : 'Draft';
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
        [id, title, finalContent ?? null, authorId, effectiveDepartment, initialStatus, now, submittedAt ?? null, null, null, null, null],
      );
      await db.run(
        'INSERT INTO activity_logs (id, userId, action, entityId, entityType, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
        [randomUUID(), authorId, 'report.created', id, 'report', new Date().toISOString()],
      );

      if (initialStatus === 'Pending Manager') {
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
      const isManager = me?.role === 'Manager';
      // A Manager's reach stops at their own department. Without this check a
      // department head can rewrite any other department's title, content and
      // status.
      const isManagerOfDept = isManager && !!existing.department && !!me?.department && me.department === existing.department;
      // Only owner (draft edits) or privileged approvers may update.
      // `wantsApprove` must mean "issuing a review verdict", nothing else. The
      // save form always echoes directorFeedback/managerFeedback back (see
      // ReportModal.handleSave), so treating a carried-over feedback value as an
      // approval attempt locked authors out of re-submitting a rejected report.
      // Feedback writes are gated separately, by role, at the UPDATE below.
      const wantsApprove = status === 'Approved' || (existing.status !== status && (status === 'Approved' || status === 'Rejected'));
      // Nobody reviews their own record, whatever their role: otherwise a
      // Manager files a report and signs it off, and approvedBy records them as
      // the reviewer. The approval ledger becomes untrustworthy.
      if (wantsApprove && isOwner) {
        return res.status(403).json({ error: 'Bạn không có quyền duyệt báo cáo của chính mình' });
      }
      if (wantsApprove && !(isAdmin || isDirector) && !isManagerOfDept) {
        return res.status(403).json({ error: 'Bạn không có quyền duyệt báo cáo này' });
      }
      if (!isOwner && !isAdmin && !isDirector && !isManagerOfDept) {
        return res.status(403).json({ error: 'Bạn không có quyền sửa báo cáo này' });
      }

      // An omitted field means "unchanged", not "erase": title/content were being
      // written straight from the body, so any partial save blanked them.
      const nextTitle = title === undefined ? existing.title : title;
      const nextContentRaw = content === undefined ? existing.content : content;

      let finalContent = nextContentRaw;
      try {
        if (nextContentRaw) {
          const parsed = JSON.parse(nextContentRaw);
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

      // Approver feedback is a record of somebody else's verdict. An author
      // writing it back forges the review trail, so each column is writable only
      // by the role that actually performs that step.
      const nextDirectorFeedback = isDirector ? (directorFeedback ?? existing.directorFeedback ?? null) : (existing.directorFeedback ?? null);
      const nextManagerFeedback = isManagerOfDept || isDirector ? (managerFeedback ?? existing.managerFeedback ?? null) : (existing.managerFeedback ?? null);

      // "Approved" used to mean only that the payload said so, so any save that
      // repeated it re-stamped approvedAt/approvedBy — refreshing the verdict to
      // whoever pressed save. A verdict is a transition, not a payload value.
      const isDecision = isVerdictChange(existing.status, status);

      // What the row will actually look like after this update, used for the freeze
      // check below so it catches server-side attachment drift too.
      const candidate = { title: nextTitle, content: finalContent, status };
      const guard = inspectUpdate('report', existing, candidate);

      // Reopening a signed-off report is deliberate, not incidental: Admin/Director
      // only, and it must drop the approval fields so the record cannot keep
      // claiming a verdict that no longer covers its contents.
      if (guard.isReopen && !(isAdmin || isDirector)) {
        return res.status(403).json({ error: 'Chỉ Admin hoặc Giám đốc mới có thể mở lại báo cáo đã duyệt' });
      }
      if (guard.isApproved && !guard.isReopen && guard.changed.length > 0) {
        return res.status(409).json({
          error: `Báo cáo đã duyệt không thể sửa ${guard.changed.join(', ')}. Cần quản trị viên mở lại trước.`,
        });
      }

      const clearsApproval = guard.isReopen;

      await db.run(
        'UPDATE reports SET title=?, content=?, status=?, submittedAt=?, approvedAt=?, approvedBy=?, directorFeedback=?, managerFeedback=? WHERE id=?',
        [nextTitle, finalContent ?? null, status, submittedAt === undefined ? existing.submittedAt ?? null : submittedAt ?? null,
          isDecision ? new Date().toISOString() : clearsApproval ? null : existing.approvedAt ?? null,
          isDecision ? ((req as any).user?.id ?? existing.approvedBy ?? null) : clearsApproval ? null : existing.approvedBy ?? null,
          nextDirectorFeedback, nextManagerFeedback, req.params.id],
      );
      await db.run(
        'INSERT INTO activity_logs (id, userId, action, entityId, entityType, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
        [randomUUID(), (req as any).user?.id || 'system', `report.${status}`, req.params.id, 'report', new Date().toISOString()],
      );
      if (clearsApproval) {
        await db.run(
          'INSERT INTO activity_logs (id, userId, action, entityId, entityType, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
          [randomUUID(), (req as any).user?.id || 'system', 'report.reopened', req.params.id, 'report', new Date().toISOString()],
        );
      }

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
