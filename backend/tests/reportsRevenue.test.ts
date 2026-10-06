import crypto from 'crypto';
import express from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { reportRoutes } from '../routes/reports.js';
import { revenueRoutes } from '../routes/revenue.js';
import { requireAuth } from '../middleware/auth.js';

const secret = crypto.randomBytes(32).toString('hex');
process.env.JWT_SECRET = secret;

const employee = { id: 'emp-1', name: 'Emp', email: 'e@t.t', role: 'Employee', department: 'Engineering', avatar: '', permissions: [] as string[] };
const manager = { ...employee, id: 'mgr-1', role: 'Manager' };
const director = { ...employee, id: 'dir-1', role: 'Director' };
const tokenFor = (u: typeof employee) => jwt.sign(u, secret);
const authApp = (prefix: string, router: express.Router) => {
  const app = express();
  app.use(express.json());
  app.use(prefix, requireAuth, router);
  return app;
};

function reportsDb(existing: any = null) {
  const runs: Array<{ sql: string; params: unknown[] }> = [];
  return {
    runs,
    all: async () => [],
    get: async (sql: string) => {
      if (sql.includes('FROM reports')) return existing ? { ...existing } : undefined;
      if (sql.includes('FROM departments')) return {};
      return undefined;
    },
    run: async (sql: string, params: unknown[] = []) => {
      runs.push({ sql, params });
      return { changes: 1 };
    },
  };
}

function revenueDb(existing: any = null) {
  const runs: Array<{ sql: string; params: unknown[] }> = [];
  return {
    runs,
    all: async () => [],
    get: async (sql: string) => {
      if (sql.includes('FROM revenue_reports')) return existing ? { ...existing } : undefined;
      if (sql.includes('FROM departments')) return {};
      return undefined;
    },
    run: async (sql: string, params: unknown[] = []) => {
      runs.push({ sql, params });
      return { changes: 1 };
    },
  };
}

describe('reports routes', () => {
  it('tạo báo cáo ép authorId/timestamp từ server, không nhận approvedBy giả', async () => {
    const db = reportsDb();
    const app = authApp('/api/reports', reportRoutes(db));
    const res = await request(app).post('/api/reports').set('Authorization', `Bearer ${tokenFor(employee)}`).send({
      id: 'r-1', title: 'BC', content: '{}', authorId: 'fake', department: 'Engineering', status: 'Draft',
      approvedBy: 'fake', approvedAt: '2020-01-01', directorFeedback: 'fake-ok',
    });
    expect(res.status).toBe(201);
    const insert = db.runs.find((r) => r.sql.startsWith('INSERT INTO reports'));
    expect(insert!.params[3]).toBe('emp-1');
    expect(insert!.params[8]).toBeNull();
    expect(insert!.params[9]).toBeNull();
  });

  it('Employee không tự duyệt báo cáo của người khác', async () => {
    const db = reportsDb({ id: 'r-1', authorId: 'other', department: 'Engineering', status: 'Pending Manager', approvedAt: null, approvedBy: null, directorFeedback: null, managerFeedback: null });
    const app = authApp('/api/reports', reportRoutes(db));
    const res = await request(app).put('/api/reports/r-1').set('Authorization', `Bearer ${tokenFor(employee)}`).send({ title: 'x', status: 'Approved' });
    expect(res.status).toBe(403);
  });

  it('Director duyệt được, approvedBy ép từ JWT', async () => {
    const db = reportsDb({ id: 'r-1', authorId: 'other', department: 'Engineering', status: 'Pending Manager', approvedAt: null, approvedBy: null, directorFeedback: null, managerFeedback: null });
    const app = authApp('/api/reports', reportRoutes(db));
    const res = await request(app).put('/api/reports/r-1').set('Authorization', `Bearer ${tokenFor(director)}`).send({ title: 'x', status: 'Approved' });
    expect(res.status).toBe(200);
    const update = db.runs.find((r) => r.sql.startsWith('UPDATE reports'));
    expect(update!.params[5]).toBe('dir-1');
    expect(update!.params[4]).toBeTruthy();
  });

  it('Manager cùng phòng duyệt được, khác phòng thì không', async () => {
    const sameDept = reportsDb({ id: 'r-1', authorId: 'other', department: 'Engineering', status: 'Pending Manager', approvedAt: null, approvedBy: null, directorFeedback: null, managerFeedback: null });
    const appSame = authApp('/api/reports', reportRoutes(sameDept));
    expect((await request(appSame).put('/api/reports/r-1').set('Authorization', `Bearer ${tokenFor(manager)}`).send({ title: 'x', status: 'Approved' })).status).toBe(200);
    const otherDept = reportsDb({ id: 'r-1', authorId: 'other', department: 'Sales', status: 'Pending Manager', approvedAt: null, approvedBy: null, directorFeedback: null, managerFeedback: null });
    const appOther = authApp('/api/reports', reportRoutes(otherDept));
    expect((await request(appOther).put('/api/reports/r-1').set('Authorization', `Bearer ${tokenFor(manager)}`).send({ title: 'x', status: 'Approved' })).status).toBe(403);
  });
});

