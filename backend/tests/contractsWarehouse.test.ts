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
const warehouse = { ...employee, id: 'wh-1', permissions: ['manage_warehouse'] };
const admin = { ...employee, id: 'admin-1', role: 'Admin', permissions: ['admin_panel'] };
const tokenFor = (u: typeof employee) => jwt.sign(u, secret);
const authApp = (prefix: string, router: express.Router) => {
  const app = express();
  app.use(express.json());
  app.use(prefix, requireAuth, router);
  return app;
};

type Run = { sql: string; params: unknown[] };

/** Role row lookup drives hasWarehouseAccess when the permission is not inline. */
function contractDb(rolePermissions: string | null = null) {
  const runs: Run[] = [];
  const db = {
    runs,
    get: async (sql: string) => {
      if (sql.includes('FROM roles')) return rolePermissions ? { permissions: rolePermissions } : undefined;
      if (sql.includes('FROM contracts WHERE id')) {
        return { id: 'c-1', contractNumber: 'HD-1', contractType: 'input', department: 'Engineering', createdBy: 'other' };
      }
      return undefined;
    },
    all: async () => [],
    run: async (sql: string, params: unknown[] = []) => { runs.push({ sql, params }); return { changes: 1 }; },
  };
  return db;
}

const touchesWarehouse = (runs: Run[]) =>
  runs.some((r) => r.sql.startsWith('DELETE FROM products') || r.sql.startsWith('INSERT INTO products') || r.sql.startsWith('UPDATE products'));

const inputContract = {
  contractNumber: 'HD-1',
  clientName: 'Khách A',
  contractName: 'DA 1',
  contractType: 'input',
  products: [{ name: 'Cáp', quantity: 10, unitPrice: 100 }],
};

describe('H7 — tạo/sửa hợp đồng không phải cửa sau vào kho', () => {
  it('nhân viên thường tạo hợp đồng đầu vào không ghi được bảng kho', async () => {
    const db = contractDb();
    const app = authApp('/api/contracts', contractRoutes(db));
    const res = await request(app).post('/api/contracts')
      .set('Authorization', `Bearer ${tokenFor(employee)}`)
      .send(inputContract);
    expect(res.status).toBe(201);
    // Hợp đồng vẫn được tạo — đây là hồ sơ kinh doanh, nhân viên vẫn cần nộp.
    expect(db.runs.some((r) => r.sql.startsWith('INSERT INTO contracts'))).toBe(true);
    expect(touchesWarehouse(db.runs)).toBe(false);
  });

  it('người có manage_warehouse vẫn tạo được mục kho như cũ', async () => {
    const db = contractDb();
    const app = authApp('/api/contracts', contractRoutes(db));
    await request(app).post('/api/contracts')
      .set('Authorization', `Bearer ${tokenFor(warehouse)}`)
      .send(inputContract)
      .expect(201);
    expect(touchesWarehouse(db.runs)).toBe(true);
  });

  it('quyen lay tu roles.role.permissions cung duoc cong nhan', async () => {
    const db = contractDb(JSON.stringify(['manage_warehouse']));
    const app = authApp('/api/contracts', contractRoutes(db));
    await request(app).post('/api/contracts')
      .set('Authorization', `Bearer ${tokenFor(employee)}`)
      .send(inputContract)
      .expect(201);
    expect(touchesWarehouse(db.runs)).toBe(true);
  });

  it('role khong doc duoc thi coi nhu khong co quyen kho', async () => {
    const db = contractDb('khong phai JSON');
    const app = authApp('/api/contracts', contractRoutes(db));
    await request(app).post('/api/contracts')
      .set('Authorization', `Bearer ${tokenFor(employee)}`)
      .send(inputContract)
      .expect(201);
    expect(touchesWarehouse(db.runs)).toBe(false);
  });

  it('admin van ghi duoc kho', async () => {
    const db = contractDb();
    const app = authApp('/api/contracts', contractRoutes(db));
    await request(app).post('/api/contracts')
      .set('Authorization', `Bearer ${tokenFor(admin)}`)
      .send(inputContract)
      .expect(201);
    expect(touchesWarehouse(db.runs)).toBe(true);
  });

  it('sua hop dong cung khong xoa duoc muc kho khi thieu quyen', async () => {
    const db = contractDb();
    const app = authApp('/api/contracts', contractRoutes(db));
    const res = await request(app).put('/api/contracts/c-1')
      .set('Authorization', `Bearer ${tokenFor({ ...employee, role: 'Trưởng phòng' })}`)
      .send({ ...inputContract, status: 'draft' });
    expect(res.status).toBe(200);
    expect(touchesWarehouse(db.runs)).toBe(false);
  });

  // Cần cả quyền sửa hợp đồng lẫn quyền kho, nên dùng TP có manage_warehouse.
  it('sửa hợp đồng có quyền kho thì vẫn ghi bảng kho', async () => {
    const db = contractDb();
    const app = authApp('/api/contracts', contractRoutes(db));
    const res = await request(app).put('/api/contracts/c-1')
      .set('Authorization', `Bearer ${tokenFor({ ...warehouse, role: 'Trưởng phòng' })}`)
      .send({ ...inputContract, status: 'draft' });
    expect(res.status).toBe(200);
    expect(touchesWarehouse(db.runs)).toBe(true);
  });
});
