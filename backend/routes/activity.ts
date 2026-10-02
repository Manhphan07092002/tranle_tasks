import { Router } from 'express';
import { requireRole, isDepartmentManager, canViewDepartment } from '../middleware/auth.js';

export function activityRoutes(db: any) {
  const router = Router();

  async function enrichLogs(logs: any[]) {
    const userIds = [...new Set(logs.map((l: any) => l.userId).filter((id: string) => id && id !== 'system'))];
    const userMap = new Map<string, any>();
    if (userIds.length > 0) {
      const placeholders = userIds.map((_, i) => `?`).join(', ');
      const users = await db.all(`SELECT id, name, avatar, email, department FROM users WHERE id IN (${placeholders})`, userIds);
      users.forEach((u: any) => userMap.set(u.id, u));
    }
    return logs.map((l: any) => ({
      ...l,
      user: l.userId === 'system'
        ? { name: 'Hệ thống', avatar: '', department: 'System' }
        : userMap.get(l.userId) || null,
    }));
  }

  // Nhật ký toàn công ty — chỉ Quản lý trở lên (Admin bypass trong requireRole).
  router.get('/', requireRole('Manager', 'Director'), async (req, res) => {
    try {
      const limit = Number(req.query.limit) || 50;
      const logs = await db.all(
        'SELECT * FROM activity_logs ORDER BY createdAt DESC LIMIT ?',
        [limit],
      );
      res.json(await enrichLogs(logs));
    } catch (e) { res.status(500).json({ error: 'Failed to fetch activity logs' }); }
  });

  // Nhật ký của 1 user — bản thân hoặc Quản lý trở lên.
  router.get('/user/:userId', async (req, res) => {
    if (req.user?.id !== req.params.userId && !isDepartmentManager(req.user)) {
      return res.status(403).json({ error: 'Forbidden: Bạn chỉ được xem nhật ký của chính mình' });
    }
    try {
      const limit = Number(req.query.limit) || 50;
      const logs = await db.all(
        'SELECT * FROM activity_logs WHERE userId = ? ORDER BY createdAt DESC LIMIT ?',
        [req.params.userId, limit],
      );
      res.json(await enrichLogs(logs));
    } catch (e) { res.status(500).json({ error: 'Failed to fetch user activity logs' }); }
  });

  return router;
}

/**
 * Nhật ký phạm vi phòng ban cho tab Audit Trail (DepartmentAuditTab gọi
 * `/api/activity-logs?departmentId=` — endpoint này trước đây chưa tồn tại).
 * Thành viên phòng (kể cả Employee) được đọc; phòng khác 403.
 */
export function departmentActivityRoutes(db: any) {
  const router = Router();

  router.get('/', async (req, res) => {
    try {
      const departmentId = Array.isArray(req.query.departmentId)
        ? req.query.departmentId[0]
        : req.query.departmentId;
      if (!departmentId || typeof departmentId !== 'string') {
        return res.status(400).json({ error: 'Thiếu departmentId' });
      }
      if (!canViewDepartment(req.user, departmentId)) {
        return res.status(403).json({ error: 'Forbidden: Bạn chỉ được xem nhật ký của phòng ban mình' });
      }
      const limit = Number(req.query.limit) || 200;
      const dept = await db.get('SELECT id, name FROM departments WHERE id = ?', [departmentId]);
      const members: any[] = dept
        ? await db.all('SELECT id FROM users WHERE departmentId = ? OR department = ?', [departmentId, dept.name])
        : await db.all('SELECT id FROM users WHERE departmentId = ?', [departmentId]);
      const ids = members.map((m: any) => m.id).filter(Boolean);
      if (ids.length === 0) return res.json([]);
      const placeholders = ids.map(() => '?').join(', ');
      const logs = await db.all(
        `SELECT * FROM activity_logs WHERE userId IN (${placeholders}) ORDER BY createdAt DESC LIMIT ?`,
        [...ids, limit],
      );
      res.json(logs);
    } catch (e) { res.status(500).json({ error: 'Failed to fetch department activity logs' }); }
  });

  return router;
}
