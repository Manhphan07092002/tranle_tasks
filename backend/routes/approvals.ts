import { Router } from 'express';
import { randomUUID } from 'crypto';
import { sendNotification } from '../utils/notify.js';
import { requireAuth, JwtPayload } from '../middleware/auth.js';

export function approvalRoutes(db: any) {
  const router = Router();

  // All approval routes require authentication
  router.use(requireAuth);

  // Helper to verify if user has permission to approve/reject an approval item
  async function canUserApprove(user: JwtPayload, existing: any): Promise<boolean> {
    if (!user || !existing) return false;

    // 1. Admin or Director has global approval privileges
    const role = user.role?.toLowerCase() || '';
    if (role === 'admin' || role === 'director' || role === 'giám đốc') {
      return true;
    }

    // 2. Designated specific approver
    if (existing.approverId && user.id === existing.approverId) {
      return true;
    }

    // 3. Department Manager / Deputy Manager
    const isManager = role === 'manager' || role === 'trưởng phòng' || role === 'phó phòng';
    if (isManager && existing.departmentId && user.department) {
      if (user.department === existing.departmentId) {
        return true;
      }
      try {
        const dept = await db.get(
          'SELECT id, name, code FROM departments WHERE id = ? OR name = ? OR code = ?',
          [existing.departmentId, existing.departmentId, existing.departmentId]
        );
        if (dept && (dept.id === user.department || dept.name === user.department || dept.code === user.department)) {
          return true;
        }
      } catch (err) {
        console.error('Error checking department match:', err);
      }
    }

    return false;
  }

  // GET /api/approvals - List approvals
  router.get('/', async (req, res) => {
    try {
      const { approverId, requestedBy, departmentId, status, entityType } = req.query;
      let query = `
        SELECT a.*,
               req.name as requesterName, req.avatar as requesterAvatar, req.email as requesterEmail,
               appr.name as approverName, appr.avatar as approverAvatar,
               d.name as departmentName, d.code as departmentCode
        FROM approvals a
        LEFT JOIN users req ON a.requestedBy = req.id
        LEFT JOIN users appr ON a.approverId = appr.id
        LEFT JOIN departments d ON a.departmentId = d.id
        WHERE 1=1
      `;
      const params: any[] = [];

      if (approverId) {
        query += ' AND a.approverId = ?';
        params.push(approverId);
      }
      if (requestedBy) {
        query += ' AND a.requestedBy = ?';
        params.push(requestedBy);
      }
      if (departmentId) {
        query += ' AND a.departmentId = ?';
        params.push(departmentId);
      }
      if (status) {
        query += ' AND a.status = ?';
        params.push(status);
      }
      if (entityType) {
        query += ' AND a.entityType = ?';
        params.push(entityType);
      }

      query += ' ORDER BY a.requestedAt DESC';
      const rows = await db.all(query, params);
      res.json(rows);
    } catch (e: any) {
      console.error('GET /api/approvals error:', e);
      res.status(500).json({ error: 'Failed to fetch approvals', detail: e.message });
    }
  });

  // GET /api/approvals/:id
  router.get('/:id', async (req, res) => {
    try {
      const a = await db.get(
        `SELECT a.*,
                req.name as requesterName, req.avatar as requesterAvatar,
                appr.name as approverName, appr.avatar as approverAvatar,
                d.name as departmentName
         FROM approvals a
         LEFT JOIN users req ON a.requestedBy = req.id
         LEFT JOIN users appr ON a.approverId = appr.id
         LEFT JOIN departments d ON a.departmentId = d.id
         WHERE a.id = ?`,
        [req.params.id]
      );
      if (!a) return res.status(404).json({ error: 'Approval request not found' });
      res.json(a);
    } catch (e: any) {
      res.status(500).json({ error: 'Failed to fetch approval detail', detail: e.message });
    }
  });

  // POST /api/approvals - Submit new approval
  router.post('/', async (req, res) => {
    const { entityType, entityId, title, amount, requestedBy, departmentId, approverId, comment } = req.body;

    if (!entityType || !title?.trim()) {
      return res.status(400).json({ error: 'Loại thực thể và tiêu đề không được để trống' });
    }
    if (!approverId) {
      return res.status(400).json({ error: 'Phải chỉ định người phê duyệt' });
    }

    try {
      const id = `apr-${randomUUID().slice(0, 8)}`;
      const approvalCode = `APR-${Date.now().toString().slice(-6)}`;
      const now = new Date().toISOString();

      await db.run(
        `INSERT INTO approvals (
           id, approvalCode, entityType, entityId, title, amount,
           requestedBy, departmentId, approverId, status, comment, requestedAt
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          approvalCode,
          entityType,
          entityId || id,
          title.trim(),
          amount || 0,
          requestedBy || req.user?.id || 'system',
          departmentId || null,
          approverId,
          'pending',
          comment || '',
          now,
        ]
      );

      // Notify approver
      await sendNotification(
        db,
        approverId,
        'approval_needed',
        'Phiếu yêu cầu phê duyệt mới',
        `Bạn có phiếu yêu cầu phê duyệt mới: ${title}`,
        id
      );

      res.status(201).json({ id, approvalCode, success: true });
    } catch (e: any) {
      console.error('POST /api/approvals error:', e);
      res.status(500).json({ error: 'Failed to create approval request', detail: e.message });
    }
  });

  // PUT /api/approvals/:id - Update status / decide (Direct PUT)
  router.put('/:id', async (req, res) => {
    const { status, comment, respondedAt } = req.body;
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    try {
      const existing = await db.get('SELECT * FROM approvals WHERE id = ?', [req.params.id]);
      if (!existing) return res.status(404).json({ error: 'Không tìm thấy phiếu phê duyệt' });

      // Robust RBAC Check
      const isAllowed = await canUserApprove(user, existing);
      if (!isAllowed) {
        return res.status(403).json({ error: 'Forbidden: Bạn không có thẩm quyền phê duyệt tờ trình này' });
      }

      const now = respondedAt || new Date().toISOString();
      const updatedStatus = status || existing.status;
      const updatedComment = comment !== undefined ? comment : existing.comment;

      await db.run(
        'UPDATE approvals SET status = ?, comment = ?, respondedAt = ? WHERE id = ?',
        [updatedStatus, updatedComment, now, req.params.id]
      );

      // If entity is task, also update task approvalStatus
      if (existing.entityType === 'task' && existing.entityId) {
        await db.run(
          'UPDATE tasks SET approvalStatus = ?, approvedBy = ? WHERE id = ?',
          [updatedStatus, user.id, existing.entityId]
        );
      }

      // Notify requester
      if (updatedStatus === 'approved' || updatedStatus === 'rejected') {
        await sendNotification(
          db,
          existing.requestedBy,
          'approval_result',
          `Phiếu duyệt ${existing.approvalCode}: ${updatedStatus === 'approved' ? 'Đã được Phê Duyệt ✅' : 'Bị Từ Chối ❌'}`,
          `Phiếu "${existing.title}" đã được xử lý bởi ${user.name}.`,
          existing.id
        );
      }

      res.json({ success: true, status: updatedStatus });
    } catch (e: any) {
      console.error('PUT /api/approvals/:id error:', e);
      res.status(500).json({ error: 'Failed to update approval', detail: e.message });
    }
  });

  // PUT /api/approvals/:id/decide - Approve / Reject decision
  router.put('/:id/decide', async (req, res) => {
    const { decision, comment } = req.body; // decision: 'approved' | 'rejected'
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    if (!decision || (decision !== 'approved' && decision !== 'rejected')) {
      return res.status(400).json({ error: 'Quyết định phải là approved hoặc rejected' });
    }

    try {
      const existing = await db.get('SELECT * FROM approvals WHERE id = ?', [req.params.id]);
      if (!existing) return res.status(404).json({ error: 'Không tìm thấy phiếu phê duyệt' });

      // Robust RBAC Check
      const isAllowed = await canUserApprove(user, existing);
      if (!isAllowed) {
        return res.status(403).json({ error: 'Forbidden: Bạn không có thẩm quyền phê duyệt tờ trình này' });
      }

      const now = new Date().toISOString();
      const updatedComment = comment
        ? `${existing.comment ? existing.comment + '\n' : ''}[${decision === 'approved' ? 'Phê duyệt' : 'Từ chối'}]: ${comment}`
        : existing.comment;

      await db.run(
        'UPDATE approvals SET status = ?, comment = ?, respondedAt = ? WHERE id = ?',
        [decision, updatedComment, now, req.params.id]
      );

      // If entity is task, also update task approvalStatus
      if (existing.entityType === 'task' && existing.entityId) {
        await db.run(
          'UPDATE tasks SET approvalStatus = ?, approvedBy = ? WHERE id = ?',
          [decision, user.id, existing.entityId]
        );
      }

      // Notify requester
      await sendNotification(
        db,
        existing.requestedBy,
        'approval_result',
        `Phiếu duyệt ${existing.approvalCode}: ${decision === 'approved' ? 'Đã được Phê Duyệt ✅' : 'Bị Từ Chối ❌'}`,
        `Phiếu "${existing.title}" đã được xử lý bởi ${user.name}. Ý kiến: ${comment || 'Không có ghi chú'}`,
        existing.id
      );

      res.json({ success: true, status: decision });
    } catch (e: any) {
      res.status(500).json({ error: 'Failed to process approval decision', detail: e.message });
    }
  });

  return router;
}
