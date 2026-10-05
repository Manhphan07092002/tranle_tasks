import crypto from 'crypto';
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { authRoutes, forgotPasswordRoutes } from '../routes/auth.js';
import { cookiesMiddleware, requireAuth } from '../middleware/auth.js';

const secret = crypto.randomBytes(32).toString('hex');
process.env.JWT_SECRET = secret;

const PASSWORD = 'correct-password';
let passwordHash = '';

interface UserRow {
  id: string; email: string; password: string; role: string;
  failedLogins: number; lockedUntil: string | null; isLocked: number;
}

function makeUser(overrides: Partial<UserRow> = {}): UserRow {
  return {
    id: 'user-1', email: 'user@example.test', password: passwordHash, role: 'Employee',
    failedLogins: 0, lockedUntil: null, isLocked: 0, ...overrides,
  };
}

function makeDb(user: UserRow | null) {
  const runs: Array<{ sql: string; params: unknown[] }> = [];
  const resetTokens: Array<{ token: string; usedAt: string | null; expiresAt: string }> = [];
  return {
    runs,
    resetTokens,
    get: async (sql: string, params: unknown[] = []) => {
      if (sql.includes('FROM users') && sql.includes('lower(email)')) return user ? { ...user } : undefined;
      if (sql.includes('FROM users') && sql.includes('WHERE id = ?')) return user ? { ...user } : undefined;
      if (sql.includes('FROM roles')) return { permissions: '[]' };
      if (sql.includes('FROM password_reset_requests')) return undefined;
      if (sql.includes('FROM password_reset_tokens')) {
        return resetTokens.find((r) => r.token === params[0]);
      }
      return undefined;
    },
    run: async (sql: string, params: unknown[] = []) => {
      runs.push({ sql, params });
      if (sql.startsWith('INSERT INTO password_reset_tokens')) {
        resetTokens.push({ token: String(params[3]), usedAt: null, expiresAt: String(params[4]) });
      }
      if (sql.startsWith('UPDATE users SET failedLogins') && user) {
        user.failedLogins = Number(params[0]);
      }
      if (sql.startsWith('UPDATE users SET password') && user) {
        user.password = String(params[0]);
      }
      if (sql.startsWith('UPDATE password_reset_tokens SET usedAt')) {
        const row = resetTokens.find((r) => r.token === params[1]);
        if (row) row.usedAt = String(params[0]);
      }
      return { changes: 1 };
    },
  };
}

function authApp(db: ReturnType<typeof makeDb>) {
  const app = express();
  app.use(express.json());
  app.use(cookiesMiddleware);
  app.use('/api/auth', authRoutes(db));
  return app;
}

function forgotApp(db: ReturnType<typeof makeDb>) {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', forgotPasswordRoutes(db, { sendResetLinkEmail: async () => true }));
  return app;
}

describe('auth login', () => {
  it('login thành công trả token 15 phút + cookie refresh + user', async () => {
    passwordHash = await bcrypt.hash(PASSWORD, 4);
    const db = makeDb(makeUser());
    const res = await request(authApp(db)).post('/api/auth/login').send({ email: 'user@example.test', password: PASSWORD });
    expect(res.status).toBe(200);
    const payload = jwt.verify(res.body.token, secret) as { exp: number; iat: number };
    expect(payload.exp - payload.iat).toBe(900);
    expect(res.body.user.email).toBe('user@example.test');
    const cookies = (res.headers['set-cookie'] as unknown as string[]).join(';');
    expect(cookies).toContain('tranle_refresh=');
    expect(cookies).toContain('HttpOnly');
  });

  it('sai email hoặc mật khẩu đều 401 chung chung', async () => {
    passwordHash = await bcrypt.hash(PASSWORD, 4);
    const noUser = await request(authApp(makeDb(null))).post('/api/auth/login').send({ email: 'nouser@example.test', password: 'whatever1' });
    expect(noUser.status).toBe(401);
    const wrongPw = await request(authApp(makeDb(makeUser()))).post('/api/auth/login').send({ email: 'user@example.test', password: 'wrongpass' });
    expect(wrongPw.status).toBe(401);
    expect(wrongPw.body).toEqual({ error: 'Invalid credentials' });
  });

  it('tài khoản bị khóa cứng hoặc tạm khóa đều 403', async () => {
    passwordHash = await bcrypt.hash(PASSWORD, 4);
    const hard = await request(authApp(makeDb(makeUser({ isLocked: 1 })))).post('/api/auth/login').send({ email: 'user@example.test', password: PASSWORD });
    expect(hard.status).toBe(403);
    const temp = await request(authApp(makeDb(makeUser({ lockedUntil: new Date(Date.now() + 60000).toISOString() })))).post('/api/auth/login').send({ email: 'user@example.test', password: PASSWORD });
    expect(temp.status).toBe(403);
  });

  it('sai 5 lần thì khóa 1 phút, sai 15 lần thì khóa cứng', async () => {
    passwordHash = await bcrypt.hash(PASSWORD, 4);
    const user5 = makeUser({ failedLogins: 4 });
    const r5 = await request(authApp(makeDb(user5))).post('/api/auth/login').send({ email: 'user@example.test', password: 'wrongpass' });
    expect(r5.status).toBe(403);
    expect(r5.body.error).toContain('1 phút');
    const user15 = makeUser({ failedLogins: 14 });
    const r15 = await request(authApp(makeDb(user15))).post('/api/auth/login').send({ email: 'user@example.test', password: 'wrongpass' });
    expect(r15.status).toBe(403);
    expect(r15.body.error).toContain('liên hệ Admin');
  });

  it('đổi mật khẩu: khác user thì 403, sai hiện tại thì 401, đúng thì 200 + revoke session', async () => {
    passwordHash = await bcrypt.hash(PASSWORD, 4);
    const db = makeDb(makeUser());
    const app = express();
    app.use(express.json());
    app.use('/api/auth', requireAuth, authRoutes(db));
    const mine = jwt.sign({ id: 'user-1', role: 'Employee' }, secret);
    const other = jwt.sign({ id: 'user-2', role: 'Employee' }, secret);

    const cross = await request(app).post('/api/auth/change-password').set('Authorization', `Bearer ${other}`).send({ userId: 'user-1', currentPassword: PASSWORD, newPassword: 'newpass123' });
    expect(cross.status).toBe(403);
    const wrong = await request(app).post('/api/auth/change-password').set('Authorization', `Bearer ${mine}`).send({ userId: 'user-1', currentPassword: 'nope-nope', newPassword: 'newpass123' });
    expect(wrong.status).toBe(401);
    const short = await request(app).post('/api/auth/change-password').set('Authorization', `Bearer ${mine}`).send({ userId: 'user-1', currentPassword: PASSWORD, newPassword: 'short' });
    expect(short.status).toBe(400);
    const ok = await request(app).post('/api/auth/change-password').set('Authorization', `Bearer ${mine}`).send({ userId: 'user-1', currentPassword: PASSWORD, newPassword: 'newpass123' });
    expect(ok.status).toBe(200);
    expect(db.runs.some((r) => r.sql.includes('refresh_tokens'))).toBe(true);
  });
});

