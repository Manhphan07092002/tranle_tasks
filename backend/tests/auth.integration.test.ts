import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { FakeDb } from './helpers/fakeDb.js';
import { createTestApp, makeToken } from './helpers/createTestApp.js';

describe('POST /api/auth/login', () => {
  let db: FakeDb;

  beforeEach(() => {
    db = new FakeDb();
    db.onGet((sql) => sql.includes('sessionVersion') ? { id: 'user-1', isLocked: 0, sessionVersion: 0 } : undefined);
  });

  const hashedPassword = bcrypt.hashSync('password123', 10);
  const savedUser = {
    id: 'user-1',
    name: 'Nguyen Van A',
    email: 'a@example.com',
    role: 'Employee',
    department: 'dept-sales',
    avatar: '',
    password: hashedPassword,
    isLocked: 0,
    lockedUntil: null,
    failedLogins: 0,
  };

  it('trả về token + thông tin user khi đăng nhập đúng', async () => {
    db.onGet(
      (sql) => (sql.includes('FROM users') ? savedUser : undefined),
      (sql) => (sql.includes('FROM roles') ? { permissions: '["task.view","contract.view"]' } : undefined)
    );

    const res = await request(createTestApp(db))
      .post('/api/auth/login')
      .send({ email: 'a@example.com', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.email).toBe('a@example.com');
    expect(res.body.user.permissions).toContain('task.view');

    const payload = jwt.decode(res.body.token) as any;
    expect(payload.email).toBe('a@example.com');
    expect(db.count('INSERT INTO activity_logs')).toBeGreaterThanOrEqual(1);
  });

  it('sai mật khẩu → 401 và tăng failedLogins', async () => {
    db.onGet((sql) => (sql.includes('FROM users') ? savedUser : undefined));

    const res = await request(createTestApp(db))
      .post('/api/auth/login')
      .send({ email: 'a@example.com', password: 'wrong-password-xyz' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid credentials');
    const update = db.findCall('UPDATE users SET failedLogins');
    expect(update).toBeTruthy();
    expect(update!.params[0]).toBe(1);
  });

  it('email không tồn tại → 401 và ghi activity log', async () => {
    const res = await request(createTestApp(db))
      .post('/api/auth/login')
      .send({ email: 'ghost@example.com', password: 'password123' });

    expect(res.status).toBe(401);
    const logCall = db.findCall('INSERT INTO activity_logs');
    expect(logCall).toBeTruthy();
    expect(logCall!.params[3]).toBe(null);
  });

  it('tài khoản bị khóa → 403', async () => {
    db.onGet((sql) => (sql.includes('FROM users') ? { ...savedUser, isLocked: 1 } : undefined));

    const res = await request(createTestApp(db))
      .post('/api/auth/login')
      .send({ email: 'a@example.com', password: 'password123' });

    expect(res.status).toBe(403);
    expect(res.body.error).toContain('khóa');
  });

  it('payload thiếu/không hợp lệ → 400 (zod validation)', async () => {
    const res = await request(createTestApp(db))
      .post('/api/auth/login')
      .send({ email: 'not-an-email', password: '123' });

    expect(res.status).toBe(400);
    expect(res.body.details.length).toBeGreaterThan(0);
  });
});

describe('POST /api/auth/change-password', () => {
  let db: FakeDb;

  beforeEach(() => {
    db = new FakeDb();
    db.onGet((sql) => sql.includes('sessionVersion') ? { id: 'user-1', isLocked: 0, sessionVersion: 0 } : undefined);
  });

  const selfToken = makeToken({ id: 'user-1', name: 'Nguyen Van A', email: 'a@example.com', role: 'Employee', department: 'dept-sales' });
  const adminToken = makeToken({ id: 'admin-1', name: 'Admin', email: 'admin@example.com', role: 'Admin', department: 'dept-exec' });

  it('đổi đúng mật khẩu hiện tại → 200 và cập nhật users', async () => {
    const user = { id: 'user-1', password: bcrypt.hashSync('old-password', 10) };
    db.onGet((sql) => (sql.includes('SELECT id, password') ? user : undefined));

    const res = await request(createTestApp(db))
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${selfToken}`)
      .send({ userId: 'user-1', currentPassword: 'old-password', newPassword: 'new-password' });

    expect(res.status).toBe(200);
    expect(db.count('UPDATE users SET password')).toBe(1);
  });

  it('sai mật khẩu hiện tại → 401', async () => {
    const user = { id: 'user-1', password: bcrypt.hashSync('old-password', 10) };
    db.onGet((sql) => (sql.includes('SELECT id, password') ? user : undefined));

    const res = await request(createTestApp(db))
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${selfToken}`)
      .send({ userId: 'user-1', currentPassword: 'wrong', newPassword: 'new-password' });

    expect(res.status).toBe(401);
  });

  it('user không tồn tại → 404', async () => {
    const res = await request(createTestApp(db))
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ userId: 'ghost', currentPassword: 'old', newPassword: 'new-password' });

    expect(res.status).toBe(404);
  });

  it('không có token → 401 (P0: requireAuth)', async () => {
    const res = await request(createTestApp(db))
      .post('/api/auth/change-password')
      .send({ userId: 'user-1', currentPassword: 'old-password', newPassword: 'new-password' });

    expect(res.status).toBe(401);
  });

  it('đổi pass của người khác khi không phải Admin → 403 (P0: chống IDOR)', async () => {
    const res = await request(createTestApp(db))
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${selfToken}`)
      .send({ userId: 'user-2', currentPassword: 'old-password', newPassword: 'new-password' });

    expect(res.status).toBe(403);
  });
});
