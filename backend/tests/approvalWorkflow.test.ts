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
const viewer = { ...employee, id: 'vw-1', role: 'Employee', permissions: ['view_all_reports'] };
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
  const queries: Array<{ sql: string; params: unknown[] }> = [];
  return {
    runs,
    queries,
    all: async (sql: string, params: unknown[] = []) => { queries.push({ sql, params }); return []; },
    get: async (sql: string) => {
      if (sql.includes(`FROM ${table}`)) return existing ? { ...existing } : undefined;
      return undefined;
    },
    run: async (sql: string, params: unknown[] = []) => { runs.push({ sql, params }); return { changes: 1 }; },
  };
}
const reportsDb = (e?: any) => dbFactory('reports', e);
const revenueDb = (e?: any) => dbFactory('revenue_reports', e);

/** Index of `status` in the INSERT/UPDATE column order. */
const REPORT_STATUS_IDX = 5;
const REVENUE_STATUS_IDX = 11;

const insertOf = (runs: Run[], prefix: string) => runs.find((r) => r.sql.startsWith(prefix))!;

describe('H1 — không tạo được bản ghi đã duyệt ngay từ đầu', () => {
  it('reports: status Approved trong POST bị hạ về Draft', async () => {
    const db = reportsDb();
    const app = authApp('/api/reports', reportRoutes(db));
    const res = await request(app).post('/api/reports')
      .set('Authorization', `Bearer ${tokenFor(employee)}`)
      .send({ id: 'r-1', title: 'T', content: '{}', status: 'Approved', approvedBy: 'fake' });
    expect(res.status).toBe(201);
    const insert = insertOf(db.runs, 'INSERT INTO reports');
    expect(insert.params[REPORT_STATUS_IDX]).toBe('Draft');
    // approvedBy/approvedAt vẫn phải NULL: sổ duyệt không được ghi dấu giả.
    expect(insert.params[9]).toBeNull();
    expect(insert.params[8]).toBeNull();
  });

  it('reports: status Rejected trong POST cũng bị hạ về Draft', async () => {
    const db = reportsDb();
    const app = authApp('/api/reports', reportRoutes(db));
    await request(app).post('/api/reports')
      .set('Authorization', `Bearer ${tokenFor(employee)}`)
      .send({ id: 'r-2', title: 'T', content: '{}', status: 'Rejected' });
    expect(insertOf(db.runs, 'INSERT INTO reports').params[REPORT_STATUS_IDX]).toBe('Draft');
  });

  it('reports: giữ nguyên các trạng thái hợp lệ khi tác giả gửi duyệt', async () => {
    for (const status of ['Draft', 'Pending', 'Pending Manager', 'Pending Director']) {
      const db = reportsDb();
      const app = authApp('/api/reports', reportRoutes(db));
      const res = await request(app).post('/api/reports')
        .set('Authorization', `Bearer ${tokenFor(employee)}`)
        .send({ id: 'r-3', title: 'T', content: '{}', status });
      expect(res.status, `status ${status}`).toBe(201);
      expect(insertOf(db.runs, 'INSERT INTO reports').params[REPORT_STATUS_IDX], `status ${status}`).toBe(status);
    }
  });

  it('revenue: status Approved trong POST bị hạ về Draft', async () => {
    const db = revenueDb();
    const app = authApp('/api/revenue-reports', revenueRoutes(db));
    const res = await request(app).post('/api/revenue-reports')
      .set('Authorization', `Bearer ${tokenFor(employee)}`)
      .send({ id: 'v-1', title: 'DT', reportType: 'monthly', periodStart: '2026-01-01', periodEnd: '2026-01-31', status: 'Approved' });
    expect(res.status).toBe(201);
    expect(insertOf(db.runs, 'INSERT INTO revenue_reports').params[REVENUE_STATUS_IDX]).toBe('Draft');
  });

  it('revenue: giữ trạng thái Pending Manager hợp lệ', async () => {
    const db = revenueDb();
    const app = authApp('/api/revenue-reports', revenueRoutes(db));
    await request(app).post('/api/revenue-reports')
      .set('Authorization', `Bearer ${tokenFor(employee)}`)
      .send({ id: 'v-2', title: 'DT', reportType: 'monthly', periodStart: '2026-01-01', periodEnd: '2026-01-31', status: 'Pending Manager' });
    expect(insertOf(db.runs, 'INSERT INTO revenue_reports').params[REVENUE_STATUS_IDX]).toBe('Pending Manager');
  });
});