describe('reports delete/get guards', () => {
  it('người ngoài không xóa được báo cáo của người khác', async () => {
    const db = reportsDb({ id: 'r-1', authorId: 'other', department: 'Engineering', status: 'Draft', approvedAt: null, approvedBy: null, directorFeedback: null, managerFeedback: null });
    const app = authApp('/api/reports', reportRoutes(db));
    expect((await request(app).delete('/api/reports/r-1').set('Authorization', `Bearer ${tokenFor(employee)}`)).status).toBe(403);
  });

  it('chủ sở hữu xóa được draft của mình', async () => {
    const db = reportsDb({ id: 'r-1', authorId: 'emp-1', department: 'Engineering', status: 'Draft', approvedAt: null, approvedBy: null, directorFeedback: null, managerFeedback: null });
    const app = authApp('/api/reports', reportRoutes(db));
    expect((await request(app).delete('/api/reports/r-1').set('Authorization', `Bearer ${tokenFor(employee)}`)).status).toBe(200);
  });

  it('GET lọc theo author/department với user thường', async () => {
    let captured: any[] = [];
    const db = {
      all: async (_sql: string, params: unknown[] = []) => { captured = params; return []; },
      get: async () => undefined,
      run: async () => ({ changes: 1 }),
    };
    const app = authApp('/api/reports', reportRoutes(db));
    await request(app).get('/api/reports').set('Authorization', `Bearer ${tokenFor(employee)}`);
    expect(captured).toContain('emp-1');
    expect(captured).toContain('Engineering');
  });

  it('POST ép department của chính mình với user thường', async () => {
    const db = reportsDb();
    const app = authApp('/api/reports', reportRoutes(db));
    await request(app).post('/api/reports').set('Authorization', `Bearer ${tokenFor(employee)}`).send({ id: 'r-9', title: 'T', content: '{}', department: 'Sales', status: 'Draft' });
    const insert = db.runs.find((r) => r.sql.startsWith('INSERT INTO reports'));
    expect(insert!.params[4]).toBe('Engineering');
  });
});

describe('revenue delete guards', () => {
  it('người ngoài không xóa được', async () => {
    const db = revenueDb({ id: 'v-1', authorId: 'other', department: 'Engineering', status: 'Draft', approvedBy: null, approvedAt: null, managerFeedback: null, directorFeedback: null });
    const app = authApp('/api/revenue-reports', revenueRoutes(db));
    expect((await request(app).delete('/api/revenue-reports/v-1').set('Authorization', `Bearer ${tokenFor(employee)}`)).status).toBe(403);
  });
});

describe('revenue routes', () => {
  it('tạo báo cáo doanh thu ép authorId từ JWT', async () => {
    const db = revenueDb();
    const app = authApp('/api/revenue-reports', revenueRoutes(db));
    const res = await request(app).post('/api/revenue-reports').set('Authorization', `Bearer ${tokenFor(employee)}`).send({
      id: 'v-1', title: 'DT', reportType: 'monthly', periodStart: '2026-01-01', periodEnd: '2026-01-31', authorId: 'fake', department: 'Engineering',
    });
    expect(res.status).toBe(201);
    const insert = db.runs.find((r) => r.sql.startsWith('INSERT INTO revenue_reports'));
    expect(insert!.params[9]).toBe('emp-1');
  });

  it('Employee không duyệt được, Director duyệt được', async () => {
    const existing = { id: 'v-1', authorId: 'other', department: 'Engineering', status: 'Pending Director', approvedBy: null, approvedAt: null, managerFeedback: null, directorFeedback: null };
    const dbEmp = revenueDb({ ...existing });
    const appEmp = authApp('/api/revenue-reports', revenueRoutes(dbEmp));
    expect((await request(appEmp).put('/api/revenue-reports/v-1').set('Authorization', `Bearer ${tokenFor(employee)}`).send({ status: 'Approved' })).status).toBe(403);
    const dbDir = revenueDb({ ...existing });
    const appDir = authApp('/api/revenue-reports', revenueRoutes(dbDir));
    const ok = await request(appDir).put('/api/revenue-reports/v-1').set('Authorization', `Bearer ${tokenFor(director)}`).send({ title: 'DT', status: 'Approved' });
    expect(ok.status).toBe(200);
    const update = dbDir.runs.find((r) => r.sql.startsWith('UPDATE revenue_reports'));
    expect(update!.params[11]).toBe('dir-1');
  });
});
