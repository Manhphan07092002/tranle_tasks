import { Router } from 'express';
import { randomUUID } from 'crypto';
import { sendNotification } from '../utils/notify.js';

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
      sourceDepartmentId, targetDepartmentId, requesterId, assigneeId,
      title, description, priority, relatedEntityType, relatedEntityId, dueDate, attachments
    } = req.body;

    if (!title?.trim()) return res.status(400).json({ error: 'Tiêu đề yêu cầu không được để trống' });
    if (!sourceDepartmentId || !targetDepartmentId) return res.status(400).json({ error: 'Phải chỉ định phòng ban gửi và phòng ban nhận' });

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
      await db.run('DELETE FROM department_requests WHERE id = ?', [req.params.id]);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: 'Failed to delete request', detail: e.message });
    }
  });

  return router;
}