describe('H2/H3 — /archive phải có phạm vi như /', () => {
  it('reports: employee khác phòng không đọc được toàn bộ archive', async () => {
    const db = reportsDb();
    const app = authApp('/api/reports', reportRoutes(db));
    await request(app).get('/api/reports/archive').set('Authorization', `Bearer ${tokenFor(employee)}`);
    const q = db.queries.at(-1)!;
    expect(q.sql).toContain('authorId = ? OR department = ?');
    expect(q.params).toEqual(['emp-1', 'Engineering']);
    expect(q.sql).toContain('LIMIT');
  });

  it('reports: người có view_all_reports thấy toàn bộ', async () => {
    const db = reportsDb();
    const app = authApp('/api/reports', reportRoutes(db));
    await request(app).get('/api/reports/archive').set('Authorization', `Bearer ${tokenFor(viewer)}`);
    const q = db.queries.at(-1)!;
    expect(q.sql).not.toContain('authorId = ?');
    expect(q.params).toEqual([]);
  });

  it('revenue: archive cũng được scope', async () => {
    const db = revenueDb();
    const app = authApp('/api/revenue-reports', revenueRoutes(db));
    await request(app).get('/api/revenue-reports/archive').set('Authorization', `Bearer ${tokenFor(employee)}`);
    const q = db.queries.at(-1)!;
    expect(q.sql).toContain('authorId = ? OR department = ?');
    expect(q.params).toEqual(['emp-1', 'Engineering']);
    expect(q.sql).toContain('LIMIT');
  });
});

describe('H4 — không ai tự duyệt bản ghi của chính mình', () => {
  it('reports: Manager là tác giả thì không tự duyệt', async () => {
    const db = reportsDb({ id: 'r-1', authorId: 'mgr-1', department: 'Engineering', status: 'Pending Manager', approvedAt: null, approvedBy: null, directorFeedback: null, managerFeedback: null });
    const app = authApp('/api/reports', reportRoutes(db));
    const res = await request(app).put('/api/reports/r-1').set('Authorization', `Bearer ${tokenFor(manager)}`).send({ title: 'x', status: 'Approved' });
    expect(res.status).toBe(403);
    expect(db.runs.some((r) => r.sql.startsWith('UPDATE reports'))).toBe(false);
  });

  it('reports: Director là tác giả thì không tự duyệt', async () => {
    const db = reportsDb({ id: 'r-1', authorId: 'dir-1', department: 'Engineering', status: 'Pending Director', approvedAt: null, approvedBy: null, directorFeedback: null, managerFeedback: null });
    const app = authApp('/api/reports', reportRoutes(db));
    expect((await request(app).put('/api/reports/r-1').set('Authorization', `Bearer ${tokenFor(director)}`).send({ title: 'x', status: 'Approved' })).status).toBe(403);
  });

  it('reports: Manager tự từ chối báo cáo của mình cũng bị chặn', async () => {
    const db = reportsDb({ id: 'r-1', authorId: 'mgr-1', department: 'Engineering', status: 'Pending Manager', approvedAt: null, approvedBy: null, directorFeedback: null, managerFeedback: null });
    const app = authApp('/api/reports', reportRoutes(db));
    expect((await request(app).put('/api/reports/r-1').set('Authorization', `Bearer ${tokenFor(manager)}`).send({ title: 'x', status: 'Rejected' })).status).toBe(403);
  });

  it('revenue: Manager là tác giả thì không tự duyệt', async () => {
    const db = revenueDb({ id: 'v-1', authorId: 'mgr-1', department: 'Engineering', status: 'Pending Manager', approvedBy: null, approvedAt: null, managerFeedback: null, directorFeedback: null });
    const app = authApp('/api/revenue-reports', revenueRoutes(db));
    const res = await request(app).put('/api/revenue-reports/v-1').set('Authorization', `Bearer ${tokenFor(manager)}`).send({ title: 'DT', status: 'Approved' });
    expect(res.status).toBe(403);
    expect(db.runs.some((r) => r.sql.startsWith('UPDATE revenue_reports'))).toBe(false);
  });

  // Chặn nhầm dễ xảy ra nhất: "nộp duyệt" (Pending*) là hành động của tác giả,
  // chỉ "phê duyệt/từ chối" mới là phán quyết của người duyệt.
  it('revenue: Manager vẫn nộp được báo cáo của chính mình (Pending Manager)', async () => {
    const db = revenueDb({ id: 'v-1', authorId: 'mgr-1', department: 'Engineering', status: 'Draft', approvedBy: null, approvedAt: null, managerFeedback: null, directorFeedback: null, generationMode: 'manual' });
    const app = authApp('/api/revenue-reports', revenueRoutes(db));
    const res = await request(app).put('/api/revenue-reports/v-1')
      .set('Authorization', `Bearer ${tokenFor(manager)}`)
      .send({ title: 'DT', reportType: 'monthly', periodStart: '2026-01-01', periodEnd: '2026-01-31', status: 'Pending Manager' });
    expect(res.status).toBe(200);
    expect(insertOf(db.runs, 'UPDATE revenue_reports').params[8]).toBe('Pending Manager');
  });

  it('reports: tác giả vẫn gửi duyệt được báo cáo nháp của chính mình', async () => {
    const db = reportsDb({ id: 'r-1', authorId: 'emp-1', department: 'Engineering', status: 'Draft', approvedAt: null, approvedBy: null, directorFeedback: null, managerFeedback: null });
    const app = authApp('/api/reports', reportRoutes(db));
    const res = await request(app).put('/api/reports/r-1').set('Authorization', `Bearer ${tokenFor(employee)}`).send({ title: 'x', status: 'Pending' });
    expect(res.status).toBe(200);
    expect(insertOf(db.runs, 'UPDATE reports').params[2]).toBe('Pending');
  });
});