describe('auth forgot/reset password', () => {
  it('forgot luôn trả message chung, token lưu dạng hash', async () => {
    const db = makeDb(makeUser());
    const res = await request(forgotApp(db)).post('/api/auth/forgot-password').send({ email: 'user@example.test' });
    expect(res.status).toBe(200);
    expect(res.body.message).toContain('Nếu email hợp lệ');
    expect(res.body.resetLink).toBeUndefined();
    const insert = db.runs.find((r) => r.sql.startsWith('INSERT INTO password_reset_tokens'));
    expect(insert).toBeDefined();
    const stored = String(insert!.params[3]);
    expect(stored).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(res.body)).not.toContain(stored);
  });

  it('email lạ cũng trả message chung như nhau', async () => {
    const res = await request(forgotApp(makeDb(null))).post('/api/auth/forgot-password').send({ email: 'ghost@example.test' });
    expect(res.status).toBe(200);
    expect(res.body.message).toContain('Nếu email hợp lệ');
  });

  it('GET reset token lạ 404, POST mật khẩu ngắn 400, token đã dùng 400', async () => {
    const db = makeDb(makeUser());
    const app = forgotApp(db);
    expect((await request(app).get('/api/auth/reset-password/nope')).status).toBe(404);
    expect((await request(app).post('/api/auth/reset-password').send({ token: 'x', newPassword: '123' })).status).toBe(400);
    db.resetTokens.push({ token: crypto.createHash('sha256').update('used-token').digest('hex'), usedAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 60000).toISOString() });
    expect((await request(app).post('/api/auth/reset-password').send({ token: 'used-token', newPassword: 'newpass123' })).status).toBe(400);
  });

  it('reset hợp lệ đổi pass + đánh dấu đã dùng + revoke session', async () => {
    passwordHash = await bcrypt.hash(PASSWORD, 4);
    const db = makeDb(makeUser());
    const app = forgotApp(db);
    await request(app).post('/api/auth/forgot-password').send({ email: 'user@example.test' });
    // Lấy raw token? Không — mô phỏng bằng cách hash lại: test tự tạo token flow riêng
    const raw = 'token-' + crypto.randomUUID();
    const hashed = crypto.createHash('sha256').update(raw).digest('hex');
    db.resetTokens.push({ token: hashed, usedAt: null, expiresAt: new Date(Date.now() + 60000).toISOString() });
    const check = await request(app).get(`/api/auth/reset-password/${raw}`);
    expect(check.status).toBe(200);
    expect(check.body.email).toBeUndefined();
    const done = await request(app).post('/api/auth/reset-password').send({ token: raw, newPassword: 'brandnew99' });
    expect(done.status).toBe(200);
    expect(db.resetTokens.find((r) => r.token === hashed)?.usedAt).toBeTruthy();
    expect(db.runs.some((r) => r.sql.includes('refresh_tokens'))).toBe(true);
    const again = await request(app).post('/api/auth/reset-password').send({ token: raw, newPassword: 'brandnew99' });
    expect(again.status).toBe(400);
  });
});
