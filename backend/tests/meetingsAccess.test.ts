import crypto from 'crypto';
import express from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { meetingRoutes } from '../routes/meetings.js';
import { requireAuth } from '../middleware/auth.js';

const secret = crypto.randomBytes(32).toString('hex');
process.env.JWT_SECRET = secret;

const employee = { id: 'emp-1', name: 'Emp', email: 'e@t.t', role: 'Employee', department: 'Engineering', avatar: '', permissions: [] as string[] };
const host = { ...employee, id: 'host-1', role: 'Employee' };
const admin = { ...employee, id: 'admin-1', role: 'Admin', permissions: ['admin_panel'] };
const tokenFor = (u: typeof employee) => jwt.sign(u, secret);
const authApp = (prefix: string, router: express.Router) => {
  const app = express();
  app.use(express.json());
  app.use(prefix, requireAuth, router);
  return app;
};

type Run = { sql: string; params: unknown[] };

/**
 * `memberIds` are the people on the participant list; the meeting's own link is
 * `meet.example/<uuid>` so tests can prove it does or does not leak.
 */
function meetingsDb(meeting: any = null, memberIds: string[] = [], meetings: any[] = []) {
  const runs: Run[] = [];
  const db = {
    runs,
    all: async (sql: string) => {
      if (sql.includes('FROM meeting_participants')) return memberIds.map((userId) => ({ userId }));
      if (sql.includes('FROM meetings')) return meetings;
      return [];
    },
    get: async (sql: string, params: unknown[] = []) => {
      if (sql.includes('FROM meeting_participants')) {
        return memberIds.includes(params[1]) ? { userId: params[1] } : undefined;
      }
      if (sql.includes('FROM meetings')) return meeting ? { ...meeting } : undefined;
      return undefined;
    },
    run: async (sql: string, params: unknown[] = []) => { runs.push({ sql, params }); return { changes: 1 }; },
  };
  return db;
}

const LINK = 'meet.example/6f1c2a9b-1111-2222-3333-444455556666';
const meetingRow = { id: 'm-1', title: 'Hop', hostId: 'host-1', meetingLink: LINK, startTime: '2026-01-01' };

describe('M2 — meetingLink là thông tin đăng nhập, không phải dữ liệu công khai', () => {
  it('người không liên quan không thấy link trong danh sách', async () => {
    const db = meetingsDb(meetingRow, [], [meetingRow]);
    const app = authApp('/api/meetings', meetingRoutes(db));
    const res = await request(app).get('/api/meetings').set('Authorization', `Bearer ${tokenFor(employee)}`);
    expect(res.status).toBe(200);
    expect(res.body[0].meetingLink).toBeNull();
    expect(res.body[0].title).toBe('Hop');
  });

  it('người không liên quan không thấy link ở endpoint chi tiết', async () => {
    const db = meetingsDb(meetingRow, []);
    const app = authApp('/api/meetings', meetingRoutes(db));
    const res = await request(app).get('/api/meetings/m-1').set('Authorization', `Bearer ${tokenFor(employee)}`);
    expect(res.status).toBe(200);
    expect(res.body.meetingLink).toBeNull();
  });

  it('người tham dự thấy link', async () => {
    const db = meetingsDb(meetingRow, ['emp-1']);
    const app = authApp('/api/meetings', meetingRoutes(db));
    const res = await request(app).get('/api/meetings/m-1').set('Authorization', `Bearer ${tokenFor(employee)}`);
    expect(res.body.meetingLink).toBe(LINK);
  });

  it('host va admin thay link', async () => {
    const hostApp = authApp('/api/meetings', meetingRoutes(meetingsDb(meetingRow, [])));
    expect((await request(hostApp).get('/api/meetings/m-1').set('Authorization', `Bearer ${tokenFor(host)}`)).body.meetingLink).toBe(LINK);

    const adminApp = authApp('/api/meetings', meetingRoutes(meetingsDb(meetingRow, [])));
    expect((await request(adminApp).get('/api/meetings/m-1').set('Authorization', `Bearer ${tokenFor(admin)}`)).body.meetingLink).toBe(LINK);
  });

  it('danh sach duoc gioi han LIMIT', async () => {
    const seen: Array<{ sql: string; params: unknown[] }> = [];
    const db = {
      all: async (sql: string, params: unknown[] = []) => { seen.push({ sql, params }); return []; },
      get: async () => undefined,
      run: async () => ({ changes: 1 }),
    };
    const app = authApp('/api/meetings', meetingRoutes(db));
    await request(app).get('/api/meetings').set('Authorization', `Bearer ${tokenFor(employee)}`);
    expect(seen[0].sql).toContain('LIMIT');
  });
});

