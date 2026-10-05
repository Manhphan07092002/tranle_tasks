import crypto from 'crypto';
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { userRoutes } from '../routes/users.js';
import { requireAuth } from '../middleware/auth.js';
import { meetingRoutes } from '../routes/meetings.js';

const secret = crypto.randomBytes(32).toString('hex');
process.env.JWT_SECRET = secret;

const employee = { id: 'emp-1', name: 'Emp', email: 'emp@example.test', role: 'Employee', department: 'Engineering', avatar: '', permissions: [] as string[] };
const admin = { ...employee, id: 'admin-1', role: 'Admin' };
const tokenFor = (u: typeof employee) => jwt.sign(u, secret);
const authApp = (prefix: string, router: express.Router) => {
  const app = express();
  app.use(express.json());
  app.use(prefix, requireAuth, router);
  return app;
};

const PII_USER = {
  id: 'u-1', name: 'Nguyen Van A', email: 'a@example.test', role: 'Employee', department: 'Engineering',
  avatar: '', bio: '', phone: '0900000001', dob: '1990-01-01', hometown: 'Da Nang',
  cccd: '123456789', gender: 'male', preferences: '{}', isLocked: 0, permissions: '[]',
};

function usersDb(roleById: Record<string, string>, list: any[] = [PII_USER]) {
  const runs: Array<{ sql: string; params: unknown[] }> = [];
  return {
    runs,
    all: async () => list.map((u) => ({ ...u })),
    get: async (sql: string, params: unknown[] = []) => {
      if (sql.includes('FROM users') && sql.includes('WHERE id = ?')) {
        const id = String(params[0]);
        if (sql.includes('id, email, name')) return { id, email: `${id}@example.test`, name: id };
        return { id, role: roleById[id] || 'Employee', isLocked: 0, lockedUntil: null };
      }
      return undefined;
    },
    run: async (sql: string, params: unknown[] = []) => {
      runs.push({ sql, params });
      return { changes: 1 };
    },
  };
}

const mailer = { sendResetPasswordEmail: async () => true };

describe('users routes', () => {
  it('Admin thấy full PII, Employee bị redact', async () => {
    const db = usersDb({ 'admin-1': 'Admin', 'emp-1': 'Employee' });
    const app = authApp('/api/users', userRoutes(db, mailer));
    const asAdmin = await request(app).get('/api/users').set('Authorization', `Bearer ${tokenFor(admin)}`);
    expect(asAdmin.status).toBe(200);
    expect(asAdmin.body[0].phone).toBe('0900000001');
    expect(asAdmin.body[0].cccd).toBe('123456789');
    const asEmp = await request(app).get('/api/users').set('Authorization', `Bearer ${tokenFor(employee)}`);
    expect(asEmp.status).toBe(200);
    expect(asEmp.body[0].phone).toBeUndefined();
    expect(asEmp.body[0].cccd).toBeUndefined();
    expect(asEmp.body[0].email).toBe('');
  });

  it('chỉ Admin được tạo/xóa user', async () => {
    const db = usersDb({ 'admin-1': 'Admin', 'emp-1': 'Employee' });
    const app = authApp('/api/users', userRoutes(db, mailer));
    const denied = await request(app).post('/api/users').set('Authorization', `Bearer ${tokenFor(employee)}`).send({ id: 'x', name: 'X', email: 'x@t.t' });
    expect(denied.status).toBe(403);
    const created = await request(app).post('/api/users').set('Authorization', `Bearer ${tokenFor(admin)}`).send({ id: 'x', name: 'X', email: 'x@t.t', role: 'Employee', department: 'Engineering', avatar: '' });
    expect(created.status).toBe(200);
    const delDenied = await request(app).delete('/api/users/u-1').set('Authorization', `Bearer ${tokenFor(employee)}`);
    expect(delDenied.status).toBe(403);
    const delOk = await request(app).delete('/api/users/u-1').set('Authorization', `Bearer ${tokenFor(admin)}`);
    expect(delOk.status).toBe(200);
  });

  it('Employee tự sửa được nhưng không leo role, không sửa người khác', async () => {
    const db = usersDb({ 'emp-1': 'Employee' });
    const app = authApp('/api/users', userRoutes(db, mailer));
    const cross = await request(app).put('/api/users/other').set('Authorization', `Bearer ${tokenFor(employee)}`).send({ name: 'Hack' });
    expect(cross.status).toBe(403);
    const self = await request(app).put('/api/users/emp-1').set('Authorization', `Bearer ${tokenFor(employee)}`).send({ name: 'New Name', role: 'Admin', avatar: '' });
    expect(self.status).toBe(200);
    expect(db.runs).toHaveLength(1);
    expect(db.runs[0].sql).not.toContain('role');
  });

  it('Admin reset-password sinh pass mạnh + gửi mail, lock/unlock + revoke', async () => {
    const db = usersDb({ 'admin-1': 'Admin' });
    const app = authApp('/api/users', userRoutes(db, mailer));
    const reset = await request(app).post('/api/users/u-1/reset-password').set('Authorization', `Bearer ${tokenFor(admin)}`).send({});
    expect(reset.status).toBe(200);
    expect(reset.body.emailSent).toBe(true);
    expect(String(reset.body.generatedPassword).length).toBeGreaterThanOrEqual(8);
    const lock = await request(app).put('/api/users/u-1/lock').set('Authorization', `Bearer ${tokenFor(admin)}`);
    expect(lock.status).toBe(200);
    expect(db.runs.some((r) => r.sql.includes('refresh_tokens'))).toBe(true);
    const unlock = await request(app).put('/api/users/u-1/unlock').set('Authorization', `Bearer ${tokenFor(admin)}`);
    expect(unlock.status).toBe(200);
    const empLock = await request(app).put('/api/users/u-1/lock').set('Authorization', `Bearer ${tokenFor(employee)}`);
    expect(empLock.status).toBe(403);
  });
});

