import { Router } from 'express';
import bcrypt from 'bcryptjs';

/** See utils/passwordPolicy.ts. 12 la muc toi thieu hien nay cua OWASP. */
const BCRYPT_COST = 12;
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import crypto from 'crypto';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';

const LoginSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu phải ít nhất 6 ký tự'),
});

const ChangePasswordSchema = z.object({
  userId: z.string(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8, 'Mật khẩu mới phải ít nhất 8 ký tự'),
});

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function hashResetToken(token: string): string {
  return hashToken(token);
}

function isStrongPassword(pw: string): boolean {
  if (pw.length < 8) return false;
  return true;
}

// ─── Refresh-token session management ────────────────────────────────────────
// Access tokens are short-lived (15m) and bearer-transported. Refresh tokens are
// opaque, single-use (rotation), sha256-hashed at rest, and transported ONLY via
// httpOnly cookie — never in JS-accessible storage, URLs, or logs.
const ACCESS_TOKEN_TTL = '15m';
const ACCESS_TOKEN_TTL_MS = 15 * 60 * 1000;
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const REFRESH_COOKIE = 'tranle_refresh';

function refreshCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: REFRESH_TOKEN_TTL_MS,
  };
}

function clearRefreshCookie(res: any) {
  // clearCookie must mirror the cookie flags or browsers keep the cookie.
  res.clearCookie(REFRESH_COOKIE, {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
  });
}

async function mintRefreshToken(db: any, userId: string): Promise<string> {
  const raw = 'rt_' + crypto.randomBytes(48).toString('hex');
  const now = new Date().toISOString();
  await db.run(
    'INSERT INTO refresh_tokens (id, userId, tokenHash, expiresAt, createdAt, revokedAt) VALUES (?, ?, ?, ?, ?, ?)',
    [crypto.randomUUID(), userId, hashToken(raw), new Date(Date.now() + REFRESH_TOKEN_TTL_MS).toISOString(), now, null]
  );
  return raw;
}

async function revokeUserRefreshTokens(db: any, userId: string) {
  try {
    await db.run('UPDATE refresh_tokens SET revokedAt = ? WHERE userId = ? AND revokedAt IS NULL', [new Date().toISOString(), userId]);
  } catch { /* revocation must never break the request */ }
}



