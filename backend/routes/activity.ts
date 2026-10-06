import { Router } from 'express';

export function activityRoutes(db: any) {
  const router = Router();

  /**
   * The activity log is a company-wide audit trail: every user's actions on every
   * entity. AdminApp gates the screen on admin_panel (AdminApp.tsx:220), but a
   * client-side check is not a control — any employee could call the endpoint
   * directly and enumerate the whole log.
   */
  const requireAuditAccess = (req: any, res: any, next: any) => {
    const user = req.user;
    const perms = user?.permissions || [];
    if (user?.role === 'Admin' || perms.includes('admin_panel')) return next();
    return res.status(403).json({ error: 'Bạn không có quyền xem nhật ký hoạt động' });
  };

  /**
   * `limit` used to be passed straight into SQL, so `?limit=100000000` dumped the
   * entire table. Clamp it, and support `?page=` so the admin screen can page
   * through history instead of asking for an unbounded slice.
   */
  const MAX_LIMIT = 200;
  const MAX_PAGE = 100;
  const resolvePaging = (query: any) => {
    const requested = Number(query.limit);
    const limit = Number.isFinite(requested) && requested > 0
      ? Math.min(Math.trunc(requested), MAX_LIMIT)
      : 50;
    const page = Number(query.page);
    const pageNo = Number.isFinite(page) && page > 0 ? Math.min(Math.trunc(page), MAX_PAGE) : 1;
    return { limit, offset: (pageNo - 1) * limit };
  };

  router.use(requireAuditAccess);

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

  router.get('/', async (req, res) => {
    try {
      const { limit, offset } = resolvePaging(req.query);
      const logs = await db.all(
        'SELECT * FROM activity_logs ORDER BY createdAt DESC LIMIT ? OFFSET ?',
        [limit, offset],
      );
      res.json(await enrichLogs(logs));
    } catch (e) { res.status(500).json({ error: 'Failed to fetch activity logs' }); }
  });

  router.get('/user/:userId', async (req, res) => {
    try {
      const { limit, offset } = resolvePaging(req.query);
      const logs = await db.all(
        'SELECT * FROM activity_logs WHERE userId = ? ORDER BY createdAt DESC LIMIT ? OFFSET ?',
        [req.params.userId, limit, offset],
      );
      res.json(await enrichLogs(logs));
    } catch (e) { res.status(500).json({ error: 'Failed to fetch user activity logs' }); }
  });

  return router;
}
