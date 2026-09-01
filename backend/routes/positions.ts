import { Router } from 'express';
import { randomUUID } from 'crypto';

export function positionRoutes(db: any) {
  const router = Router();

  // GET /api/positions - List all positions, optional filter by departmentId or teamId
  router.get('/', async (req, res) => {
    try {
      const { departmentId, teamId } = req.query;
      let query = `
        SELECT p.*, d.name as departmentName, t.name as teamName
        FROM positions p
        LEFT JOIN departments d ON p.departmentId = d.id
        LEFT JOIN teams t ON p.teamId = t.id
        WHERE (p.isActive IS NULL OR p.isActive = 1)
      `;
      const params: any[] = [];

      if (departmentId) {
        query += ' AND p.departmentId = ?';
        params.push(departmentId);
      }
      if (teamId) {
        query += ' AND p.teamId = ?';
        params.push(teamId);
      }

      query += ' ORDER BY p.level DESC, p.name ASC';
      const rows = await db.all(query, params);

      // Enhance with headcount count
      const result = await Promise.all(
        rows.map(async (pos: any) => {
          const userCountRow = await db.get('SELECT COUNT(*) as count FROM users WHERE positionId = ?', [pos.id]);
          return {
            ...pos,
            userCount: userCountRow?.count || 0,
          };
        })
      );

      res.json(result);
    } catch (e: any) {
      res.status(500).json({ error: 'Failed to fetch positions', detail: e.message });
    }
  });

  // GET /api/positions/:id
  router.get('/:id', async (req, res) => {
    try {
      const pos = await db.get(
        `SELECT p.*, d.name as departmentName, t.name as teamName
         FROM positions p
         LEFT JOIN departments d ON p.departmentId = d.id
         LEFT JOIN teams t ON p.teamId = t.id
         WHERE p.id = ?`,
        [req.params.id]
      );
      if (!pos) return res.status(404).json({ error: 'Position not found' });
      res.json(pos);
    } catch (e: any) {
      res.status(500).json({ error: 'Failed to fetch position', detail: e.message });
    }
  });

  // POST /api/positions
  router.post('/', async (req, res) => {
    const { id, departmentId, teamId, code, name, description, level, isManager } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Tên chức danh không được để trống' });

    try {
      const posId = id || `pos-${randomUUID().slice(0, 8)}`;
      const now = new Date().toISOString();
      await db.run(
        'INSERT INTO positions (id, departmentId, teamId, code, name, description, level, isManager, isActive, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)',
        [posId, departmentId || null, teamId || null, code?.trim() || null, name.trim(), description || '', Number(level || 1), isManager ? 1 : 0, now]
      );
      res.status(201).json({ id: posId, success: true });
    } catch (e: any) {
      res.status(500).json({ error: 'Failed to create position', detail: e.message });
    }
  });

  // PUT /api/positions/:id
  router.put('/:id', async (req, res) => {
    const { departmentId, teamId, code, name, description, level, isManager, isActive } = req.body;
    try {
      const existing = await db.get('SELECT * FROM positions WHERE id = ?', [req.params.id]);
      if (!existing) return res.status(404).json({ error: 'Position not found' });

      await db.run(
        'UPDATE positions SET departmentId = ?, teamId = ?, code = ?, name = ?, description = ?, level = ?, isManager = ?, isActive = ? WHERE id = ?',
        [
          departmentId ?? existing.departmentId,
          teamId ?? existing.teamId,
          code ?? existing.code,
          name?.trim() ?? existing.name,
          description ?? existing.description,
          level !== undefined ? Number(level) : existing.level,
          isManager !== undefined ? (isManager ? 1 : 0) : existing.isManager,
          isActive !== undefined ? (isActive ? 1 : 0) : existing.isActive,
          req.params.id,
        ]
      );
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: 'Failed to update position', detail: e.message });
    }
  });

  // DELETE /api/positions/:id
  router.delete('/:id', async (req, res) => {
    try {
      const userCountRow = await db.get('SELECT COUNT(*) as count FROM users WHERE positionId = ?', [req.params.id]);
      if (userCountRow?.count > 0) {
        await db.run('UPDATE positions SET isActive = 0 WHERE id = ?', [req.params.id]);
        return res.json({ success: true, message: 'Đã lưu trữ chức danh' });
      }

      await db.run('DELETE FROM positions WHERE id = ?', [req.params.id]);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: 'Failed to delete position', detail: e.message });
    }
  });

  return router;
}
