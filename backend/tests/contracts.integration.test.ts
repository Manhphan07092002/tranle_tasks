import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { FakeDb } from './helpers/fakeDb.js';
import { createTestApp, makeToken } from './helpers/createTestApp.js';

const employee = {
  id: 'user-1',
  name: 'Nguyen Van A',
  email: 'a@example.com',
  role: 'Employee',
  department: 'dept-sales',
  permissions: [],
};
const admin = {
  id: 'user-admin',
  name: 'Quan Tri Vien',
  email: 'admin@example.com',
  role: 'Admin',
  department: 'dept-exec',
  permissions: ['admin_panel'],
};

const employeeToken = makeToken(employee);
const adminToken = makeToken(admin);

const validDraft = {
  contractNumber: 'HD-2026-001',
  clientName: 'Khách hàng A',
  contractName: 'Lắp điện mặt trời áp mái',
  department: 'dept-sales',
  createdBy: 'user-1',
  status: 'draft',
  products: [{ name: 'Tấm pin A', unitPrice: 2000000 }],
};

describe('GET /api/contracts — phân quyền xem', () => {
  let db: FakeDb;

  beforeEach(() => {
    db = new FakeDb();
    db.onAll((sql) => {
      if (sql.includes('FROM contracts ') && !sql.includes('revenue_reports')) {
        return [{ id: 'c1', contractNumber: 'HD-1', clientName: 'A', contractName: 'X', products: null }];
      }
      return undefined;
    });
  });

  it('nhân viên chỉ thấy hợp đồng của mình (query lọc createdBy/department)', async () => {
    const res = await request(createTestApp(db)).get('/api/contracts').set('Authorization', `Bearer ${employeeToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);

    const queryCall = db.calls.find((c) => c.sql.includes('FROM contracts ') && c.sql.includes('AND (createdBy = ?'));
    expect(queryCall).toBeTruthy();
    expect(queryCall!.params[0]).toBe('user-1');
  });

  it('admin view_all → không bị lọc theo người tạo', async () => {
    const res = await request(createTestApp(db)).get('/api/contracts').set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const queryCall = db.calls.find((c) => c.sql.includes('FROM contracts ') && !c.sql.includes('revenue_reports'));
    expect(queryCall!.sql).not.toContain('AND (createdBy = ?');
    expect(queryCall!.params).toEqual([]);
  });
});

describe('POST /api/contracts — RBAC tạo hợp đồng', () => {
  let db: FakeDb;

  beforeEach(() => {
    db = new FakeDb();
  });

  it('nhân viên không được tạo hợp đồng ở trạng thái hoàn thành → 400', async () => {
    const res = await request(createTestApp(db))
      .post('/api/contracts')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({ ...validDraft, status: 'completed' });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Nhân viên chỉ có quyền');
  });

  it('tạo hợp đồng draft hợp lệ → 201, insert + commit đủ', async () => {
    const res = await request(createTestApp(db))
      .post('/api/contracts')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send(validDraft);

    expect(res.status).toBe(201);
    expect(res.body.id).toBeTruthy();
    expect(db.count('INSERT INTO contracts')).toBe(1);
    expect(db.count('BEGIN TRANSACTION')).toBe(1);
    expect(db.count('COMMIT')).toBe(1);
  });

  it('trùng số hợp đồng → 400', async () => {
    db.onGet((sql) => (sql.includes('SELECT id FROM contracts WHERE contractNumber') ? { id: 'c-exists' } : undefined));

    const res = await request(createTestApp(db))
      .post('/api/contracts')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send(validDraft);

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('đã tồn tại');
  });

  it('thiếu trường bắt buộc → 400', async () => {
    const res = await request(createTestApp(db))
      .post('/api/contracts')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({ department: 'dept-sales', status: 'draft' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Số hợp đồng không được để trống');
  });
});

describe('PUT /api/contracts/:id — bảo vệ IDOR', () => {
  let db: FakeDb;

  beforeEach(() => {
    db = new FakeDb();
  });

  it('nhân viên không phải chủ hợp đồng → 403', async () => {
    db.onGet((sql) =>
      sql.includes('SELECT createdBy, status')
        ? {
            createdBy: 'user-99',
            status: 'draft',
            department: 'dept-sales',
            approvalFeedback: null,
            docAccountantUserId: null,
            docAccountantStatus: null,
            contractName: 'X',
            contractNumber: 'HD-1',
          }
        : undefined
    );

    const res = await request(createTestApp(db))
      .put('/api/contracts/c1')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send(validDraft);

    expect(res.status).toBe(403);
    expect(res.body.error).toContain('không có quyền chỉnh sửa');
  });

  it('kế toán không được bàn giao → 403 khi xác nhận hồ sơ', async () => {
    db.onGet((sql) =>
      sql.includes('SELECT docAccountantUserId')
        ? {
            docAccountantUserId: 'accountant-2',
            docAccountantStatus: 'pending',
            contractName: 'X',
            contractNumber: 'HD-1',
            createdBy: 'user-99',
            contractType: 'output',
          }
        : undefined
    );

    const res = await request(createTestApp(db))
      .put('/api/contracts/c1/confirm-receipt')
      .set('Authorization', `Bearer ${employeeToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toContain('không phải là kế toán');
  });

  it('nhân viên không được phê duyệt hợp đồng → 403', async () => {
    db.onGet((sql) =>
      sql.includes('SELECT createdBy, contractName')
        ? { createdBy: 'user-1', contractName: 'X', contractNumber: 'HD-1', department: 'dept-sales' }
        : undefined
    );

    const res = await request(createTestApp(db))
      .put('/api/contracts/c1/approve')
      .set('Authorization', `Bearer ${employeeToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toContain('Chỉ Trưởng phòng');
  });
});