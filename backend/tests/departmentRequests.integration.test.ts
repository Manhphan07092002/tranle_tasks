import express from 'express';
import request from 'supertest';
import { describe, it, expect } from 'vitest';
import { FakeDb } from './helpers/fakeDb.js';
import { makeToken } from './helpers/createTestApp.js';
import { requireAuth } from '../middleware/auth.js';
import { departmentRequestRoutes } from '../routes/departmentRequests.js';

function deptReqApp(db: FakeDb) {
  const app = express();
  app.use(express.json());
  app.use('/api/department-requests', requireAuth, departmentRequestRoutes(db as any));
  return app;
}

const salesEmployee = makeToken({
  id: 'emp-sales', name: 'Sales Employee', email: 'sales@example.com',
  role: 'Employee', department: 'Phòng Kinh Doanh', departmentId: 'dept-sales', permissions: [],
});

const salesManager = makeToken({
  id: 'mgr-sales', name: 'Sales Manager', email: 'mgr@example.com',
  role: 'Manager', department: 'Phòng Kinh Doanh', departmentId: 'dept-sales', permissions: [],
});

const engEmployee = makeToken({
  id: 'emp-eng', name: 'Eng Employee', email: 'eng@example.com',
  role: 'Employee', department: 'Phòng Kỹ Thuật Solar', departmentId: 'dept-eng', permissions: [],
});

const admin = makeToken({
  id: 'admin-1', name: 'Admin', email: 'admin@example.com',
  role: 'Admin', department: 'Ban Giám Đốc', permissions: ['admin_panel'],
});

const ownRequest = {
  id: 'req-1', requestNumber: 'REQ-0001', sourceDepartmentId: 'dept-sales',
  targetDepartmentId: 'dept-eng', requesterId: 'emp-sales', assigneeId: null,
  title: 'YC khảo sát', status: 'pending',
};

const foreignRequest = {
  id: 'req-9', requestNumber: 'REQ-0009', sourceDepartmentId: 'dept-fin',
  targetDepartmentId: 'dept-legal', requesterId: 'someone-else', assigneeId: null,
  title: 'YC khác', status: 'pending',
};

describe('GET /api/department-requests — lọc phạm vi', () => {
  it('Employee: SQL có điều kiện giới hạn phòng mình', async () => {
    const db = new FakeDb();
    const res = await request(deptReqApp(db))
      .get('/api/department-requests')
      .set('Authorization', `Bearer ${salesEmployee}`);
    expect(res.status).toBe(200);
    const call = db.findCall('FROM department_requests r');
    expect(call?.sql).toContain('r.requesterId = ?');
    expect(call?.params).toContain('emp-sales');
  });

  it('Admin: không bị lọc phạm vi', async () => {
    const db = new FakeDb();
    const res = await request(deptReqApp(db))
      .get('/api/department-requests')
      .set('Authorization', `Bearer ${admin}`);
    expect(res.status).toBe(200);
    const call = db.findCall('FROM department_requests r');
    expect(call?.sql).not.toContain('r.requesterId = ?');
  });
});

describe('GET /api/department-requests/:id', () => {
  it('người ngoài cuộc -> 403', async () => {
    const db = new FakeDb();
    db.onGet(() => foreignRequest);
    const res = await request(deptReqApp(db))
      .get('/api/department-requests/req-9')
      .set('Authorization', `Bearer ${salesEmployee}`);
    expect(res.status).toBe(403);
  });

  it('người tạo -> 200', async () => {
    const db = new FakeDb();
    db.onGet(() => ownRequest);
    const res = await request(deptReqApp(db))
      .get('/api/department-requests/req-1')
      .set('Authorization', `Bearer ${salesEmployee}`);
    expect(res.status).toBe(200);
  });
});