export function authRoutes(db: any) {
  const router = Router();
  const getSecret = () => {
    const s = process.env.JWT_SECRET;
    if (!s) throw new Error('JWT_SECRET is not configured');
    return s;
  };

  const generateToken = (userPayload: any) => {
    // algorithm pinned so the verify side (requireAuth, socket) has exactly one
  // accepted value to check against.
  return jwt.sign(userPayload, getSecret(), { expiresIn: ACCESS_TOKEN_TTL, algorithm: 'HS256' });
  };

  router.post('/login', validate(LoginSchema), async (req, res) => {
    const { email, password } = req.body;
    try {
      const user = await db.get('SELECT * FROM users WHERE lower(email) = lower(?)', [email]);
      
      if (!user) {
        try {
          // Sanitize before logging: raw input must not reach logs/admin panels.
          const safeEmail = String(email || '').replace(/[\r\n]/g, '').slice(0, 255);
          await db.run(
            `INSERT INTO activity_logs (id, userId, action, entityId, entityType, metadata, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [crypto.randomUUID(), 'system', 'Đăng nhập thất bại', null, 'user', `Cố gắng đăng nhập với email không tồn tại: ${safeEmail}`, new Date().toISOString()]
          );
        } catch (e) {}
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      if (user.isLocked) {
        return res.status(403).json({ error: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Admin để được hỗ trợ.' });
      }

      if (user.lockedUntil && new Date(user.lockedUntil).getTime() > Date.now()) {
        const lockTime = new Date(user.lockedUntil).toLocaleTimeString('vi-VN');
        return res.status(403).json({ error: `Tài khoản đã bị khóa do đăng nhập sai quá nhiều lần. Vui lòng thử lại sau ${lockTime}.` });
      }

      if (!user.password || !password) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      
      if (!isMatch) {
        const newFailed = (user.failedLogins || 0) + 1;
        let lockUntil = null;
        let isLocked = 0;
        let lockMessage = '';
        let errorMessage = 'Invalid credentials';
        
        if (newFailed >= 15) {
          isLocked = 1;
          lockMessage = 'Khóa tài khoản do nhập sai mật khẩu 15 lần';
          errorMessage = 'Tài khoản đã bị khóa do nhập sai mật khẩu quá nhiều lần. Vui lòng liên hệ Admin để mở tài khoản.';
        } else if (newFailed >= 10) {
          lockUntil = new Date(Date.now() + 30 * 60 * 1000).toISOString();
          lockMessage = 'Khóa tài khoản 30 phút do nhập sai mật khẩu 10 lần';
          errorMessage = 'Tài khoản đã bị khóa 30 phút do nhập sai mật khẩu quá nhiều lần.';
        } else if (newFailed >= 7) {
          lockUntil = new Date(Date.now() + 10 * 60 * 1000).toISOString();
          lockMessage = 'Khóa tài khoản 10 phút do nhập sai mật khẩu 7 lần';
          errorMessage = 'Tài khoản đã bị khóa 10 phút do nhập sai mật khẩu quá nhiều lần.';
        } else if (newFailed >= 5) {
          lockUntil = new Date(Date.now() + 1 * 60 * 1000).toISOString();
          lockMessage = 'Khóa tài khoản 1 phút do nhập sai mật khẩu 5 lần';
          errorMessage = 'Tài khoản đã bị khóa 1 phút do nhập sai mật khẩu quá nhiều lần.';
        }

        if (lockUntil || isLocked) {
          await db.run('UPDATE users SET failedLogins = ?, lockedUntil = ?, isLocked = ? WHERE id = ?', [newFailed, lockUntil, isLocked, user.id]);
          try {
            await db.run(
              `INSERT INTO activity_logs (id, userId, action, entityId, entityType, metadata, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [crypto.randomUUID(), user.id, 'Khóa tài khoản', user.id, 'user', lockMessage, new Date().toISOString()]
            );
          } catch (e) {}
          return res.status(403).json({ error: errorMessage });
        } else {
          await db.run('UPDATE users SET failedLogins = ? WHERE id = ?', [newFailed, user.id]);
          try {
            await db.run(
              `INSERT INTO activity_logs (id, userId, action, entityId, entityType, metadata, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [crypto.randomUUID(), user.id, 'Đăng nhập thất bại', user.id, 'user', `Nhập sai mật khẩu lần ${newFailed}`, new Date().toISOString()]
            );
          } catch (e) {}
          return res.status(401).json({ error: 'Invalid credentials' });
        }
      }

      if ((user.failedLogins && user.failedLogins > 0) || user.lockedUntil || user.isLocked) {
        await db.run('UPDATE users SET failedLogins = 0, lockedUntil = NULL, isLocked = 0 WHERE id = ?', [user.id]);
      }

      const role = await db.get('SELECT permissions FROM roles WHERE name = ?', [user.role]);
      
      const userClientData = {
        id: user.id, name: user.name, email: user.email, role: user.role, 
        department: user.department, avatar: user.avatar, 
        permissions: role?.permissions ? JSON.parse(role.permissions) : []
      };
      const jwtPayload = { ...userClientData, jti: crypto.randomUUID() };
      const token = generateToken(jwtPayload);
      const refreshToken = await mintRefreshToken(db, user.id);
      res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions());

      try {
        await db.run(
          `INSERT INTO activity_logs (id, userId, action, entityId, entityType, metadata, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [crypto.randomUUID(), user.id, 'Đăng nhập', user.id, 'user', 'Người dùng đăng nhập thành công qua Email', new Date().toISOString()]
        );
      } catch (logErr) {
        console.error('Failed to log login activity', logErr);
      }

      return res.json({ token, user: userClientData, expiresIn: ACCESS_TOKEN_TTL_MS / 1000 });
    } catch (e) { console.error('LOGIN ROUTE EXCEPTION:', e); res.status(500).json({ error: 'Failed' }); }
  });

  // Silent session renewal: rotates the refresh token on every use.
  // Cookie-only: the refresh token is NEVER accepted from JS-readable input
  // (body/query), otherwise httpOnly buys nothing against XSS.
  // Reuse of an already-rotated token signals theft → all user sessions are revoked.
  router.post('/refresh', async (req, res) => {
    try {
      const raw = req.cookies?.[REFRESH_COOKIE];
      if (!raw || typeof raw !== 'string') return res.status(401).json({ error: 'Unauthorized' });
      const presented = hashToken(raw);
      const row = await db.get('SELECT id, userId, expiresAt, revokedAt FROM refresh_tokens WHERE tokenHash = ?', [presented]);
      if (!row) return res.status(401).json({ error: 'Unauthorized' });
      if (row.revokedAt) {
        // Token reuse after rotation — possible theft. Kill every session for this user.
        await revokeUserRefreshTokens(db, row.userId);
        clearRefreshCookie(res);
        return res.status(401).json({ error: 'Unauthorized' });
      }
      if (new Date(row.expiresAt).getTime() < Date.now()) {
        await db.run('UPDATE refresh_tokens SET revokedAt = ? WHERE id = ?', [new Date().toISOString(), row.id]);
        clearRefreshCookie(res);
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const user = await db.get('SELECT id, name, email, role, department, avatar FROM users WHERE id = ?', [row.userId]);
      if (!user) {
        await revokeUserRefreshTokens(db, row.userId);
        clearRefreshCookie(res);
        return res.status(401).json({ error: 'Unauthorized' });
      }
      if (user.isLocked) return res.status(403).json({ error: 'Tài khoản của bạn đã bị khóa.' });

      const role = await db.get('SELECT permissions FROM roles WHERE name = ?', [user.role]);
      const userClientData = {
        id: user.id, name: user.name, email: user.email, role: user.role,
        department: user.department, avatar: user.avatar,
        permissions: role?.permissions ? JSON.parse(role.permissions) : []
      };
      // Rotate: revoke the presented token, mint a fresh pair.
      await db.run('UPDATE refresh_tokens SET revokedAt = ? WHERE id = ?', [new Date().toISOString(), row.id]);
      const refreshToken = await mintRefreshToken(db, user.id);
      res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions());
      return res.json({ token: generateToken({ ...userClientData, jti: crypto.randomUUID() }), user: userClientData, expiresIn: ACCESS_TOKEN_TTL_MS / 1000 });
    } catch (e) {
      return res.status(500).json({ error: 'Failed' });
    }
  });

  router.post('/logout', async (req, res) => {
    try {
      const raw = req.cookies?.[REFRESH_COOKIE];
      if (typeof raw === 'string' && raw) {
        await db.run('UPDATE refresh_tokens SET revokedAt = ? WHERE tokenHash = ?', [new Date().toISOString(), hashToken(raw)]);
      }
    } catch { /* ignore */ }
    clearRefreshCookie(res);
    return res.json({ success: true });
  });

  router.post('/change-password', requireAuth, validate(ChangePasswordSchema), async (req, res) => {
    const { userId, currentPassword, newPassword } = req.body;
    if (req.user?.id !== userId) {
      return res.status(403).json({ error: 'Bạn chỉ có thể đổi mật khẩu của chính mình' });
    }
    if (!isStrongPassword(String(newPassword || ''))) {
      return res.status(400).json({ error: 'Mật khẩu mới phải có ít nhất 8 ký tự' });
    }
    try {
      const user = await db.get('SELECT id, password FROM users WHERE id = ?', [userId]);
      if (!user || !user.password) return res.status(404).json({ error: 'User not found' });
      const isMatch = await bcrypt.compare(currentPassword || '', user.password);
      if (!isMatch) return res.status(401).json({ error: 'Current password is incorrect' });
      const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_COST);
      await db.run('UPDATE users SET password = ?, failedLogins = 0, lockedUntil = NULL WHERE id = ?', [hashedPassword, userId]);
      // Password change invalidates every session — stolen tokens die here.
      await revokeUserRefreshTokens(db, userId);
      return res.json({ success: true });
    } catch (e) { console.error('CHANGE PASSWORD ROUTE EXCEPTION:', e); res.status(500).json({ error: 'Failed' }); }
  });


  return router;
}

export function forgotPasswordRoutes(db: any, mailer: any) {
  const router = Router();

  router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    try {
      const user = await db.get('SELECT id, email, isLocked FROM users WHERE lower(email) = lower(?)', [email]);
      // Always return the same response so this endpoint does not reveal which
      // email addresses exist or whether an account is locked.
      if (!user || user.isLocked) {
        return res.json({ success: true, message: 'Nếu email hợp lệ, hệ thống sẽ gửi hướng dẫn đặt lại mật khẩu.' });
      }

      const recentPending = await db.get("SELECT id, createdAt FROM password_reset_requests WHERE userId = ? AND status = 'pending' ORDER BY createdAt DESC LIMIT 1", [user.id]);
      if (recentPending) {
        const elapsed = Date.now() - new Date(recentPending.createdAt).getTime();
        if (elapsed < 10 * 60 * 1000) return res.status(429).json({ error: 'Bạn vừa yêu cầu gần đây. Vui lòng đợi vài phút rồi thử lại.' });
      }

      const token = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, '');
      const tokenHash = hashResetToken(token);
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      // Fail-closed: reset links must never point at a fallback/foreign domain.
      const appBaseUrl = process.env.APP_BASE_URL;
      if (!appBaseUrl) throw new Error('APP_BASE_URL is not configured');
      const resetLink = `${appBaseUrl.replace(/\/+$/, '')}/reset-password?token=${encodeURIComponent(token)}`;

      await db.run('DELETE FROM password_reset_tokens WHERE userId = ? AND usedAt IS NULL', [user.id]);
      await db.run('INSERT INTO password_reset_tokens (id, userId, email, token, expiresAt, usedAt) VALUES (?, ?, ?, ?, ?, ?)', [crypto.randomUUID(), user.id, user.email, tokenHash, expiresAt, null]);

      if (recentPending) {
        await db.run('UPDATE password_reset_requests SET email = ?, emailStatus = ?, emailSentAt = ?, createdAt = ? WHERE id = ?', [user.email, 'pending', null, new Date().toISOString(), recentPending.id]);
      } else {
        await db.run("INSERT INTO password_reset_requests (id, userId, email, status, emailStatus, emailSentAt, createdAt) VALUES (?, ?, ?, 'pending', 'pending', NULL, ?)", [crypto.randomUUID(), user.id, user.email, new Date().toISOString()]);
      }

      let emailSent = false;
      try {
        emailSent = await mailer.sendResetLinkEmail(user.email, resetLink);
      } catch (mailError: any) {
        console.error('forgot-password mail error', mailError);
      }

      await db.run("UPDATE password_reset_requests SET emailStatus = ?, emailSentAt = ? WHERE userId = ? AND status = 'pending'", [emailSent ? 'sent' : 'failed', emailSent ? new Date().toISOString() : null, user.id]);
      return res.json({ success: true, message: 'Nếu email hợp lệ, hệ thống sẽ gửi hướng dẫn đặt lại mật khẩu.' });
    } catch (e) { console.error('forgot-password error', e); res.status(500).json({ error: 'Failed' }); }
  });

  router.get('/reset-password/:token', async (req, res) => {
    try {
      const tokenHash = hashResetToken(String(req.params.token || ''));
      const rt = await db.get('SELECT userId, expiresAt, usedAt FROM password_reset_tokens WHERE token = ?', [tokenHash]);
      // Uniform response for missing/used/expired: distinct statuses would let
      // attackers probe token validity (oracle).
      if (!rt || rt.usedAt || new Date(rt.expiresAt).getTime() < Date.now()) {
        return res.status(400).json({ error: 'Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn' });
      }
      // Do not reveal the account email — prevents token oracle / account enumeration.
      return res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
  });

  router.post('/reset-password', async (req, res) => {
    const { token, newPassword } = req.body;
    try {
      if (!newPassword || String(newPassword).trim().length < 8) return res.status(400).json({ error: 'Mật khẩu mới phải có ít nhất 8 ký tự' });
      const tokenHash = hashResetToken(String(token || ''));
      const rt = await db.get('SELECT userId, email, expiresAt, usedAt FROM password_reset_tokens WHERE token = ?', [tokenHash]);
      if (!rt || rt.usedAt || new Date(rt.expiresAt).getTime() < Date.now()) {
        return res.status(400).json({ error: 'Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn' });
      }
      const hashedPassword = await bcrypt.hash(String(newPassword).trim(), 10);
      await db.run('UPDATE users SET password = ?, failedLogins = 0, lockedUntil = NULL WHERE id = ?', [hashedPassword, rt.userId]);
      const now = new Date().toISOString();
      await db.run('UPDATE password_reset_tokens SET usedAt = ? WHERE token = ?', [now, tokenHash]);
      // Reset invalidates every session, including any attacker-held ones.
      await revokeUserRefreshTokens(db, rt.userId);
      await db.run("UPDATE password_reset_requests SET status = 'resolved', emailStatus = 'reset_done', emailSentAt = COALESCE(emailSentAt, ?) WHERE userId = ? AND status = 'pending'", [now, rt.userId]);
      return res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
  });

  return router;
}
