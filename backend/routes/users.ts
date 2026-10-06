import { assertUnique, DuplicateFieldError } from '../utils/uniqueness.js';
import { Router } from 'express';
import bcrypt from 'bcryptjs';

/** See utils/passwordPolicy.ts. 12 la muc toi thieu hien nay cua OWASP. */
const BCRYPT_COST = 12;
import crypto from 'crypto';

const generateRandomPassword = (length = 12) => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789@#$%';
  const buf = crypto.randomBytes(length);
  return Array.from(buf, (b) => chars[b % chars.length]).join('');
};

async function isAdminFresh(db: any, req: any): Promise<boolean> {
  // DB-fresh admin check: JWT role claims can be stale up to token expiry.
  if (!req.user?.id) return false;
  try {
    const row = await db.get('SELECT role FROM users WHERE id = ?', [req.user.id]);
    const role = row?.role || req.user?.role;
    if (role) req.user.role = role;
    return role === 'Admin';
  } catch {
    return req.user?.role === 'Admin';
  }
}

export function userRoutes(db: any, mailer: any) {
  const router = Router();
  const requireAdmin = async (req: any, res: any): Promise<boolean> => {
    if (await isAdminFresh(db, req)) return true;
    res.status(403).json({ error: 'Forbidden: admin access required' });
    return false;
  };

  router.get('/', async (req: any, res) => {
    try {
      const isAdmin = req.user?.role === 'Admin';
      const users = await db.all(`SELECT u.id, u.name, u.email, u.role, u.department, u.avatar, u.bio, u.phone, u.dob, u.hometown, u.cccd, u.gender, u.preferences, u.isLocked, r.permissions FROM users u LEFT JOIN roles r ON u.role = r.name`);
      res.json(users.map((u: any) => {
        const base = { ...u, isLocked: Boolean(u.isLocked), permissions: u.permissions ? JSON.parse(u.permissions) : [], preferences: u.preferences ? JSON.parse(u.preferences) : {} };
        if (isAdmin) return base;
        // Non-admin: redact sensitive PII. Only expose directory-level fields.
        const { phone, dob, hometown, cccd, gender, email, preferences, ...rest } = base;
        const isSelf = req.user?.id === u.id;
        return {
          ...rest,
          email: isSelf ? email : '',
          preferences: {},
        };
      }));
    } catch (e) { console.error('GET /api/users error:', e); res.status(500).json({ error: 'Failed' }); }
  });

  router.post('/', async (req, res) => {
    if (!(await requireAdmin(req, res))) return;
    const { id, name, email, password, role, department, avatar, bio, phone, dob, hometown, cccd, gender, preferences } = req.body;
    try {
      // Login tra user bang lower(email) = lower(?) va lay dong dau tien, nen hai
      // tai khoan chung email se khong xac dinh duoc dang nhap vao tai khoan nao.
      // Schema khong co UNIQUE va repo khong co migration runner, nen chan o server.
      await assertUnique(db, { table: 'users', column: 'email', value: email, label: 'Email' });
      const hashedPassword = password ? await bcrypt.hash(password, BCRYPT_COST) : null;
      await db.run('INSERT INTO users (id, name, email, password, role, department, avatar, bio, phone, dob, hometown, cccd, gender, preferences) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [id, name, email, hashedPassword, role, department, avatar, bio || '', phone || '', dob || '', hometown || '', cccd || '', gender || '', preferences ? JSON.stringify(preferences) : '{}']);
      res.json({ id });
    } catch (e) {
      if (e instanceof DuplicateFieldError) return res.status(409).json({ error: e.message, field: e.field });
      console.error('POST /api/users error:', e);
      res.status(500).json({ error: 'Failed' });
    }
  });

  router.put('/:id', async (req, res) => {
    const { name, email, password, role, department, avatar, bio, phone, dob, hometown, cccd, gender, preferences } = req.body;
    try {
      const isAdmin = await isAdminFresh(db, req);
      const isSelf = req.user?.id === req.params.id;
      if (!isAdmin && !isSelf) {
        return res.status(403).json({ error: 'Bạn chỉ có thể cập nhật hồ sơ của chính mình' });
      }

      if (!isAdmin) {
        await db.run(
          'UPDATE users SET name=?, avatar=?, bio=?, phone=?, dob=?, hometown=?, cccd=?, gender=?, preferences=? WHERE id=?',
          [name, avatar, bio || '', phone || '', dob || '', hometown || '', cccd || '', gender || '', preferences ? JSON.stringify(preferences) : '{}', req.params.id],
        );
        return res.json({ success: true });
      }

      // Chi kiem khi email thuc su doi, va loai tru chinh dong dang sua.
      const current = await db.get('SELECT email FROM users WHERE id = ?', [req.params.id]);
      const nextEmail = email === undefined ? current?.email : email;
      if (String(nextEmail ?? '').trim().toLowerCase() !== String(current?.email ?? '').trim().toLowerCase()) {
        await assertUnique(db, { table: 'users', column: 'email', value: nextEmail, excludeId: req.params.id, label: 'Email' });
      }

      if (password) {
        const hashed = await bcrypt.hash(password, BCRYPT_COST);
        await db.run('UPDATE users SET name=?, email=?, password=?, role=?, department=?, avatar=?, bio=?, phone=?, dob=?, hometown=?, cccd=?, gender=?, preferences=? WHERE id=?', [name, nextEmail, hashed, role, department, avatar, bio || '', phone || '', dob || '', hometown || '', cccd || '', gender || '', preferences ? JSON.stringify(preferences) : '{}', req.params.id]);
      } else {
        await db.run('UPDATE users SET name=?, email=?, role=?, department=?, avatar=?, bio=?, phone=?, dob=?, hometown=?, cccd=?, gender=?, preferences=? WHERE id=?', [name, nextEmail, role, department, avatar, bio || '', phone || '', dob || '', hometown || '', cccd || '', gender || '', preferences ? JSON.stringify(preferences) : '{}', req.params.id]);
      }
      res.json({ success: true });
    } catch (e) {
      if (e instanceof DuplicateFieldError) return res.status(409).json({ error: e.message, field: e.field });
      console.error('PUT /api/users/:id error:', e);
      res.status(500).json({ error: 'Failed' });
    }
  });

  router.delete('/:id', async (req, res) => {
    if (!(await requireAdmin(req, res))) return;
    try {
      await db.run('DELETE FROM users WHERE id=?', [req.params.id]);
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
  });

  router.post('/:id/reset-password', async (req, res) => {
    if (!(await requireAdmin(req, res))) return;
    const { newPassword } = req.body;
    try {
      const user = await db.get('SELECT id, email, name FROM users WHERE id = ?', [req.params.id]);
      if (!user) return res.status(404).json({ error: 'User not found' });
      const finalPassword = newPassword && String(newPassword).trim().length >= 8 ? String(newPassword).trim() : generateRandomPassword(12);
      const hashed = await bcrypt.hash(finalPassword, BCRYPT_COST);
      await db.run('UPDATE users SET password = ?, failedLogins = 0, lockedUntil = NULL, isLocked = 0 WHERE id = ?', [hashed, req.params.id]);
      try {
        await db.run('UPDATE refresh_tokens SET revokedAt = ? WHERE userId = ? AND revokedAt IS NULL', [new Date().toISOString(), req.params.id]);
      } catch { /* revocation must never break the request */ }
      await db.run("UPDATE password_reset_requests SET status = 'resolved' WHERE userId = ? AND status = 'pending'", [req.params.id]);
      const emailSent = await mailer.sendResetPasswordEmail(user.email, finalPassword);
      // Never return the password (generated or not): it would land in logs,
      // proxies and browser history. The user gets it via email only.
      return res.json({ success: true, emailSent });
    } catch (e) { console.error('reset-password error', e); res.status(500).json({ error: 'Failed' }); }
  });

  router.put('/:id/lock', async (req, res) => {
    if (!(await requireAdmin(req, res))) return;
    try {
      await db.run('UPDATE users SET isLocked = 1, lockedUntil = NULL, failedLogins = 0 WHERE id = ?', [req.params.id]);
      try {
        await db.run('UPDATE refresh_tokens SET revokedAt = ? WHERE userId = ? AND revokedAt IS NULL', [new Date().toISOString(), req.params.id]);
      } catch { /* ignore */ }
      try {
        await db.run(
          `INSERT INTO activity_logs (id, userId, action, entityId, entityType, metadata, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [crypto.randomUUID(), req.params.id, 'Khóa tài khoản', req.params.id, 'user', 'Admin chủ động khóa tài khoản', new Date().toISOString()]
        );
      } catch (e) {}
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
  });

  router.put('/:id/unlock', async (req, res) => {
    if (!(await requireAdmin(req, res))) return;
    try {
      await db.run('UPDATE users SET isLocked = 0, lockedUntil = NULL, failedLogins = 0 WHERE id = ?', [req.params.id]);
      try {
        await db.run(
          `INSERT INTO activity_logs (id, userId, action, entityId, entityType, metadata, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [crypto.randomUUID(), req.params.id, 'Mở khóa tài khoản', req.params.id, 'user', 'Admin mở khóa tài khoản', new Date().toISOString()]
        );
      } catch (e) {}
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
  });

  return router;
}
