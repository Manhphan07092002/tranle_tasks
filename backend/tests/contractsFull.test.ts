import crypto from 'crypto';
import express from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { contractRoutes } from '../routes/contracts.js';
import { requireAuth } from '../middleware/auth.js';

const secret = crypto.randomBytes(32).toString('hex');
process.env.JWT_SECRET = secret;

const employee = { id: 'emp-1', name: 'Emp', email: 'e@t.t', role: 'Employee', department: 'Engineering', avatar: '', permissions: [] as string[] };
const managerEng = { ...employee, id: 'mgr-1', role: 'Manager' };
const managerSales = { ...employee, id: 'mgr-2', role: 'Manager', department: 'Sales' };
const admin = { ...employee, id: 'admin-1', role: 'Admin', permissions: ['admin_panel'] };
const tokenFor = (u: typeof employee) => jwt.sign(u, secret);

function contractsDb(opts: {
  existingNumber?: string | null;
  existingContract?: any;
  managers?: any[];
  deptUsers?: any[];
} = {}) {
  const runs: Array<{ sql: string; params: unknown[] }> = [];
  return {
    runs,
    all: async (sql: string) => {
      if (sql.includes("role = 'Manager'")) return opts.managers || [];
      if (sql.includes('FROM users WHERE department')) return opts.deptUsers || [];
      if (sql.includes('FROM documents')) return [];
      if (sql.includes('FROM tasks WHERE contractId')) return [];
      if (sql.includes('FROM revenue_reports')) return [];
      if (sql.includes('FROM contracts') && sql.includes('invoiceDate')) return [];
      if (sql.includes('contract_links')) return [];
      return [];
    },
    get: async (sql: string, params: unknown[] = []) => {
      if (sql.includes('FROM contracts WHERE contractNumber')) {
        return opts.existingNumber ? { id: 'dup' } : undefined;
      }
      if (sql.includes('FROM contracts WHERE id = ?')) {
        return opts.existingContract ? { ...opts.existingContract } : undefined;
      }
      if (sql.includes('FROM products WHERE name')) return undefined;
      if (sql.includes('FROM departments')) return {};
      return undefined;
    },
    run: async (sql: string, params: unknown[] = []) => {
      runs.push({ sql, params });
      return { changes: 1 };
    },
  };
}

const baseBody = {
  contractNumber: 'HD-001', clientName: 'Client A', contractName: 'Du an A',
  products: [], department: 'Engineering', status: 'draft', contractType: 'output',
};

function appFor(db: ReturnType<typeof contractsDb>) {
  const app = express();
  app.use(express.json());
  app.use('/api/contracts', requireAuth, contractRoutes(db));
  return app;
}

describe('contracts create', () => {
  it('thiếu trường bắt buộc thì 400', async () => {
    const app = appFor(contractsDb());
    expect((await request(app).post('/api/contracts').set('Authorization', `Bearer ${tokenFor(employee)}`).send({})).status).toBe(400);
    expect((await request(app).post('/api/contracts').set('Authorization', `Bearer ${tokenFor(employee)}`).send({ ...baseBody, contractNumber: '' })).status).toBe(400);
  });

  it('trùng số hợp đồng thì 400', async () => {
    const app = appFor(contractsDb({ existingNumber: 'HD-001' }));
    const res = await request(app).post('/api/contracts').set('Authorization', `Bearer ${tokenFor(employee)}`).send(baseBody);
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('đã tồn tại');
  });

  it('createdBy/department ép từ JWT, bỏ qua body giả mạo', async () => {
    const db = contractsDb();
    const app = appFor(db);
    const res = await request(app).post('/api/contracts').set('Authorization', `Bearer ${tokenFor(employee)}`).send({ ...baseBody, createdBy: 'victim-admin', department: 'Sales' });
    expect(res.status).toBe(201);
    const insert = db.runs.find((r) => r.sql.startsWith('INSERT INTO contracts'));
    expect(insert!.params[11]).toBe('emp-1');
    expect(insert!.params[10]).toBe('Engineering');
  });

  it('nhân viên chỉ tạo được draft/pending', async () => {
    const app = appFor(contractsDb());
    const res = await request(app).post('/api/contracts').set('Authorization', `Bearer ${tokenFor(employee)}`).send({ ...baseBody, status: 'completed' });
    expect(res.status).toBe(400);
  });

  it('tạo thành công sinh task + log, không leak detail khi lỗi', async () => {
    const db = contractsDb();
    const app = appFor(db);
    const res = await request(app).post('/api/contracts').set('Authorization', `Bearer ${tokenFor(employee)}`).send(baseBody);
    expect(res.status).toBe(201);
    expect(res.body.id).toBeTruthy();
    expect(db.runs.some((r) => r.sql.startsWith('INSERT INTO tasks'))).toBe(true);
  });
});

