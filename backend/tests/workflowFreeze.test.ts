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
const admin = { ...employee, id: 'adm-1', role: 'Admin' };
const tokenFor = (u: typeof employee) => jwt.sign(u, secret);
const authApp = (prefix: string, router: express.Router) => {
  const app = express();
  app.use(express.json());
  app.use(prefix, requireAuth, router);
  return app;
};

type Run = { sql: string; params: unknown[] };

function dbFactory(table: string, existing: any = null) {
  const runs: Run[] = [];
  return {
    runs,
    all: async () => [],
    get: async (sql: string) => (sql.includes(`FROM ${table}`) ? (existing ? { ...existing } : undefined) : undefined),
    run: async (sql: string, params: unknown[] = []) => { runs.push({ sql, params }); return { changes: 1 }; },
  };
}

const insertOf = (runs: Run[], prefix: string) => runs.find((r) => r.sql.startsWith(prefix))!;
const logsOf = (runs: Run[], action: string) => runs.filter((r) => r.sql.startsWith('INSERT INTO activity_logs') && r.params[2] === action);

const approvedReport = (over: Record<string, any> = {}) => ({
  id: 'r-1', authorId: 'emp-1', department: 'Engineering', status: 'Approved',
  title: 'BC tháng 1', content: JSON.stringify({ summary: 'doanh thu 100tr' }),
  submittedAt: '2026-01-05T00:00:00.000Z',
  approvedAt: '2026-01-06T00:00:00.000Z', approvedBy: 'dir-1',
  directorFeedback: null, managerFeedback: null, ...over,
});

const approvedRevenue = (over: Record<string, any> = {}) => ({
  id: 'v-1', authorId: 'emp-1', department: 'Engineering', status: 'Approved',
  title: 'DT tháng 1', content: '{"summary":"A"}', reportType: 'monthly',
  periodStart: '2026-01-01', periodEnd: '2026-01-31',
  totalPreTax: 100, totalDelivered: 80, totalCumulative: 50,
  submittedAt: '2026-01-05T00:00:00.000Z',
  approvedAt: '2026-01-06T00:00:00.000Z', approvedBy: 'dir-1',
  managerFeedback: null, directorFeedback: null, generationMode: 'manual', ...over,
});

describe('Q1 — bản ghi Approved không còn sửa được nội dung', () => {
  it('Giám đốc sửa nội dung báo cáo đã duyệt thì bị chặn', async () => {
    const db = dbFactory('reports', approvedReport());
    const app = authApp('/api/reports', reportRoutes(db));
    const res = await request(app).put('/api/reports/r-1')
      .set('Authorization', `Bearer ${tokenFor(director)}`)
      .send({ title: 'BC tháng 1', content: '{"summary":"con so tien bi giam"}', status: 'Approved' });
    expect(res.status).toBe(409);
    expect(res.body.error).toContain('content');
    // Không được chạm vào bản ghi.
    expect(db.runs.some((r) => r.sql.startsWith('UPDATE reports'))).toBe(false);
  });

  it('Giám đốc đổi tiêu đề báo cáo đã duyệt thì bị chặn', async () => {
    const db = dbFactory('reports', approvedReport());
    const app = authApp('/api/reports', reportRoutes(db));
    const res = await request(app).put('/api/reports/r-1')
      .set('Authorization', `Bearer ${tokenFor(director)}`)
      .send({ title: 'BC tháng 1 (sửa lại)', status: 'Approved' });
    expect(res.status).toBe(409);
    expect(res.body.error).toContain('title');
  });

  it('Trưởng phòng không sửa được nội dung báo cáo đã duyệt của phòng mình', async () => {
    const db = dbFactory('reports', approvedReport());
    const app = authApp('/api/reports', reportRoutes(db));
    const res = await request(app).put('/api/reports/r-1')
      .set('Authorization', `Bearer ${tokenFor(manager)}`)
      .send({ content: '{"summary":"tuSua"}', status: 'Approved' });
    expect(res.status).toBe(409);
  });

  it('sửa số liệu báo cáo doanh thu đã duyệt thì bị chặn', async () => {
    const db = dbFactory('revenue_reports', approvedRevenue());
    const app = authApp('/api/revenue-reports', revenueRoutes(db));
    const res = await request(app).put('/api/revenue-reports/v-1')
      .set('Authorization', `Bearer ${tokenFor(director)}`)
      .send({ totalPreTax: 999999, status: 'Approved' });
    expect(res.status).toBe(409);
    expect(res.body.error).toContain('totalPreTax');
    expect(db.runs.some((r) => r.sql.startsWith('UPDATE revenue_reports'))).toBe(false);
  });

  it('định dạng tiền khác nhau không bị coi là sửa số liệu', async () => {
    const db = dbFactory('revenue_reports', approvedRevenue());
    const app = authApp('/api/revenue-reports', revenueRoutes(db));
    const res = await request(app).put('/api/revenue-reports/v-1')
      .set('Authorization', `Bearer ${tokenFor(director)}`)
      .send({ totalPreTax: '100', totalDelivered: 80, totalCumulative: '50.00', status: 'Approved' });
    expect(res.status).toBe(200);
  });
});