describe('H5 — Trưởng phòng chỉ thao tác được trong phòng mình', () => {
  it('reports: Manager phòng A không sửa được báo cáo phòng B', async () => {
    const db = reportsDb({ id: 'r-1', authorId: 'other', department: 'Sales', status: 'Draft', approvedAt: null, approvedBy: null, directorFeedback: null, managerFeedback: null });
    const app = authApp('/api/reports', reportRoutes(db));
    // Không đổi status, không gửi feedback: đây là đường sửa nội dung thuần.
    const res = await request(app).put('/api/reports/r-1').set('Authorization', `Bearer ${tokenFor(manager)}`).send({ title: 'đã sửa', status: 'Draft' });
    expect(res.status).toBe(403);
  });

  it('reports: Manager cùng phòng vẫn sửa được', async () => {
    const db = reportsDb({ id: 'r-1', authorId: 'other', department: 'Engineering', status: 'Draft', approvedAt: null, approvedBy: null, directorFeedback: null, managerFeedback: null });
    const app = authApp('/api/reports', reportRoutes(db));
    expect((await request(app).put('/api/reports/r-1').set('Authorization', `Bearer ${tokenFor(manager)}`).send({ title: 'ok', status: 'Draft' })).status).toBe(200);
  });

  it('revenue: Manager phòng A không sửa được báo cáo doanh thu phòng B', async () => {
    const db = revenueDb({ id: 'v-1', authorId: 'other', department: 'Sales', status: 'Draft', approvedBy: null, approvedAt: null, managerFeedback: null, directorFeedback: null });
    const app = authApp('/api/revenue-reports', revenueRoutes(db));
    expect((await request(app).put('/api/revenue-reports/v-1').set('Authorization', `Bearer ${tokenFor(manager)}`).send({ title: 'x', status: 'Draft' })).status).toBe(403);
  });
});

