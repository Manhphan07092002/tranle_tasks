import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const generateRandomPassword = (length = 8) => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789@#$%';
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

export function userRoutes(db: any, mailer: any) {
  const router = Router();

  router.get('/', async (_req, res) => {
    try {
      const users = await db.all(`
        SELECT u.id, u.name, u.email, u.role, u.department, u.departmentId, u.teamId, u.positionId, u.managerId,
               u.avatar, u.bio, u.phone, u.dob, u.hometown, u.cccd, u.gender, u.preferences, u.isLocked,
               r.permissions,
               d.name as departmentName, d.code as departmentCode,
               t.name as teamName, t.code as teamCode,
               p.name as positionName, p.code as positionCode,
               m.name as managerName
        FROM users u
        LEFT JOIN roles r ON u.role = r.name
        LEFT JOIN departments d ON (u.departmentId = d.id OR u.department = d.name)
        LEFT JOIN teams t ON u.teamId = t.id
        LEFT JOIN positions p ON u.positionId = p.id
        LEFT JOIN users m ON u.managerId = m.id
        ORDER BY u.name ASC
      `);
      res.json(
        users.map((u: any) => ({
          ...u,
          isLocked: Boolean(u.isLocked),
          permissions: u.permissions ? (typeof u.permissions === 'string' ? JSON.parse(u.permissions) : u.permissions) : [],
          preferences: u.preferences ? (typeof u.preferences === 'string' ? JSON.parse(u.preferences) : u.preferences) : {},
        }))
      );
    } catch (e) {
      console.error('GET /api/users error:', e);
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  });

  router.post('/', async (req, res) => {
    const { id, name, email, password, role, department, departmentId, teamId, positionId, managerId, avatar, bio, phone, dob, hometown, cccd, gender, preferences } = req.body;
    try {
      const userId = id || `u-${Date.now()}`;
      const hashedPassword = password ? await bcrypt.hash(password, 10) : null;
      
      // Auto-resolve departmentId if missing
      let resolvedDeptId = departmentId;
      if (!resolvedDeptId && department) {
        const d = await db.get('SELECT id FROM departments WHERE name = ?', [department]);
        if (d) resolvedDeptId = d.id;
      }

      await db.run(
        `INSERT INTO users (id, name, email, password, role, department, departmentId, teamId, positionId, managerId, avatar, bio, phone, dob, hometown, cccd, gender, preferences)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          name,
          email,
          hashedPassword,
          role,
          department || '',
          resolvedDeptId || null,
          teamId || null,
          positionId || null,
          managerId || null,
          avatar || '',
          bio || '',
          phone || '',
          dob || '',
          hometown || '',
          cccd || '',
          gender || '',
          preferences ? JSON.stringify(preferences) : '{}',
        ]
      );
      res.json({ id: userId });
    } catch (e) {
      console.error('POST /api/users error:', e);
      res.status(500).json({ error: 'Failed to create user' });
    }
  });

  router.put('/:id', async (req, res) => {
    const { name, email, password, role, department, departmentId, teamId, positionId, managerId, avatar, bio, phone, dob, hometown, cccd, gender, preferences } = req.body;
    try {
      // Auto-resolve departmentId if missing
      let resolvedDeptId = departmentId;
      if (!resolvedDeptId && department) {
        const d = await db.get('SELECT id FROM departments WHERE name = ?', [department]);
        if (d) resolvedDeptId = d.id;
      }

      if (password) {
        const hashed = await bcrypt.hash(password, 10);
        await db.run(
          `UPDATE users
           SET name=?, email=?, password=?, role=?, department=?, departmentId=?, teamId=?, positionId=?, managerId=?, avatar=?, bio=?, phone=?, dob=?, hometown=?, cccd=?, gender=?, preferences=?
           WHERE id=?`,
          [
            name,
            email,
            hashed,
            role,
            department || '',
            resolvedDeptId || null,
            teamId || null,
            positionId || null,
            managerId || null,
            avatar || '',
            bio || '',
            phone || '',
            dob || '',
            hometown || '',
            cccd || '',
            gender || '',
            preferences ? JSON.stringify(preferences) : '{}',
            req.params.id,
          ]
        );
      } else {
        await db.run(
          `UPDATE users
           SET name=?, email=?, role=?, department=?, departmentId=?, teamId=?, positionId=?, managerId=?, avatar=?, bio=?, phone=?, dob=?, hometown=?, cccd=?, gender=?, preferences=?
           WHERE id=?`,
          [
            name,
            email,
            role,
            department || '',
            resolvedDeptId || null,
            teamId || null,
            positionId || null,
            managerId || null,
            avatar || '',
            bio || '',
            phone || '',
            dob || '',
            hometown || '',
            cccd || '',
            gender || '',
            preferences ? JSON.stringify(preferences) : '{}',
            req.params.id,
          ]
        );
      }
      res.json({ success: true });
    } catch (e) {
      console.error('PUT /api/users error:', e);
      res.status(500).json({ error: 'Failed to update user' });
    }
  });

  router.delete('/:id', async (req, res) => {
    try {
      await db.run('DELETE FROM users WHERE id=?', [req.params.id]);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: 'Failed to delete user' });
    }
  });

  router.post('/:id/reset-password', async (req, res) => {
    const { newPassword } = req.body;
    try {
      const user = await db.get('SELECT id, email, name FROM users WHERE id = ?', [req.params.id]);
      if (!user) return res.status(404).json({ error: 'User not found' });
      const finalPassword = newPassword && String(newPassword).trim().length >= 6 ? String(newPassword).trim() : generateRandomPassword(8);
      const hashed = await bcrypt.hash(finalPassword, 10);
      await db.run('UPDATE users SET password = ?, failedLogins = 0, lockedUntil = NULL, isLocked = 0 WHERE id = ?', [hashed, req.params.id]);
      await db.run("UPDATE password_reset_requests SET status = 'resolved' WHERE userId = ? AND status = 'pending'", [req.params.id]);
      const emailSent = await mailer.sendResetPasswordEmail(user.email, finalPassword);
      return res.json({ success: true, emailSent, generatedPassword: finalPassword });
    } catch (e) {
      console.error('reset-password error', e);
      res.status(500).json({ error: 'Failed' });
    }
  });

  router.put('/:id/lock', async (req, res) => {
    try {
      await db.run('UPDATE users SET isLocked = 1, lockedUntil = NULL, failedLogins = 0 WHERE id = ?', [req.params.id]);
      try {
        await db.run(
          `INSERT INTO activity_logs (id, userId, action, entityId, entityType, metadata, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [crypto.randomUUID(), req.params.id, 'Khóa tài khoản', req.params.id, 'user', 'Admin chủ động khóa tài khoản', new Date().toISOString()]
        );
      } catch (e) {}
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: 'Failed to lock user' });
    }
  });

  router.put('/:id/unlock', async (req, res) => {
    try {
      await db.run('UPDATE users SET isLocked = 0, lockedUntil = NULL, failedLogins = 0 WHERE id = ?', [req.params.id]);
      try {
        await db.run(
          `INSERT INTO activity_logs (id, userId, action, entityId, entityType, metadata, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [crypto.randomUUID(), req.params.id, 'Mở khóa tài khoản', req.params.id, 'user', 'Admin mở khóa tài khoản', new Date().toISOString()]
        );
      } catch (e) {}
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: 'Failed to unlock user' });
    }
  });

  return router;
}
