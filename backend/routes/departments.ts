import { Router } from 'express';
import { requireAdmin } from '../middleware/auth.js';

export function departmentRoutes(db: any) {
  const router = Router();

  // GET /api/departments - List all active departments with counts & managers
  router.get('/', async (_req, res) => {
    try {
      const depts = await db.all(
        'SELECT * FROM departments WHERE (isActive IS NULL OR isActive = 1) ORDER BY sortOrder ASC, name ASC'
      );
      const result = await Promise.all(
        depts.map(async (d: any) => {
          const { count: userCount } = await db.get(
            'SELECT COUNT(*) as count FROM users WHERE departmentId = ? OR department = ?',
            [d.id, d.name]
          );
          const { count: taskCount } = await db.get(
            'SELECT COUNT(*) as count FROM tasks WHERE departmentId = ? OR department = ?',
            [d.id, d.name]
          );
          const { count: teamCount } = await db.get(
            'SELECT COUNT(*) as count FROM teams WHERE departmentId = ? AND (isActive IS NULL OR isActive = 1)',
            [d.id]
          );
          const { count: projectCount } = await db.get(
            'SELECT COUNT(*) as count FROM projects WHERE (primaryDepartmentId = ? OR department = ?) AND (isDeleted IS NULL OR isDeleted = 0)',
            [d.id, d.name]
          );
          const manager = d.managerId
            ? await db.get('SELECT id, name, email, avatar FROM users WHERE id = ?', [d.managerId])
            : null;
          return {
            ...d,
            userCount: userCount || 0,
            taskCount: taskCount || 0,
            teamCount: teamCount || 0,
            projectCount: projectCount || 0,
            manager,
          };
        })
      );
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ error: 'Failed to fetch departments', detail: e.message });
    }
  });

  // GET /api/departments/:id - Get single department details
  router.get('/:id', async (req, res) => {
    try {
      const dept = await db.get('SELECT * FROM departments WHERE id = ? OR code = ?', [req.params.id, req.params.id]);
      if (!dept) return res.status(404).json({ error: 'Department not found' });

      const manager = dept.managerId
        ? await db.get('SELECT id, name, email, avatar, phone FROM users WHERE id = ?', [dept.managerId])
        : null;
      const teams = await db.all(
        'SELECT * FROM teams WHERE departmentId = ? AND (isActive IS NULL OR isActive = 1) ORDER BY name ASC',
        [dept.id]
      );
      const members = await db.all(
        `SELECT u.id, u.name, u.email, u.role, u.avatar, u.phone, u.teamId, u.positionId,
                t.name as teamName, p.name as positionName
         FROM users u
         LEFT JOIN teams t ON u.teamId = t.id
         LEFT JOIN positions p ON u.positionId = p.id
         WHERE (u.departmentId = ? OR u.department = ?) AND (u.isLocked IS NULL OR u.isLocked = 0)`,
        [dept.id, dept.name]
      );
      const openTasks = await db.all(
        `SELECT id, title, priority, status, dueDate, createdBy, startDate
         FROM tasks
         WHERE (departmentId = ? OR department = ?) AND status != 'Done'
         ORDER BY createdAt DESC LIMIT 10`,
        [dept.id, dept.name]
      );
      const projects = await db.all(
        `SELECT id, projectCode, name, clientName, status, budget, startDate, endDate
         FROM projects
         WHERE (primaryDepartmentId = ? OR department = ?) AND (isDeleted IS NULL OR isDeleted = 0)
         ORDER BY createdAt DESC`,
        [dept.id, dept.name]
      );

      res.json({
        ...dept,
        manager,
        teams,
        members,
        openTasks,
        projects,
      });
    } catch (e: any) {
      res.status(500).json({ error: 'Failed to fetch department details', detail: e.message });
    }
  });

  // GET /api/departments/:id/members
  router.get('/:id/members', async (req, res) => {
    try {
      const dept = await db.get('SELECT id, name FROM departments WHERE id = ?', [req.params.id]);
      const deptId = dept ? dept.id : req.params.id;
      const deptName = dept ? dept.name : '';

      const members = await db.all(
        `SELECT u.id, u.name, u.email, u.role, u.avatar, u.phone, u.departmentId, u.teamId, u.positionId,
                t.name as teamName, p.name as positionName
         FROM users u
         LEFT JOIN teams t ON u.teamId = t.id
         LEFT JOIN positions p ON u.positionId = p.id
         WHERE (u.departmentId = ? OR u.department = ?)`,
        [deptId, deptName]
      );
      res.json(members);
    } catch (e: any) {
      res.status(500).json({ error: 'Failed to fetch department members', detail: e.message });
    }
  });

  // POST /api/departments
  router.post('/', requireAdmin, async (req, res) => {
    const { id, code, name, description, color, icon, managerId, sortOrder } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Tên phòng ban không được trống' });
    try {
      const newId = id || `dept-${Date.now()}`;
      const now = new Date().toISOString();
      await db.run(
        'INSERT INTO departments (id, code, name, description, color, icon, managerId, sortOrder, isActive, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)',
        [newId, code?.trim() || null, name.trim(), description || '', color || '#16a34a', icon || 'Building', managerId || null, Number(sortOrder || 0), now]
      );
      res.status(201).json({ id: newId, success: true });
    } catch (e: any) {
      if (e.message?.includes('UNIQUE')) return res.status(409).json({ error: 'Mã hoặc Tên phòng ban đã tồn tại' });
      res.status(500).json({ error: 'Failed to create department', detail: e.message });
    }
  });

  // PUT /api/departments/:id
  router.put('/:id', requireAdmin, async (req, res) => {
    const { code, name, description, color, icon, managerId, sortOrder, isActive } = req.body;
    try {
      const existing = await db.get('SELECT * FROM departments WHERE id = ?', [req.params.id]);
      if (!existing) return res.status(404).json({ error: 'Not found' });
      const oldName = existing.name;
      const newName = name?.trim() ?? oldName;
      const now = new Date().toISOString();

      await db.run(
        'UPDATE departments SET code = ?, name = ?, description = ?, color = ?, icon = ?, managerId = ?, sortOrder = ?, isActive = ?, updatedAt = ? WHERE id = ?',
        [
          code?.trim() ?? existing.code,
          newName,
          description ?? existing.description,
          color ?? existing.color,
          icon ?? existing.icon,
          managerId ?? existing.managerId,
          sortOrder !== undefined ? Number(sortOrder) : existing.sortOrder,
          isActive !== undefined ? (isActive ? 1 : 0) : existing.isActive,
          now,
          req.params.id,
        ]
      );

      // Keep legacy string in sync for transition period
      if (newName !== oldName) {
        await db.run('UPDATE users SET department = ? WHERE department = ? OR departmentId = ?', [newName, oldName, req.params.id]);
        await db.run('UPDATE tasks SET department = ? WHERE department = ? OR departmentId = ?', [newName, oldName, req.params.id]);
      }
      res.json({ success: true });
    } catch (e: any) {
      if (e.message?.includes('UNIQUE')) return res.status(409).json({ error: 'Mã hoặc Tên phòng ban đã tồn tại' });
      res.status(500).json({ error: 'Failed to update department', detail: e.message });
    }
  });

  // DELETE /api/departments/:id
  router.delete('/:id', requireAdmin, async (req, res) => {
    try {
      const dept = await db.get('SELECT * FROM departments WHERE id = ?', [req.params.id]);
      if (!dept) return res.status(404).json({ error: 'Not found' });
      const { count } = await db.get('SELECT COUNT(*) as count FROM users WHERE departmentId = ? OR department = ?', [dept.id, dept.name]);
      if (count > 0) {
        // Soft archive instead of breaking relations
        await db.run('UPDATE departments SET isActive = 0, updatedAt = ? WHERE id = ?', [new Date().toISOString(), req.params.id]);
        return res.json({ success: true, message: `Đã chuyển sang trạng thái lưu trữ do đang có ${count} nhân sự` });
      }
      await db.run('DELETE FROM departments WHERE id = ?', [req.params.id]);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: 'Failed to delete department', detail: e.message });
    }
  });

  return router;
}