describe('meetings routes', () => {
  function meetingsDb(meeting: any = null, isParticipant = false) {
    const runs: Array<{ sql: string; params: unknown[] }> = [];
    return {
      runs,
      all: async () => [],
      get: async (sql: string, params: unknown[] = []) => {
        if (sql.startsWith('SELECT * FROM meetings')) return meeting ? { ...meeting } : undefined;
        if (sql.includes('FROM meeting_participants')) return isParticipant ? { userId: 'emp-1' } : undefined;
        if (sql.includes('FROM meetings WHERE id')) return meeting ? { hostId: meeting.hostId } : undefined;
        return undefined;
      },
      run: async (sql: string, params: unknown[] = []) => {
        runs.push({ sql, params });
        return { changes: 1 };
      },
    };
  }

  it('tạo meeting ép hostId từ JWT, bỏ qua hostId giả trong body', async () => {
    const db = meetingsDb();
    const app = authApp('/api/meetings', meetingRoutes(db));
    const res = await request(app).post('/api/meetings').set('Authorization', `Bearer ${tokenFor(employee)}`).send({
      title: 'Hop', hostId: 'victim-admin', startTime: '2026-01-01', endTime: '2026-01-02', participants: ['emp-1'],
    });
    expect(res.status).toBe(201);
    const insert = db.runs.find((r) => r.sql.startsWith('INSERT INTO meetings'));
    expect(insert!.params[3]).toBe('emp-1');
  });

  it('join/leave luôn dùng id của chính mình, không mạo danh được', async () => {
    const db = meetingsDb({ id: 'm-1' });
    const app = authApp('/api/meetings', meetingRoutes(db));
    const join = await request(app).put('/api/meetings/m-1/join').set('Authorization', `Bearer ${tokenFor(employee)}`).send({ userId: 'someone-else' });
    expect(join.status).toBe(200);
    expect(db.runs[0].params[1]).toBe('emp-1');
    const leave = await request(app).put('/api/meetings/m-1/leave').set('Authorization', `Bearer ${tokenFor(employee)}`).send({ userId: 'someone-else' });
    expect(leave.status).toBe(200);
    expect(db.runs[1].params[1]).toBe('emp-1');
  });

  it('người ngoài không sửa/xóa được meeting', async () => {
    const db = meetingsDb({ id: 'm-1', hostId: 'other-host' }, false);
    const app = authApp('/api/meetings', meetingRoutes(db));
    expect((await request(app).put('/api/meetings/m-1').set('Authorization', `Bearer ${tokenFor(employee)}`).send({ title: 'x' })).status).toBe(403);
    expect((await request(app).delete('/api/meetings/m-1').set('Authorization', `Bearer ${tokenFor(employee)}`)).status).toBe(403);
  });

  it('host sửa/xóa được, admin xóa được', async () => {
    const db = meetingsDb({ id: 'm-1', hostId: 'emp-1' }, false);
    const app = authApp('/api/meetings', meetingRoutes(db));
    expect((await request(app).put('/api/meetings/m-1').set('Authorization', `Bearer ${tokenFor(employee)}`).send({ title: 'New' })).status).toBe(200);
    expect((await request(app).delete('/api/meetings/m-1').set('Authorization', `Bearer ${tokenFor(employee)}`)).status).toBe(200);
  });

  it('signal ép người gửi từ JWT', async () => {
    const db = meetingsDb();
    const app = authApp('/api/meetings', meetingRoutes(db));
    const res = await request(app).post('/api/meetings/m-1/signals').set('Authorization', `Bearer ${tokenFor(employee)}`).send({ from: 'fake-user', to: 'x', type: 'chat', data: {} });
    expect(res.status).toBe(201);
    expect(db.runs[0].params[2]).toBe('emp-1');
  });
});

describe('users password hashing', () => {
  it('tạo user băm mật khẩu bằng bcrypt', async () => {
    const db = usersDb({ 'admin-1': 'Admin' });
    const app = authApp('/api/users', userRoutes(db, mailer));
    await request(app).post('/api/users').set('Authorization', `Bearer ${tokenFor(admin)}`).send({ id: 'n', name: 'N', email: 'n@t.t', password: 'secret123', role: 'Employee', department: 'Engineering', avatar: '' });
    const insert = db.runs.find((r) => r.sql.startsWith('INSERT INTO users'));
    const hash = String(insert!.params[3]);
    expect(hash).not.toBe('secret123');
    expect(await bcrypt.compare('secret123', hash)).toBe(true);
  });
});
