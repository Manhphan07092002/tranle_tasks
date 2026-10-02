import { Router } from 'express';
import { requireRole } from '../middleware/auth.js';
import { ensureDefaultPolicies } from '../schedulers/slaEscalation.js';

/** Chính sách SLA theo (ticketType, priority) — đọc cho mọi user, sửa cho Quản lý+. */
export function slaRoutes(db: any) {
  const router = Router();

  router.get('/', async (_req, res) => {
    try {
      const rows = await ensureDefaultPolicies(db);
      res.json(rows || []);
    } catch (e) {
      res.status(500).json({ error: 'Failed to fetch SLA policies' });
    }
  });

  router.put('/:id', requireRole('Manager', 'Director'), async (req, res) => {
    try {
      const { responseHours, resolveHours } = req.body;
      const rh = Number(responseHours);
      const sh = Number(resolveHours);
      if (!Number.isFinite(rh) || rh <= 0 || !Number.isFinite(sh) || sh <= 0) {
        return res.status(400).json({ error: 'responseHours/resolveHours phải là số dương' });
      }
      await db.run(
        'UPDATE sla_policies SET responseHours = ?, resolveHours = ?, updatedAt = ? WHERE id = ?',
        [rh, sh, new Date().toISOString(), req.params.id],
      );
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: 'Failed to update SLA policy' });
    }
  });

  return router;
}
