import { Router } from 'express';
import { randomUUID } from 'crypto';
import { requireAdmin } from '../middleware/auth.js';

export function teamRoutes(db: any) {
  const router = Router();

  // GET /api/teams - List all teams, optional filter by departmentId
  router.get('/', async (req, res) => {
    try {
      const { departmentId } = req.query;
      let query = 'SELECT t.*, d.name as departmentName, d.code as departmentCode FROM teams t LEFT JOIN departments d ON t.departmentId = d.id WHERE (t.isActive IS NULL OR t.isActive = 1)';
      const params: any[] = [];

      if (departmentId) {
        query += ' AND t.departmentId = ?';
        params.push(departmentId);
      }

      query += ' ORDER BY t.name ASC';
      const rows = await db.all(query, params);

      // Enhance with member count & manager details
      const result = await Promise.all(
        rows.map(async (team: any) => {
          const userCountRow = await db.get('SELECT COUNT(*) as count FROM users WHERE teamId = ?', [team.id]);
          const taskCountRow = await db.get('SELECT COUNT(*) as count FROM tasks WHERE teamId = ?', [team.id]);
          const manager = team.managerId
            ? await db.get('SELECT id, name, email, avatar FROM users WHERE id = ?', [team.managerId])
            : null;
          return {
            ...team,
            userCount: userCountRow?.count || 0,
            taskCount: taskCountRow?.count || 0,
            manager,
          };
        })
      );

      res.json(result);
    } catch (e: any) {
      res.status(500).json({ error: 'Failed to fetch teams', detail: e.message });
    }
  });

  // GET /api/teams/:id - Get single team
  router.get('/:id', async (req, res) => {
    try {
      const team = await db.get(
        'SELECT t.*, d.name as departmentName FROM teams t LEFT JOIN departments d ON t.departmentId = d.id WHERE t.id = ?',
        [req.params.id]
      );
      if (!team) return res.status(404).json({ error: 'Team not found' });

      const members = await db.all(
        'SELECT id, name, email, role, avatar, positionId FROM users WHERE teamId = ?',
        [req.params.id]
      );
      const manager = team.managerId
        ? await db.get('SELECT id, name, email, avatar FROM users WHERE id = ?', [team.managerId])
        : null;

      res.json({ ...team, members, manager });
    } catch (e: any) {
      res.status(500).json({ error: 'Failed to fetch team', detail: e.message });
    }
  });

  // POST /api/teams - Create team
  router.post('/', requireAdmin, async (req, res) => {
    const { id, departmentId, code, name, description, managerId, color } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Tên nhóm không được để trống' });
    if (!departmentId) return res.status(400).json({ error: 'Phải chọn phòng ban trực thuộc' });

    try {
      const teamId = id || `team-${randomUUID().slice(0, 8)}`;
      const now = new Date().toISOString();
      await db.run(
        'INSERT INTO teams (id, departmentId, code, name, description, managerId, color, isActive, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)',
        [teamId, departmentId, code?.trim() || null, name.trim(), description || '', managerId || null, color || '#16a34a', now]
      );
      res.status(201).json({ id: teamId, success: true });
    } catch (e: any) {
      res.status(500).json({ error: 'Failed to create team', detail: e.message });
    }
  });

  // PUT /api/teams/:id - Update team
  router.put('/:id', requireAdmin, async (req, res) => {
    const { departmentId, code, name, description, managerId, color, isActive } = req.body;
    try {
      const existing = await db.get('SELECT * FROM teams WHERE id = ?', [req.params.id]);
      if (!existing) return res.status(404).json({ error: 'Team not found' });

      const now = new Date().toISOString();
      await db.run(
        'UPDATE teams SET departmentId = ?, code = ?, name = ?, description = ?, managerId = ?, color = ?, isActive = ?, updatedAt = ? WHERE id = ?',
        [
          departmentId ?? existing.departmentId,
          code ?? existing.code,
          name?.trim() ?? existing.name,
          description ?? existing.description,
          managerId ?? existing.managerId,
          color ?? existing.color,
          isActive !== undefined ? (isActive ? 1 : 0) : existing.isActive,
          now,
          req.params.id,
        ]
      );
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: 'Failed to update team', detail: e.message });
    }
  });

  // DELETE /api/teams/:id - Archive or delete team
  router.delete('/:id', requireAdmin, async (req, res) => {
    try {
      const userCountRow = await db.get('SELECT COUNT(*) as count FROM users WHERE teamId = ?', [req.params.id]);
      if (userCountRow?.count > 0) {
        // Soft delete / archive
        await db.run('UPDATE teams SET isActive = 0, updatedAt = ? WHERE id = ?', [new Date().toISOString(), req.params.id]);
        return res.json({ success: true, message: 'Đã lưu trữ nhóm do vẫn còn nhân sự trực thuộc' });
      }

      await db.run('DELETE FROM teams WHERE id = ?', [req.params.id]);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: 'Failed to delete team', detail: e.message });
    }
  });

  return router;
}
