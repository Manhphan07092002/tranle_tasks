import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { FakeDb } from './helpers/fakeDb.js';
import { createTestApp, makeToken } from './helpers/createTestApp.js';

const employeeToken = makeToken({
  id: 'user-1',
  name: 'Nguyen Van A',
  email: 'a@example.com',
  role: 'Employee',
  department: 'dept-sales',
  permissions: [],
});

const managerToken = makeToken({
  id: 'mgr-1',
  name: 'Tran Thi B',
  email: 'b@example.com',
  role: 'Manager',
  department: 'dept-fin',
  permissions: [],
});

describe('GET /api/department-workspace/:departmentId/records (P0 alias)', () => {
  it('ID dai cu dept-finance van phuc vu (alias -> dept-fin)', async () => {
    const db = new FakeDb();
    db.onAll((sql) => (sql.includes('FROM finance_ap') ? [{ id: 'ap-1' }] : undefined));

    const res = await request(createTestApp(db))
      .get('/api/department-workspace/dept-finance/records?type=ap')
      .set('Authorization', "Bearer " + managerToken);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });

  it('ID chuan dept-fin phuc vu', async () => {
    const db = new FakeDb();
    db.onAll((sql) => (sql.includes('FROM finance_ar') ? [{ id: 'ar-1' }] : undefined));

    const res = await request(createTestApp(db))
      .get('/api/department-workspace/dept-fin/records?type=ar')
      .set('Authorization', "Bearer " + managerToken);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });

  it('POST thieu type -> 400 (zod P1)', async () => {
    const db = new FakeDb();

    const res = await request(createTestApp(db))
      .post('/api/department-workspace/dept-fin/records')
      .set('Authorization', "Bearer " + managerToken)
      .send({ data: {} });

    expect(res.status).toBe(400);
    expect(db.count('INSERT INTO finance_ap')).toBe(0);
  });
});

describe('DELETE /api/department-workspace/:departmentId/records/:id (P0 RBAC)', () => {  it('Employee -> 403', async () => {
    const db = new FakeDb();

    const res = await request(createTestApp(db))
      .delete('/api/department-workspace/dept-fin/records/x1?type=ap')
      .set('Authorization', "Bearer " + employeeToken);

    expect(res.status).toBe(403);
    expect(db.count('DELETE FROM finance_ap')).toBe(0);
  });

  it('Manager -> 200', async () => {
    const db = new FakeDb();

    const res = await request(createTestApp(db))
      .delete('/api/department-workspace/dept-fin/records/x1?type=ap')
      .set('Authorization', "Bearer " + managerToken);

    expect(res.status).toBe(200);
    expect(db.count('DELETE FROM finance_ap')).toBe(1);
  });
});

const hrManagerToken = makeToken({
  id: 'mgr-hr',
  name: 'HR Manager',
  email: 'hrmgr@example.com',
  role: 'Manager',
  department: 'Phòng Hành Chính – Nhân Sự',
  departmentId: 'dept-hr',
  permissions: [],
});

describe('HR interviews CRUD (dept-hr records?type=interviews)', () => {
  it('GET interviews -> 200 mảng', async () => {
    const db = new FakeDb();
    db.onAll((sql) => (sql.includes('FROM hr_interviews') ? [{ id: 'iv-1', result: 'scheduled' }] : undefined));

    const res = await request(createTestApp(db))
      .get('/api/department-workspace/dept-hr/records?type=interviews')
      .set('Authorization', "Bearer " + hrManagerToken);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });

  it('POST interview ghi đủ 9 cột', async () => {
    const db = new FakeDb();

    const res = await request(createTestApp(db))
      .post('/api/department-workspace/dept-hr/records')
      .set('Authorization', "Bearer " + hrManagerToken)
      .send({ type: 'interviews', data: { candidateName: 'Nguyen Van C', scheduleDate: '2026-10-10', interviewers: 'mgr-hr' } });

    expect(res.status).toBe(201);
    const call = db.findCall('INSERT INTO hr_interviews');
    expect(call).toBeDefined();
    expect(call?.params[1]).toBe('Nguyen Van C');
  });

  it('Employee POST interview -> 403', async () => {
    const db = new FakeDb();

    const res = await request(createTestApp(db))
      .post('/api/department-workspace/dept-hr/records')
      .set('Authorization', "Bearer " + employeeToken)
      .send({ type: 'interviews', data: { candidateName: 'X', scheduleDate: '2026-10-10' } });

    expect(res.status).toBe(403);
    expect(db.count('INSERT INTO hr_interviews')).toBe(0);
  });

  it('PUT cập nhật result -> 200', async () => {
    const db = new FakeDb();

    const res = await request(createTestApp(db))
      .put('/api/department-workspace/dept-hr/records/iv-1')
      .set('Authorization', "Bearer " + hrManagerToken)
      .send({ type: 'interviews', data: { candidateName: 'Nguyen Van C', scheduleDate: '2026-10-10', interviewers: 'mgr-hr', result: 'passed' } });

    expect(res.status).toBe(200);
    expect(db.count('UPDATE hr_interviews')).toBe(1);
  });

  it('POST thiếu candidateName -> 400, không INSERT', async () => {
    const db = new FakeDb();

    const res = await request(createTestApp(db))
      .post('/api/department-workspace/dept-hr/records')
      .set('Authorization', "Bearer " + hrManagerToken)
      .send({ type: 'interviews', data: { scheduleDate: '2026-10-10', interviewers: 'mgr-hr' } });

    expect(res.status).toBe(400);
    expect(db.count('INSERT INTO hr_interviews')).toBe(0);
  });

  it('PUT thiếu scheduleDate -> 400', async () => {
    const db = new FakeDb();

    const res = await request(createTestApp(db))
      .put('/api/department-workspace/dept-hr/records/iv-1')
      .set('Authorization', "Bearer " + hrManagerToken)
      .send({ type: 'interviews', data: { candidateName: 'Nguyen Van C', interviewers: 'mgr-hr' } });

    expect(res.status).toBe(400);
  });
});