describe('POST /api/department-requests — chống mạo danh', () => {
  const payload = (extra = {}) => ({
    sourceDepartmentId: 'dept-sales', targetDepartmentId: 'dept-eng',
    title: 'YC mới', ...extra,
  });

  it('requesterId trong body bị ép thành user đăng nhập', async () => {
    const db = new FakeDb();
    const res = await request(deptReqApp(db))
      .post('/api/department-requests')
      .set('Authorization', `Bearer ${salesEmployee}`)
      .send(payload({ requesterId: 'victim-id' }));
    expect(res.status).toBe(201);
    const call = db.findCall('INSERT INTO department_requests');
    expect(call?.params[4]).toBe('emp-sales');
  });

  it('tạo từ phòng ban khác -> 403, không INSERT', async () => {
    const db = new FakeDb();
    const res = await request(deptReqApp(db))
      .post('/api/department-requests')
      .set('Authorization', `Bearer ${salesEmployee}`)
      .send(payload({ sourceDepartmentId: 'dept-fin' }));
    expect(res.status).toBe(403);
    expect(db.count('INSERT INTO department_requests')).toBe(0);
  });
});

describe('PUT /api/department-requests/:id', () => {
  it('người ngoài cuộc -> 403, không UPDATE', async () => {
    const db = new FakeDb();
    db.onGet(() => foreignRequest);
    const res = await request(deptReqApp(db))
      .put('/api/department-requests/req-9')
      .set('Authorization', `Bearer ${salesEmployee}`)
      .send({ status: 'completed' });
    expect(res.status).toBe(403);
    expect(db.count('UPDATE department_requests')).toBe(0);
  });

  it('người tạo được cập nhật -> 200', async () => {
    const db = new FakeDb();
    db.onGet(() => ownRequest);
    const res = await request(deptReqApp(db))
      .put('/api/department-requests/req-1')
      .set('Authorization', `Bearer ${salesEmployee}`)
      .send({ status: 'accepted' });
    expect(res.status).toBe(200);
  });

  it('Manager phòng nhận được duyệt -> 200', async () => {
    const db = new FakeDb();
    const incoming = { ...ownRequest, requesterId: 'other', assigneeId: null };
    db.onGet(() => incoming);
    const res = await request(deptReqApp(db))
      .put('/api/department-requests/req-1')
      .set('Authorization', `Bearer ${salesManager}`)
      .send({ status: 'accepted' });
    expect(res.status).toBe(200);
  });
});

describe('POST /:id/convert-to-task', () => {
  it('Employee phòng gửi (không phải assignee) -> 403', async () => {
    const db = new FakeDb();
    db.onGet(() => ownRequest);
    const res = await request(deptReqApp(db))
      .post('/api/department-requests/req-1/convert-to-task')
      .set('Authorization', `Bearer ${salesEmployee}`);
    expect(res.status).toBe(403);
    expect(db.count('INSERT INTO tasks')).toBe(0);
  });

  it('Employee phòng nhận (dept-eng) -> 403 vì không phải Manager/assignee', async () => {
    const db = new FakeDb();
    db.onGet(() => ownRequest);
    const res = await request(deptReqApp(db))
      .post('/api/department-requests/req-1/convert-to-task')
      .set('Authorization', `Bearer ${engEmployee}`);
    expect(res.status).toBe(403);
  });

  it('Admin -> 200', async () => {
    const db = new FakeDb();
    db.onGet((sql) => (sql.includes('FROM departments') ? { id: 'dept-eng', name: 'KT' } : ownRequest));
    const res = await request(deptReqApp(db))
      .post('/api/department-requests/req-1/convert-to-task')
      .set('Authorization', `Bearer ${admin}`);
    expect(res.status).toBe(200);
    expect(res.body.taskId).toBeTruthy();
  });
});

describe('DELETE /api/department-requests/:id', () => {
  it('người ngoài cuộc -> 403, không DELETE', async () => {
    const db = new FakeDb();
    db.onGet(() => foreignRequest);
    const res = await request(deptReqApp(db))
      .delete('/api/department-requests/req-9')
      .set('Authorization', `Bearer ${salesEmployee}`);
    expect(res.status).toBe(403);
    expect(db.count('DELETE FROM department_requests')).toBe(0);
  });

  it('người tạo được xóa -> 200', async () => {
    const db = new FakeDb();
    db.onGet(() => ownRequest);
    const res = await request(deptReqApp(db))
      .delete('/api/department-requests/req-1')
      .set('Authorization', `Bearer ${salesEmployee}`);
    expect(res.status).toBe(200);
  });
});
