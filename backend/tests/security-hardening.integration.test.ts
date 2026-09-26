import crypto from 'crypto';
import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { forgotPasswordRoutes } from '../routes/auth.js';
import { uploadRoutes } from '../routes/upload.js';
import { userRoutes } from '../routes/users.js';
import { requireAuth } from '../middleware/auth.js';
import { FakeDb } from './helpers/fakeDb.js';
import { makeToken } from './helpers/createTestApp.js';

const employee = {
  id: 'employee-1',
  name: 'Nhan Vien',
  email: 'employee@example.com',
  role: 'Employee',
  department: 'dept-sales',
  permissions: [],
};

const admin = {
  id: 'admin-1',
  name: 'Quan Tri',
  email: 'admin@example.com',
  role: 'Admin',
  department: 'dept-exec',
  permissions: ['admin_panel'],
};

function createSecurityApp(db: FakeDb, mailer: any = {}) {
  const app = express();
  app.use(express.json());
  app.use('/api/users', requireAuth, userRoutes(db, mailer));
  app.use('/api/upload', requireAuth, uploadRoutes());
  app.use('/api/auth', forgotPasswordRoutes(db, mailer));
  return app;
}

describe('User administration authorization', () => {
  it('rejects an employee attempting to create an Admin account', async () => {
    const db = new FakeDb();

    const res = await request(createSecurityApp(db))
      .post('/api/users')
      .set('Authorization', `Bearer ${makeToken(employee)}`)
      .send({
        name: 'Escalated User',
        email: 'escalated@example.com',
        password: 'a-secure-password',
        role: 'Admin',
        department: 'dept-exec',
      });

    expect(res.status).toBe(403);
    expect(db.count('INSERT INTO users')).toBe(0);
  });

  it('allows an Admin to create an account', async () => {
    const db = new FakeDb();

    const res = await request(createSecurityApp(db))
      .post('/api/users')
      .set('Authorization', `Bearer ${makeToken(admin)}`)
      .send({
        name: 'New Employee',
        email: 'new@example.com',
        password: 'a-secure-password',
        role: 'Employee',
        department: 'dept-sales',
      });

    expect(res.status).toBe(200);
    expect(db.count('INSERT INTO users')).toBe(1);
  });

  it('allows an employee to update only their own profile fields', async () => {
    const db = new FakeDb();

    const res = await request(createSecurityApp(db))
      .put('/api/users/employee-1')
      .set('Authorization', `Bearer ${makeToken(employee)}`)
      .send({
        name: 'Nhan Vien Moi',
        role: 'Admin',
        department: 'dept-exec',
        avatar: 'data:image/png;base64,abc',
        bio: 'Updated profile',
      });

    expect(res.status).toBe(200);
    const update = db.calls.find((call) => call.sql.includes('UPDATE users'));
    expect(update).toBeTruthy();
    expect(update!.sql).not.toMatch(/\brole\s*=/);
    expect(update!.sql).not.toMatch(/\bdepartment\s*=/);
  });

  it('rejects an employee attempting to edit another user', async () => {
    const db = new FakeDb();

    const res = await request(createSecurityApp(db))
      .put('/api/users/employee-2')
      .set('Authorization', `Bearer ${makeToken(employee)}`)
      .send({ name: 'Other Person' });

    expect(res.status).toBe(403);
    expect(db.calls.filter((call) => call.sql.includes('UPDATE users')).length).toBe(0);
  });

  it('rejects an employee attempting to delete or reset another account', async () => {
    const db = new FakeDb();
    const app = createSecurityApp(db);

    const deleteRes = await request(app)
      .delete('/api/users/employee-2')
      .set('Authorization', `Bearer ${makeToken(employee)}`);
    const resetRes = await request(app)
      .post('/api/users/employee-2/reset-password')
      .set('Authorization', `Bearer ${makeToken(employee)}`)
      .send({ newPassword: 'a-secure-password' });

    expect(deleteRes.status).toBe(403);
    expect(resetRes.status).toBe(403);
    expect(db.count('DELETE FROM users')).toBe(0);
  });

  it('does not return another employee\'s national ID number', async () => {
    const db = new FakeDb();
    db.onAll(() => [{
      id: 'employee-2',
      name: 'Other Employee',
      email: 'other@example.com',
      role: 'Employee',
      department: 'dept-sales',
      cccd: '012345678901',
      permissions: '[]',
      preferences: '{}',
      isLocked: 0,
    }]);

    const res = await request(createSecurityApp(db))
      .get('/api/users')
      .set('Authorization', `Bearer ${makeToken(employee)}`);

    expect(res.status).toBe(200);
    expect(res.body[0].cccd).toBeUndefined();
  });
});

describe('Password-reset hardening', () => {
  it('stores only a hash of the emailed reset token and accepts the original token', async () => {
    const db = new FakeDb();
    let resetLink = '';
    let expectedTokenHash = '';
    const mailer = {
      sendResetLinkEmail: async (_email: string, link: string) => {
        resetLink = link;
        expectedTokenHash = crypto.createHash('sha256').update(new URL(link).searchParams.get('token') || '').digest('hex');
        return true;
      },
    };
    db.onGet(
      (sql) => sql.includes('FROM users WHERE lower(email)')
        ? { id: 'employee-1', email: employee.email, isLocked: 0 }
        : undefined,
      (sql, params) => sql.includes('FROM password_reset_tokens') && params[0] === expectedTokenHash
        ? { userId: 'employee-1', email: employee.email, expiresAt: new Date(Date.now() + 60_000).toISOString(), usedAt: null }
        : undefined,
    );

    const app = createSecurityApp(db, mailer);
    const forgot = await request(app).post('/api/auth/forgot-password').send({ email: employee.email });
    expect(forgot.status).toBe(200);

    const rawToken = new URL(resetLink).searchParams.get('token') || '';
    const insert = db.findCall('INSERT INTO password_reset_tokens');
    expect(insert).toBeTruthy();
    expect(insert!.params[3]).toBe(expectedTokenHash);
    expect(insert!.params[3]).not.toBe(rawToken);

    const verify = await request(app).get(`/api/auth/reset-password/${encodeURIComponent(rawToken)}`);
    expect(verify.status).toBe(200);
  });

  it('rejects reset passwords shorter than 12 characters', async () => {
    const db = new FakeDb();

    const res = await request(createSecurityApp(db))
      .post('/api/auth/reset-password')
      .send({ token: 'test-token', newPassword: 'short-pass' });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('12');
  });
});

describe('Protected file delivery', () => {
  it('requires authentication before accessing uploaded files', async () => {
    const res = await request(createSecurityApp(new FakeDb())).get('/api/upload/aaaaaaaaaaaaaaaaaaaaaaaa.pdf');

    expect(res.status).toBe(401);
  });

  it('rejects malformed upload file names after authentication', async () => {
    const res = await request(createSecurityApp(new FakeDb()))
      .get('/api/upload/not-a-managed-file.txt')
      .set('Authorization', `Bearer ${makeToken(employee)}`);

    expect(res.status).toBe(400);
  });
});