describe('Q1 — mở lại bản ghi Approved là hành động có chủ đích', () => {
  it('Trưởng phòng mở lại báo cáo đã duyệt thì bị chặn', async () => {
    const db = dbFactory('reports', approvedReport());
    const app = authApp('/api/reports', reportRoutes(db));
    const res = await request(app).put('/api/reports/r-1')
      .set('Authorization', `Bearer ${tokenFor(manager)}`)
      .send({ status: 'Pending', content: '{"summary":"SuaLai"}' });
    expect(res.status).toBe(403);
    expect(res.body.error).toContain('mở lại');
  });

  it('Giám đốc mở lại được, đồng thời xoá approvedBy/approvedAt và ghi audit', async () => {
    const db = dbFactory('reports', approvedReport());
    const app = authApp('/api/reports', reportRoutes(db));
    const res = await request(app).put('/api/reports/r-1')
      .set('Authorization', `Bearer ${tokenFor(director)}`)
      .send({ status: 'Pending', content: '{"summary":"SuaLai"}' });
    expect(res.status).toBe(200);
    const update = insertOf(db.runs, 'UPDATE reports');
    expect(update.params[2]).toBe('Pending');
    // approvedAt (index 4) và approvedBy (index 5) phải NULL, không giữ verdict cũ.
    expect(update.params[4]).toBeNull();
    expect(update.params[5]).toBeNull();
    expect(logsOf(db.runs, 'report.reopened')).toHaveLength(1);
  });

  it('Admin cũng mở lại được, và báo cáo doanh thu cũng vậy', async () => {
    const db = dbFactory('revenue_reports', approvedRevenue());
    const app = authApp('/api/revenue-reports', revenueRoutes(db));
    const res = await request(app).put('/api/revenue-reports/v-1')
      .set('Authorization', `Bearer ${tokenFor(admin)}`)
      .send({ status: 'Pending Director', totalPreTax: 120 });
    expect(res.status).toBe(200);
    const update = insertOf(db.runs, 'UPDATE revenue_reports');
    expect(update.params[8]).toBe('Pending Director');
    expect(update.params[5]).toBe(120);
    expect(update.params[10]).toBeNull();  // approvedAt
    expect(update.params[11]).toBeNull();  // approvedBy
    expect(logsOf(db.runs, 'revenue_report.reopened')).toHaveLength(1);
  });
});

describe('Q1 — lưu lại y nguyên bản Approved không phải là gian lận', () => {
  it('lưu lại không đổi gì thì giữ nguyên người duyệt và thời điểm duyệt', async () => {
    const db = dbFactory('reports', approvedReport());
    const app = authApp('/api/reports', reportRoutes(db));
    const res = await request(app).put('/api/reports/r-1')
      .set('Authorization', `Bearer ${tokenFor(director)}`)
      .send({ title: 'BC tháng 1', content: JSON.stringify({ summary: 'doanh thu 100tr' }), status: 'Approved' });
    expect(res.status).toBe(200);
    const update = insertOf(db.runs, 'UPDATE reports');
    // Trước đây payload ghi "Approved" là đủ để đóng dấu lại: approvedAt chạy
    // theo thời điểm lưu và approvedBy thành người vừa bấm Save.
    expect(update.params[4]).toBe('2026-01-06T00:00:00.000Z');
    expect(update.params[5]).toBe('dir-1');
  });

  it('lưu lại báo cáo doanh thu đã duyệt cũng giữ sổ duyệt', async () => {
    const db = dbFactory('revenue_reports', approvedRevenue());
    const app = authApp('/api/revenue-reports', revenueRoutes(db));
    await request(app).put('/api/revenue-reports/v-1')
      .set('Authorization', `Bearer ${tokenFor(director)}`)
      .send({ status: 'Approved' })
      .expect(200);
    const update = insertOf(db.runs, 'UPDATE revenue_reports');
    expect(update.params[10]).toBe('2026-01-06T00:00:00.000Z');
    expect(update.params[11]).toBe('dir-1');
  });
});