describe('M2 — giải mã tham gia bằng endpoint riêng', () => {
  it('mã quá ngan bi tu choi de khong thanh cong tim chuoi', async () => {
    const db = meetingsDb(meetingRow, []);
    const app = authApp('/api/meetings', meetingRoutes(db));
    expect((await request(app).get('/api/meetings/by-code/abc').set('Authorization', `Bearer ${tokenFor(employee)}`)).status).toBe(400);
  });

  it('tra ve meeting kem link cho nguoi da trinh ma', async () => {
    const db = meetingsDb(meetingRow, []);
    const app = authApp('/api/meetings', meetingRoutes(db));
    const res = await request(app).get(`/api/meetings/by-code/6f1c2a9b-1111-2222-3333-444455556666`)
      .set('Authorization', `Bearer ${tokenFor(employee)}`);
    expect(res.status).toBe(200);
    expect(res.body.meetingLink).toBe(LINK);
  });

  it('khong tim thay ma thi 404', async () => {
    const db = meetingsDb(undefined, []);
    const app = authApp('/api/meetings', meetingRoutes(db));
    expect((await request(app).get('/api/meetings/by-code/zzzzzzzzzzzz').set('Authorization', `Bearer ${tokenFor(employee)}`)).status).toBe(404);
  });
});

describe('M2 — tính hieu cuoc hop chi dung cho thanh vien', () => {
  it('nguoi ngoai cuoc hop khong doc duoc signals', async () => {
    const db = meetingsDb(meetingRow, []);
    const app = authApp('/api/meetings', meetingRoutes(db));
    const res = await request(app).get('/api/meetings/m-1/signals').set('Authorization', `Bearer ${tokenFor(employee)}`);
    expect(res.status).toBe(403);
  });

  it('nguoi ngoai cuoc hop khong gui duoc signals', async () => {
    const db = meetingsDb(meetingRow, []);
    const app = authApp('/api/meetings', meetingRoutes(db));
    const res = await request(app).post('/api/meetings/m-1/signals')
      .set('Authorization', `Bearer ${tokenFor(employee)}`)
      .send({ to: 'all', type: 'stroke', data: {} });
    expect(res.status).toBe(403);
    expect(db.runs.some((r) => r.sql.startsWith('INSERT INTO signals'))).toBe(false);
  });

  it('nguoi tham du doc va ghi duoc signals', async () => {
    const db = meetingsDb(meetingRow, ['emp-1']);
    const app = authApp('/api/meetings', meetingRoutes(db));
    expect((await request(app).get('/api/meetings/m-1/signals').set('Authorization', `Bearer ${tokenFor(employee)}`)).status).toBe(200);
    const post = await request(app).post('/api/meetings/m-1/signals')
      .set('Authorization', `Bearer ${tokenFor(employee)}`)
      .send({ to: 'all', type: 'stroke', data: {} });
    expect(post.status).toBe(201);
  });

  it('POST signals tra ve id that, khong phai null khi server sinh', async () => {
    const db = meetingsDb(meetingRow, ['emp-1']);
    const app = authApp('/api/meetings', meetingRoutes(db));
    const res = await request(app).post('/api/meetings/m-1/signals')
      .set('Authorization', `Bearer ${tokenFor(employee)}`)
      .send({ to: 'all', type: 'stroke', data: {} });
    expect(res.body.id).toBeTruthy();
    expect(db.runs.find((r) => r.sql.startsWith('INSERT INTO signals'))!.params[0]).toBe(res.body.id);
  });

  it('cuoc hop khong ton tai thi 404 chu khong 403', async () => {
    const db = meetingsDb(undefined, []);
    const app = authApp('/api/meetings', meetingRoutes(db));
    expect((await request(app).get('/api/meetings/nope/signals').set('Authorization', `Bearer ${tokenFor(employee)}`)).status).toBe(404);
  });

  it('join van mo cho nguoi duoc gui ma — luong chinh khong bi chan', async () => {
    const db = meetingsDb(meetingRow, []);
    const app = authApp('/api/meetings', meetingRoutes(db));
    const res = await request(app).put('/api/meetings/m-1/join').set('Authorization', `Bearer ${tokenFor(employee)}`);
    expect(res.status).toBe(200);
    const insert = db.runs.find((r) => r.sql.startsWith('INSERT IGNORE INTO meeting_participants'));
    expect(insert!.params[1]).toBe('emp-1');
  });
});
