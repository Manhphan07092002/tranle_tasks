import crypto from 'crypto';
import express from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mailRoutes } from '../routes/mail.js';
import { projectRoutes } from '../routes/projects.js';
import { revenueRoutes } from '../routes/revenue.js';
import { requireAuth, setAuthDb } from '../middleware/auth.js';
import { ensureBody } from '../middleware/ensureBody.js';

const secret = crypto.randomBytes(32).toString('hex');
process.env.JWT_SECRET = secret;

const employee = {
  id: 'emp-1', name: 'Emp', email: 'e@t.t', role: 'Employee',
  department: 'Engineering', avatar: '', permissions: [] as string[],
};
const tokenFor = (u: typeof employee) => jwt.sign(u, secret);
const authApp = (prefix: string, router: express.Router) => {
  const app = express();
  app.use(express.json());
  app.use(ensureBody);
  app.use(prefix, requireAuth, router);
  return app;
};

// A representative MySQL failure: leaks table name, column name, index name and
// the offending value if it ever reaches the client.
const SQL_LEAK = "ER_DUP_ENTRY: Duplicate entry 'x@y.z' for key 'reports.authorId' (table `tranletask`.`reports`)";

const throwingDb = {
  all: async () => { throw new Error(SQL_LEAK); },
  get: async () => { throw new Error(SQL_LEAK); },
  run: async () => { throw new Error(SQL_LEAK); },
};

const assertNoInternalLeak = (res: request.Response) => {
  const body = JSON.stringify(res.body ?? {});
  expect(res.status).toBe(500);
  // No raw driver text, and specifically no 'detail' passthrough.
  expect(body).not.toContain('detail');
  expect(body).not.toContain('ER_DUP_ENTRY');
  expect(body).not.toContain('Duplicate entry');
  expect(body).not.toContain('reports.authorId');
  expect(body).not.toContain('tranletask');
  // A generic message is still expected.
  expect(typeof res.body?.error).toBe('string');
};

describe('DB error không lọt ra client (D1/M12)', () => {
  beforeEach(() => {
    setAuthDb({ get: async () => employee } as any);
  });
  afterEach(() => {
    delete process.env.NODE_ENV;
  });

  it('POST /api/mail/provider không trả e.message', async () => {
    const app = authApp('/api/mail', mailRoutes(throwingDb));
    const res = await request(app)
      .get('/api/mail/provider')
      .set('Authorization', `Bearer ${tokenFor(employee)}`);
    assertNoInternalLeak(res);
  });

  it('POST /api/revenue-reports không trả detail', async () => {
    const app = authApp('/api/revenue-reports', revenueRoutes(throwingDb));
    const res = await request(app)
      .post('/api/revenue-reports')
      .set('Authorization', `Bearer ${tokenFor(employee)}`)
      .send({ title: 'BCP tháng 10', department: 'Engineering' });
    assertNoInternalLeak(res);
  });

  it('POST /api/projects và các route con không trả detail', async () => {
    const app = authApp('/api/projects', projectRoutes(throwingDb));
    const t = tokenFor(employee);
    const h = { Authorization: `Bearer ${t}` };

    assertNoInternalLeak(
      await request(app).post('/api/projects').set(h).send({ name: 'Dự án X' }),
    );
    assertNoInternalLeak(
      await request(app).post('/api/projects/p-1/reports').set(h).send({ title: 'Báo cáo', content: 'c' }),
    );
    assertNoInternalLeak(
      await request(app).post('/api/projects/p-1/milestones').set(h).send({ title: 'M1' }),
    );
  });
});

describe('DATABASE_URL bắt buộc ở production (D2)', () => {
  const originalUrl = process.env.DATABASE_URL;

  beforeEach(() => {
    delete process.env.DATABASE_URL;
  });
  afterEach(() => {
    if (originalUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = originalUrl;
    delete process.env.NODE_ENV;
  });

  it('refuse khởi động thay vì nối root không mật khẩu', async () => {
    process.env.NODE_ENV = 'production';
    const { initDbMysql } = await import('../db_mysql.js');
    // Phải ném TRƯỚC khi thử kết nối — tức không side-effect gì cả.
    await expect(initDbMysql()).rejects.toThrow(/DATABASE_URL is required/);
  });

  // Nhánh development (fallback root không mật khẩu) cố ý KHÔNG cover ở đây:
  // gọi initDbMysql() sẽ mở một kết nối MySQL thật, không phù hợp unit test.
  // Hành vi đó được bảo vệ bởi việc docker-compose luôn truyền DATABASE_URL
  // và .env.production.example yêu cầu NODE_ENV=production.
});