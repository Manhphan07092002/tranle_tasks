import { Router } from 'express';
import { randomUUID } from 'crypto';
import { sendNotification } from '../utils/notify.js';
import { isGlobalManager, canManageDepartment } from '../middleware/auth.js';

/** Các định danh phòng ban của user (ID + tên legacy) để so khớp liên phòng. */
function myDeptKeys(user: any): string[] {
  return [user?.departmentId, user?.department].filter((v) => typeof v === 'string' && v.length > 0);
}

/** Request có liên quan tới user: thuộc 2 phòng ban gửi/nhận, hoặc user là người tạo/được giao. */
function isInvolved(user: any, r: any): boolean {
  if (!user || !r) return false;
  if (isGlobalManager(user)) return true;
  const keys = myDeptKeys(user);
  if (keys.includes(r.sourceDepartmentId) || keys.includes(r.targetDepartmentId)) return true;
  return r.requesterId === user.id || r.assigneeId === user.id;
}

export function departmentRequestRoutes(db: any) {
  const router = Router();

  // GET /api/department-requests - List with filters
  router.get('/', async (req, res) => {
    try {
      const { sourceDepartmentId, targetDepartmentId, requesterId, assigneeId, status } = req.query;
      let query = `
        SELECT r.*,
               sd.name as sourceDepartmentName, sd.code as sourceDepartmentCode, sd.color as sourceDepartmentColor,
               td.name as targetDepartmentName, td.code as targetDepartmentCode, td.color as targetDepartmentColor,
               req.name as requesterName, req.avatar as requesterAvatar,
               ass.name as assigneeName, ass.avatar as assigneeAvatar
        FROM department_requests r
        LEFT JOIN departments sd ON r.sourceDepartmentId = sd.id
        LEFT JOIN departments td ON r.targetDepartmentId = td.id
        LEFT JOIN users req ON r.requesterId = req.id
        LEFT JOIN users ass ON r.assigneeId = ass.id
        WHERE 1=1
      `;
      const params: any[] = [];

      if (sourceDepartmentId) {
        query += ' AND r.sourceDepartmentId = ?';
        params.push(sourceDepartmentId);
      }
      if (targetDepartmentId) {
        query += ' AND r.targetDepartmentId = ?';
        params.push(targetDepartmentId);
      }
      if (requesterId) {
        query += ' AND r.requesterId = ?';
        params.push(requesterId);
      }
      if (assigneeId) {
        query += ' AND r.assigneeId = ?';
        params.push(assigneeId);
      }
      if (status) {
        query += ' AND r.status = ?';
        params.push(status);
      }

      // Employee chỉ thấy request liên quan tới mình/phòng mình; Lãnh đạo thấy tất cả.
      if (!isGlobalManager(req.user)) {
        const keys = myDeptKeys(req.user);
        if (keys.length > 0) {
          const placeholders = keys.map(() => '?').join(', ');
          query += ` AND (r.sourceDepartmentId IN (${placeholders}) OR r.targetDepartmentId IN (${placeholders}) OR r.requesterId = ? OR r.assigneeId = ?)`;
          params.push(...keys, ...keys, req.user!.id, req.user!.id);
        } else {
          query += ' AND (r.requesterId = ? OR r.assigneeId = ?)';
          params.push(req.user!.id, req.user!.id);
        }
      }

      query += ' ORDER BY r.createdAt DESC';
      const rows = await db.all(query, params);

      res.json(
        rows.map((r: any) => ({
          ...r,
          attachments: r.attachments ? JSON.parse(r.attachments) : [],
          outputData: r.outputData ? JSON.parse(r.outputData) : null,
        }))
      );
    } catch (e: any) {
      console.error('GET /api/department-requests error:', e);
      res.status(500).json({ error: 'Failed to fetch department requests', detail: e.message });
    }
  });

  // GET /api/department-requests/:id
  router.get('/:id', async (req, res) => {
    try {
      const r = await db.get(
        `SELECT r.*,
                sd.name as sourceDepartmentName, sd.code as sourceDepartmentCode,
                td.name as targetDepartmentName, td.code as targetDepartmentCode,
                req.name as requesterName, req.email as requesterEmail, req.avatar as requesterAvatar,
                ass.name as assigneeName, ass.email as assigneeEmail, ass.avatar as assigneeAvatar
         FROM department_requests r
         LEFT JOIN departments sd ON r.sourceDepartmentId = sd.id
         LEFT JOIN departments td ON r.targetDepartmentId = td.id
         LEFT JOIN users req ON r.requesterId = req.id
         LEFT JOIN users ass ON r.assigneeId = ass.id
         WHERE r.id = ?`,
        [req.params.id]
      );
      if (!r) return res.status(404).json({ error: 'Request not found' });
      if (!isInvolved(req.user, r)) {
        return res.status(403).json({ error: 'Forbidden: Yêu cầu này không thuộc phòng ban của bạn' });
      }
      res.json({
        ...r,
        attachments: r.attachments ? JSON.parse(r.attachments) : [],
        outputData: r.outputData ? JSON.parse(r.outputData) : null,
      });
    } catch (e: any) {
      res.status(500).json({ error: 'Failed to fetch request detail', detail: e.message });
    }
  });

  // POST /api/department-requests - Create request
  router.post('/', async (req, res) => {
    const {
      sourceDepartmentId, targetDepartmentId, assigneeId,
      title, description, priority, relatedEntityType, relatedEntityId, dueDate, attachments
    } = req.body;

    if (!title?.trim()) return res.status(400).json({ error: 'Tiêu đề yêu cầu không được để trống' });
    if (!sourceDepartmentId || !targetDepartmentId) return res.status(400).json({ error: 'Phải chỉ định phòng ban gửi và phòng ban nhận' });

    // Chống mạo danh: người tạo luôn là user đăng nhập; phòng gửi phải là phòng của mình (trừ Lãnh đạo).
    const requesterId = req.user!.id;
    if (!isGlobalManager(req.user) && !myDeptKeys(req.user).includes(sourceDepartmentId)) {
      return res.status(403).json({ error: 'Forbidden: Bạn chỉ được tạo yêu cầu từ phòng ban của mình' });
    }

    try {
      const id = `req-${randomUUID().slice(0, 8)}`;
      const reqNum = `REQ-${Date.now().toString().slice(-6)}`;
      const now = new Date().toISOString();

      await db.run(
        `INSERT INTO department_requests (
           id, requestNumber, sourceDepartmentId, targetDepartmentId, requesterId, assigneeId,
           title, description, priority, status, relatedEntityType, relatedEntityId, dueDate,
           attachments, createdAt
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          reqNum,
          sourceDepartmentId,
          targetDepartmentId,
          requesterId || 'system',
          assigneeId || null,
          title.trim(),
          description || '',
          priority || 'Medium',
          'pending',
          relatedEntityType || null,
          relatedEntityId || null,
          dueDate || null,
          attachments ? JSON.stringify(attachments) : '[]',
          now,
        ]
      );

      // Notify target department manager
      const targetDept = await db.get('SELECT managerId, name FROM departments WHERE id = ?', [targetDepartmentId]);
      if (targetDept?.managerId && targetDept.managerId !== requesterId) {
        await sendNotification(
          db,
          targetDept.managerId,
          'department_request',
          'Yêu cầu liên phòng ban mới',
          `Phòng ban của bạn nhận được yêu cầu mới: ${title}`,
          id
        );
      }

      res.status(201).json({ id, requestNumber: reqNum, success: true });
    } catch (e: any) {
      console.error('POST /api/department-requests error:', e);
      res.status(500).json({ error: 'Failed to create department request', detail: e.message });
    }
  });

  // PUT /api/department-requests/:id - Update status / outputData
  router.put('/:id', async (req, res) => {
    const { assigneeId, status, priority, description, outputData, dueDate } = req.body;
    try {
      const existing = await db.get('SELECT * FROM department_requests WHERE id = ?', [req.params.id]);
      if (!existing) return res.status(404).json({ error: 'Request not found' });

      // Người tạo, người được giao, hoặc Quản lý 1 trong 2 phòng mới được cập nhật.
      const allowed = isGlobalManager(req.user)
        || existing.requesterId === req.user!.id
        || existing.assigneeId === req.user!.id
        || canManageDepartment(req.user, existing.sourceDepartmentId)
        || canManageDepartment(req.user, existing.targetDepartmentId);
      if (!allowed) {
        return res.status(403).json({ error: 'Forbidden: Bạn không có quyền cập nhật yêu cầu này' });
      }

      const now = new Date().toISOString();
      await db.run(
        `UPDATE department_requests
         SET assigneeId = ?, status = ?, priority = ?, description = ?, outputData = ?, dueDate = ?, updatedAt = ?
         WHERE id = ?`,
        [
          assigneeId ?? existing.assigneeId,
          status ?? existing.status,
          priority ?? existing.priority,
          description ?? existing.description,
          outputData !== undefined ? JSON.stringify(outputData) : existing.outputData,
          dueDate ?? existing.dueDate,
          now,
          req.params.id,
        ]
      );

      // If completed or rejected, notify requester
      if (status && status !== existing.status && (status === 'completed' || status === 'rejected' || status === 'accepted')) {
        await sendNotification(
          db,
          existing.requesterId,
          'request_status_changed',
          `Yêu cầu ${existing.requestNumber} đã cập nhật`,
          `Trạng thái yêu cầu "${existing.title}" đã chuyển sang: ${status}`,
          existing.id
        );
      }

      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: 'Failed to update department request', detail: e.message });
    }
  });

  // POST /api/department-requests/:id/convert-to-task - Convert to Task
  router.post('/:id/convert-to-task', async (req, res) => {
    try {
      const reqItem = await db.get('SELECT * FROM department_requests WHERE id = ?', [req.params.id]);
      if (!reqItem) return res.status(404).json({ error: 'Request not found' });

      // Chỉ Quản lý phòng nhận (hoặc Lãnh đạo / người được giao) được chuyển thành task.
      const allowed = isGlobalManager(req.user)
        || reqItem.assigneeId === req.user!.id
        || canManageDepartment(req.user, reqItem.targetDepartmentId);
      if (!allowed) {
        return res.status(403).json({ error: 'Forbidden: Chỉ phòng ban nhận mới được chuyển yêu cầu thành công việc' });
      }

      const targetDept = await db.get('SELECT id, name FROM departments WHERE id = ?', [reqItem.targetDepartmentId]);
      const taskId = `t-${Date.now()}`;
      const now = new Date().toISOString();
      const todayStr = now.split('T')[0];

      await db.run(
        `INSERT INTO tasks (
           id, title, description, startDate, dueDate, priority, status,
           createdBy, department, departmentId, taskType
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          taskId,
          `[${reqItem.requestNumber}] ${reqItem.title}`,
          `Tiếp nhận từ yêu cầu liên phòng ban #${reqItem.requestNumber}:\n${reqItem.description || ''}`,
          todayStr,
          reqItem.dueDate || todayStr,
          reqItem.priority || 'Medium',
          'Todo',
          reqItem.requesterId,
          targetDept?.name || '',
          targetDept?.id || reqItem.targetDepartmentId,
          'request',
        ]
      );

      // Assign to assignee if specified
      if (reqItem.assigneeId) {
        await db.run('INSERT INTO task_assignees (taskId, userId) VALUES (?, ?)', [taskId, reqItem.assigneeId]);
      }

      // Update request status to in_progress and link task
      await db.run(
        'UPDATE department_requests SET status = ?, updatedAt = ? WHERE id = ?',
        ['in_progress', now, req.params.id]
      );

      res.json({ success: true, taskId });
    } catch (e: any) {
      console.error('convert-to-task error:', e);
      res.status(500).json({ error: 'Failed to convert request to task', detail: e.message });
    }
  });

  // DELETE /api/department-requests/:id
  router.delete('/:id', async (req, res) => {
    try {
      const existing = await db.get('SELECT * FROM department_requests WHERE id = ?', [req.params.id]);
      if (!existing) return res.status(404).json({ error: 'Request not found' });
      const allowed = isGlobalManager(req.user)
        || existing.requesterId === req.user!.id
        || canManageDepartment(req.user, existing.sourceDepartmentId)
        || canManageDepartment(req.user, existing.targetDepartmentId);
      if (!allowed) {
        return res.status(403).json({ error: 'Forbidden: Bạn không có quyền xóa yêu cầu này' });
      }
      await db.run('DELETE FROM department_requests WHERE id = ?', [req.params.id]);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: 'Failed to delete request', detail: e.message });
    }
  });

  return router;
}
