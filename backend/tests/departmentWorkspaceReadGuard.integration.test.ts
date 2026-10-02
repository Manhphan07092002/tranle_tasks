import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { FakeDb } from './helpers/fakeDb.js';
import { createTestApp, makeToken } from './helpers/createTestApp.js';

const salesEmployee = makeToken({
  id: 'emp-sales',
  name: 'Sales Employee',
  email: 'sales@example.com',
  role: 'Employee',
  department: 'Phòng Kinh doanh',
  departmentId: 'dept-sales',
  permissions: [],
});

const finManager = makeToken({
  id: 'mgr-fin',
  name: 'Fin Manager',
  email: 'finmgr@example.com',
  role: 'Manager',
  department: 'dept-fin',
  permissions: [],
});

const admin = makeToken({
  id: 'admin-1',
  name: 'Admin',
  email: 'admin@example.com',
  role: 'Admin',
  department: 'Ban Giám Đốc',
  permissions: ['admin_panel'],
});

// Token cũ chỉ có legacy department (không có departmentId).
const legacyFinEmployee = makeToken({
  id: 'emp-legacy',
  name: 'Legacy Employee',
  email: 'legacy@example.com',
  role: 'Employee',
  department: 'dept-finance',
  permissions: [],
});

describe('GET records/kpis — quyền đọc thành viên phòng ban', () => {
  it('Employee đọc records phòng mình -> 200', async () => {
    const db = new FakeDb();
    db.onAll((sql) => (sql.includes('FROM sales_leads') ? [{ id: 'l1' }] : undefined));
    const res = await request(createTestApp(db))
      .get('/api/department-workspace/dept-sales/records?type=leads')
      .set('Authorization', `Bearer ${salesEmployee}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });

  it('Employee đọc records phòng khác -> 403, không chạm DB', async () => {
    const db = new FakeDb();
    const res = await request(createTestApp(db))
      .get('/api/department-workspace/dept-legal/records?type=contracts')
      .set('Authorization', `Bearer ${salesEmployee}`);
    expect(res.status).toBe(403);
    expect(db.calls).toHaveLength(0);
  });

  it('Employee đọc kpis phòng mình -> 200', async () => {
    const db = new FakeDb();
    const res = await request(createTestApp(db))
      .get('/api/department-workspace/dept-sales/kpis')
      .set('Authorization', `Bearer ${salesEmployee}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('totalLeads');
  });

  it('Employee đọc kpis phòng khác -> 403', async () => {
    const db = new FakeDb();
    const res = await request(createTestApp(db))
      .get('/api/department-workspace/dept-legal/kpis')
      .set('Authorization', `Bearer ${salesEmployee}`);
    expect(res.status).toBe(403);
  });

  it('Manager phòng khác đọc records -> 403', async () => {
    const db = new FakeDb();
    const res = await request(createTestApp(db))
      .get('/api/department-workspace/dept-sales/records?type=leads')
      .set('Authorization', `Bearer ${finManager}`);
    expect(res.status).toBe(403);
  });

  it('Admin đọc mọi phòng -> 200', async () => {
    const db = new FakeDb();
    const res = await request(createTestApp(db))
      .get('/api/department-workspace/dept-legal/records?type=contracts')
      .set('Authorization', `Bearer ${admin}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('Token legacy dept-finance đọc dept-fin (alias) -> 200', async () => {
    const db = new FakeDb();
    db.onAll((sql) => (sql.includes('FROM finance_ap') ? [{ id: 'ap-1' }] : undefined));
    const res = await request(createTestApp(db))
      .get('/api/department-workspace/dept-fin/records?type=ap')
      .set('Authorization', `Bearer ${legacyFinEmployee}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });

  it('Không token -> 401', async () => {
    const db = new FakeDb();
    const res = await request(createTestApp(db)).get(
      '/api/department-workspace/dept-sales/records?type=leads',
    );
    expect(res.status).toBe(401);
  });
});

describe('Ghi records — vẫn giữ guard Manager', () => {
  it('Employee POST phòng mình -> 403', async () => {
    const db = new FakeDb();
    const res = await request(createTestApp(db))
      .post('/api/department-workspace/dept-sales/records')
      .set('Authorization', `Bearer ${salesEmployee}`)
      .send({ type: 'leads', data: { name: 'x' } });
    expect(res.status).toBe(403);
    expect(db.count('INSERT INTO sales_leads')).toBe(0);
  });
});