describe('H6a — cột phản hồi của người duyệt không do tác giả ghi', () => {
  it('reports: tác giả gửi directorFeedback giả thì giá trị bị bỏ qua', async () => {
    const db = reportsDb({
      id: 'r-1', authorId: 'emp-1', department: 'Engineering', status: 'Draft',
      approvedAt: null, approvedBy: null, directorFeedback: 'phê duyệt rồi nhé', managerFeedback: 'ok rồi',
    });
    const app = authApp('/api/reports', reportRoutes(db));
    const res = await request(app).put('/api/reports/r-1')
      .set('Authorization', `Bearer ${tokenFor(employee)}`)
      .send({ title: 'x', status: 'Draft', directorFeedback: 'phê duyệt rồi nhé', managerFeedback: 'ok rồi' });
    // Không bị chặn: lưu nháp vẫn phải hoạt động.
    expect(res.status).toBe(200);
    const update = insertOf(db.runs, 'UPDATE reports');
    expect(update.params[6]).toBe('phê duyệt rồi nhé'); // giữ nguyên giá trị cũ
    expect(update.params[7]).toBe('ok rồi');
  });

  it('reports: Director thật sự mới ghi được directorFeedback', async () => {
    const db = reportsDb({
      id: 'r-1', authorId: 'other', department: 'Engineering', status: 'Pending Director',
      approvedAt: null, approvedBy: null, directorFeedback: null, managerFeedback: null,
    });
    const app = authApp('/api/reports', reportRoutes(db));
    const res = await request(app).put('/api/reports/r-1')
      .set('Authorization', `Bearer ${tokenFor(director)}`)
      .send({ title: 'x', status: 'Pending Director', directorFeedback: 'Số liệu chưa khớp' });
    expect(res.status).toBe(200);
    expect(insertOf(db.runs, 'UPDATE reports').params[6]).toBe('Số liệu chưa khớp');
  });

  it('reports: Manager phòng khác không ghi được managerFeedback', async () => {
    const db = reportsDb({
      id: 'r-1', authorId: 'other', department: 'Sales', status: 'Draft',
      approvedAt: null, approvedBy: null, directorFeedback: null, managerFeedback: 'gốc',
    });
    const app = authApp('/api/reports', reportRoutes(db));
    await request(app).put('/api/reports/r-1')
      .set('Authorization', `Bearer ${tokenFor(manager)}`)
      .send({ title: 'x', status: 'Draft', managerFeedback: 'giả' })
      .expect(403);
  });

  it('revenue: tác giả gửi directorFeedback giả thì bị bỏ qua', async () => {
    const db = revenueDb({
      id: 'v-1', authorId: 'emp-1', department: 'Engineering', status: 'Draft',
      approvedBy: null, approvedAt: null, managerFeedback: 'gốc TP', directorFeedback: null,
    });
    const app = authApp('/api/revenue-reports', revenueRoutes(db));
    const res = await request(app).put('/api/revenue-reports/v-1')
      .set('Authorization', `Bearer ${tokenFor(employee)}`)
      .send({ title: 'DT', status: 'Draft', directorFeedback: 'GĐ đã duyệt', managerFeedback: 'TP đã duyệt' });
    expect(res.status).toBe(200);
    const update = insertOf(db.runs, 'UPDATE revenue_reports');
    expect(update.params[12]).toBe('gốc TP');
    expect(update.params[13]).toBeNull();
  });
});

describe('H4 (contracts) — không ai tự phê duyệt hợp đồng của mình', () => {
  // contracts.ts giữ auth riêng theo route; ta chỉ cần chứng minh gate chặn
  // người tạo hợp đồng dù có quyền Trưởng phòng hay Admin.
  const managerOfDept = { id: 'mgr-1', name: 'Mgr', email: 'm@t.t', role: 'Manager', department: 'Engineering', avatar: '', permissions: [] as string[] };
  const contractRow = { createdBy: 'mgr-1', contractName: 'HD', contractNumber: 'HD-1', department: 'Engineering' };

  const contractApp = (existing: any) => {
    const runs: Run[] = [];
    const db = {
      runs,
      all: async () => [],
      get: async (sql: string) => (sql.includes('FROM contracts') ? existing : undefined),
      run: async (sql: string, params: unknown[] = []) => { runs.push({ sql, params }); return { changes: 1 }; },
    };
    const app = express();
    app.use(express.json());
    app.use('/api/contracts', requireAuth, (req, _res, next) => { (req as any).user = managerOfDept; next(); }, contractRoutes(db));
    return { app, runs };
  };

  it('approve bị chặn khi người gọi chính là createdBy', async () => {
    const { app, runs } = contractApp(contractRow);
    const res = await request(app).put('/api/contracts/c-1/approve').set('Authorization', `Bearer ${tokenFor(managerOfDept)}`);
    expect(res.status).toBe(403);
    expect(runs.some((r) => r.sql.startsWith('UPDATE contracts'))).toBe(false);
  });

  it('reject bị chặn khi người gọi chính là createdBy', async () => {
    const { app, runs } = contractApp(contractRow);
    const res = await request(app).put('/api/contracts/c-1/reject').set('Authorization', `Bearer ${tokenFor(managerOfDept)}`).send({ feedback: 'không đạt' });
    expect(res.status).toBe(403);
    expect(runs.some((r) => r.sql.startsWith('UPDATE contracts'))).toBe(false);
  });

  it('cancel-pending bị chặn khi người gọi chính là createdBy', async () => {
    const { app, runs } = contractApp(contractRow);
    const res = await request(app).put('/api/contracts/c-1/cancel-pending').set('Authorization', `Bearer ${tokenFor(managerOfDept)}`).send({ feedback: 'huỷ' });
    expect(res.status).toBe(403);
    expect(runs.some((r) => r.sql.startsWith('UPDATE contracts'))).toBe(false);
  });
});

// Imported last so the shared helpers above stay readable.
import { contractRoutes } from '../routes/contracts.js';