describe('contracts update/approve', () => {
  const owned = { id: 'c-1', createdBy: 'emp-1', status: 'draft', department: 'Engineering', approvalFeedback: null, docAccountantUserId: null, docAccountantStatus: null, contractName: 'A', contractNumber: 'HD-001' };

  it('người ngoài không sửa được', async () => {
    const app = appFor(contractsDb({ existingContract: { ...owned, createdBy: 'someone-else' } }));
    const res = await request(app).put('/api/contracts/c-1').set('Authorization', `Bearer ${tokenFor(employee)}`).send({ ...baseBody });
    expect(res.status).toBe(403);
  });

  it('TP khác phòng không duyệt được, Admin duyệt được', async () => {
    const target = { createdBy: 'other', contractName: 'A', contractNumber: 'HD-001', department: 'Engineering' };
    const appSales = appFor(contractsDb({ existingContract: target }));
    expect((await request(appSales).put('/api/contracts/c-1/approve').set('Authorization', `Bearer ${tokenFor(managerSales)}`)).status).toBe(403);
    const appAdmin = appFor(contractsDb({ existingContract: target }));
    expect((await request(appAdmin).put('/api/contracts/c-1/approve').set('Authorization', `Bearer ${tokenFor(admin)}`)).status).toBe(200);
    const appEng = appFor(contractsDb({ existingContract: target }));
    expect((await request(appEng).put('/api/contracts/c-1/approve').set('Authorization', `Bearer ${tokenFor(managerEng)}`)).status).toBe(200);
  });

  it('reject cần lý do, cancel-pending cần lý do', async () => {
    const target = { createdBy: 'other', contractName: 'A', contractNumber: 'HD-001', department: 'Engineering' };
    const app = appFor(contractsDb({ existingContract: target }));
    expect((await request(app).put('/api/contracts/c-1/reject').set('Authorization', `Bearer ${tokenFor(admin)}`).send({})).status).toBe(400);
    expect((await request(app).put('/api/contracts/c-1/reject').set('Authorization', `Bearer ${tokenFor(admin)}`).send({ feedback: 'Sai giá' })).status).toBe(200);
  });

  it('chỉ kế toán bàn giao mới confirm-receipt được', async () => {
    const target = { docAccountantUserId: 'acc-1', docAccountantStatus: 'pending', contractName: 'A', contractNumber: 'HD-001', createdBy: 'emp-1', contractType: 'output' };
    const app = appFor(contractsDb({ existingContract: target }));
    expect((await request(app).put('/api/contracts/c-1/confirm-receipt').set('Authorization', `Bearer ${tokenFor(employee)}`)).status).toBe(403);
  });

  it('xóa: người ngoài 403, chủ sở hữu 200', async () => {
    const appOther = appFor(contractsDb({ existingContract: { createdBy: 'someone-else', contractNumber: 'HD-001' } }));
    expect((await request(appOther).delete('/api/contracts/c-1').set('Authorization', `Bearer ${tokenFor(employee)}`)).status).toBe(403);
    const appOwn = appFor(contractsDb({ existingContract: { createdBy: 'emp-1', contractNumber: 'HD-001' } }));
    expect((await request(appOwn).delete('/api/contracts/c-1').set('Authorization', `Bearer ${tokenFor(employee)}`)).status).toBe(200);
  });
});
