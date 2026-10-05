import crypto from 'crypto';
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { authRoutes } from '../routes/auth.js';
import { cookiesMiddleware } from '../middleware/auth.js';

const secret = crypto.randomBytes(32).toString('hex');
process.env.JWT_SECRET = secret;

interface RefreshRow {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: string;
  createdAt: string;
  revokedAt: string | null;
}

function makeDb(passwordHash: string) {
  const refreshTokens: RefreshRow[] = [];
  const user = {
    id: 'user-1', name: 'User', email: 'user@example.test', password: passwordHash,
    role: 'Employee', department: 'Engineering', avatar: '',
    failedLogins: 0, lockedUntil: null, isLocked: 0,
  };
  return {
    rows: refreshTokens,
    get: async (sql: string, params: unknown[] = []) => {
      if (sql.includes('FROM users') && sql.includes('lower(email)')) return { ...user };
      if (sql.includes('FROM users') && sql.includes('WHERE id')) return { ...user };
      if (sql.includes('FROM roles')) return { permissions: '[]' };
      if (sql.includes('FROM refresh_tokens') && sql.includes('tokenHash')) {
        return refreshTokens.find((r) => r.tokenHash === params[0]);
      }
      return undefined;
    },
    run: async (sql: string, params: unknown[] = []) => {
      if (sql.startsWith('INSERT INTO refresh_tokens')) {
        refreshTokens.push({
          id: String(params[0]), userId: String(params[1]), tokenHash: String(params[2]),
          expiresAt: String(params[3]), createdAt: String(params[4]), revokedAt: null,
        });
      } else if (sql.startsWith('UPDATE refresh_tokens SET revokedAt')) {
        const when = String(params[0]);
        if (sql.includes('WHERE id = ?')) {
          const row = refreshTokens.find((r) => r.id === params[1]);
          if (row) row.revokedAt = when;
        } else if (sql.includes('WHERE tokenHash = ?')) {
          const row = refreshTokens.find((r) => r.tokenHash === params[1]);
          if (row) row.revokedAt = when;
        } else if (sql.includes('WHERE userId = ?')) {
          for (const r of refreshTokens) if (r.userId === params[1] && !r.revokedAt) r.revokedAt = when;
        }
      } else if (sql.startsWith('UPDATE users SET password')) {
        user.password = String(params[0]);
      }
      return { changes: 1 };
    },
  };
}

function appFor(db: ReturnType<typeof makeDb>) {
  const app = express();
  app.use(express.json());
  app.use(cookiesMiddleware);
  app.use('/api/auth', authRoutes(db));
  return app;
}

function refreshCookie(res: request.Response): string {
  const setCookie = res.headers['set-cookie'] as unknown as string[];
  const entry = setCookie.find((c) => c.startsWith('tranle_refresh='));
  expect(entry).toBeDefined();
  expect(entry).toContain('HttpOnly');
  expect(entry).toContain('SameSite=Lax');
  return entry.split(';')[0];
}

describe('refresh-token rotation', () => {
  it('login mints a 15-minute access token + httpOnly refresh cookie', async () => {
    const db = makeDb(await bcrypt.hash('password123', 4));
    const res = await request(appFor(db))
      .post('/api/auth/login')
      .send({ email: 'user@example.test', password: 'password123' });

    expect(res.status).toBe(200);
    const payload = jwt.verify(res.body.token, secret) as { exp: number; iat: number };
    expect(payload.exp - payload.iat).toBe(15 * 60);
    expect(res.body.expiresIn).toBe(900);
    const cookie = refreshCookie(res);
    expect(cookie.length).toBeGreaterThan('tranle_refresh=rt_'.length);
    // Only a hash lands in the database — never the raw token.
    expect(db.rows).toHaveLength(1);
    expect(JSON.stringify(db.rows)).not.toContain(cookie.split('=')[1]);
  });

  it('refresh rotates the token and rejects reuse (theft detection)', async () => {
    const db = makeDb(await bcrypt.hash('password123', 4));
    const app = appFor(db);
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@example.test', password: 'password123' });
    const firstCookie = refreshCookie(login);

    const rotated = await request(app).post('/api/auth/refresh').set('Cookie', firstCookie);
    expect(rotated.status).toBe(200);
    expect(rotated.body.token).toBeDefined();
    expect(rotated.body.token).not.toBe(login.body.token);
    const secondCookie = refreshCookie(rotated);
    expect(secondCookie).not.toBe(firstCookie);
    expect(db.rows).toHaveLength(2);

    // Replaying the already-rotated cookie must fail AND kill the whole family.
    const replay = await request(app).post('/api/auth/refresh').set('Cookie', firstCookie);
    expect(replay.status).toBe(401);
    expect(db.rows.every((r) => r.revokedAt !== null)).toBe(true);

    // Even the newest token is dead after theft detection.
    const afterTheft = await request(app).post('/api/auth/refresh').set('Cookie', secondCookie);
    expect(afterTheft.status).toBe(401);
  });

  it('logout revokes the session and clears the cookie', async () => {
    const db = makeDb(await bcrypt.hash('password123', 4));
    const app = appFor(db);
    const agent = request.agent(app);
    await agent.post('/api/auth/login').send({ email: 'user@example.test', password: 'password123' });

    const logout = await agent.post('/api/auth/logout');
    expect(logout.status).toBe(200);
    expect(db.rows.every((r) => r.revokedAt !== null)).toBe(true);

    const refresh = await agent.post('/api/auth/refresh');
    expect(refresh.status).toBe(401);
  });

  it('password change revokes every session', async () => {
    const db = makeDb(await bcrypt.hash('password123', 4));
    const app = appFor(db);
    const agent = request.agent(app);
    const login = await agent.post('/api/auth/login').send({ email: 'user@example.test', password: 'password123' });
    const access = login.body.token as string;

    const changed = await agent
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${access}`)
      .send({ userId: 'user-1', currentPassword: 'password123', newPassword: 'newpassword456' });
    expect(changed.status).toBe(200);

    const refresh = await agent.post('/api/auth/refresh');
    expect(refresh.status).toBe(401);
  });
});