describe('Q1 — trường không gửi lên nghĩa là giữ nguyên, không phải xoá', () => {
  it('PUT thiếu content không xoá nội dung báo cáo', async () => {
    const db = dbFactory('reports', { ...approvedReport(), status: 'Pending', approvedAt: null, approvedBy: null });
    const app = authApp('/api/reports', reportRoutes(db));
    const res = await request(app).put('/api/reports/r-1')
      .set('Authorization', `Bearer ${tokenFor(employee)}`)
      .send({ title: 'BC tháng 1', status: 'Pending' });
    expect(res.status).toBe(200);
    expect(insertOf(db.runs, 'UPDATE reports').params[1]).toBe(approvedReport().content);
  });

  it('PUT thiếu số liệu không reset báo cáo doanh thu về 0', async () => {
    const db = dbFactory('revenue_reports', { ...approvedRevenue(), status: 'Pending Director', approvedAt: null, approvedBy: null });
    const app = authApp('/api/revenue-reports', revenueRoutes(db));
    const res = await request(app).put('/api/revenue-reports/v-1')
      .set('Authorization', `Bearer ${tokenFor(employee)}`)
      .send({ title: 'DT tháng 1', status: 'Pending Director' });
    expect(res.status).toBe(200);
    const update = insertOf(db.runs, 'UPDATE revenue_reports');
    // totalPreTax / totalDelivered / totalCumulative ở index 5, 6, 7.
    expect(update.params.slice(5, 8)).toEqual([100, 80, 50]);
  });

  it('PUT thiếu title không xoá tiêu đề', async () => {
    const db = dbFactory('reports', { ...approvedReport(), status: 'Pending', approvedAt: null, approvedBy: null });
    const app = authApp('/api/reports', reportRoutes(db));
    await request(app).put('/api/reports/r-1')
      .set('Authorization', `Bearer ${tokenFor(employee)}`)
      .send({ status: 'Pending' })
      .expect(200);
    expect(insertOf(db.runs, 'UPDATE reports').params[0]).toBe('BC tháng 1');
  });
});

describe('Q1 — luồng trả lại rồi sửa rồi gửi lại vẫn chạy', () => {
  it('báo cáo bị trả về sửa được, rồi duyệt lại ghi đúng sổ duyệt mới', async () => {
    const db = dbFactory('reports', approvedReport({ status: 'Rejected', approvedAt: '2026-01-06T00:00:00.000Z', approvedBy: 'dir-1', directorFeedback: 'so lieu sai' }));
    const app = authApp('/api/reports', reportRoutes(db));
    // Tác giả sửa và gửi lại — form luôn echo directorFeedback nên mới có hồi quy.
    const resubmit = await request(app).put('/api/reports/r-1')
      .set('Authorization', `Bearer ${tokenFor(employee)}`)
      .send({ title: 'BC tháng 1', content: '{"summary":"da sua"}', status: 'Pending', directorFeedback: 'so lieu sai' });
    expect(resubmit.status).toBe(200);
    // Tác giả không được tự xoá nhận xét của người duyệt.
    expect(insertOf(db.runs, 'UPDATE reports').params[6]).toBe('so lieu sai');

    // Duyệt lại: đổi trạng thái thật nên đóng dấu mới.
    const approved = await request(app).put('/api/reports/r-1')
      .set('Authorization', `Bearer ${tokenFor(director)}`)
      .send({ title: 'BC tháng 1', content: '{"summary":"da sua"}', status: 'Approved' });
    expect(approved.status).toBe(200);
    const runs = db.runs.filter((r) => r.sql.startsWith('UPDATE reports'));
    expect(runs[1].params[4]).not.toBe('2026-01-06T00:00:00.000Z');
    expect(runs[1].params[5]).toBe('dir-1');
  });
});
