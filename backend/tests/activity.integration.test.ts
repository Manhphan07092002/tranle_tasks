import express from 'express';
import request from 'supertest';
import { describe, it, expect } from 'vitest';
import { FakeDb } from './helpers/fakeDb.js';
import { makeToken } from './helpers/createTestApp.js';
import { requireAuth } from '../middleware/auth.js';
import { activityRoutes, departmentActivityRoutes } from '../routes/activity.js';

function activityApp(db: FakeDb) {
  const app = express();
  app.use(express.json());
  app.use('/api/activity', requireAuth, activityRoutes(db as any));
  app.use('/api/activity-logs', requireAuth, departmentActivityRoutes(db as any));
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

const admin = makeToken({
  id: 'admin-1', name: 'Admin', email: 'admin@example.com',
  role: 'Admin', department: 'Ban Giám Đốc', permissions: ['admin_panel'],
});

describe('GET /api/activity — nhật ký toàn công ty', () => {
  it('Employee -> 403, không chạm DB', async () => {
    const db = new FakeDb();
    const res = await request(activityApp(db))
      .get('/api/activity')
      .set('Authorization', `Bearer ${salesEmployee}`);
    expect(res.status).toBe(403);
    expect(db.calls).toHaveLength(0);
  });

  it('Manager -> 200', async () => {
    const db = new FakeDb();
    db.onAll((sql) => (sql.includes('FROM activity_logs') ? [{ id: 'a1', userId: 'mgr-sales' }] : undefined));
    const res = await request(activityApp(db))
      .get('/api/activity')
      .set('Authorization', `Bearer ${salesManager}`);
    expect(res.status).toBe(200);
  });

  it('Admin -> 200', async () => {
    const db = new FakeDb();
    const res = await request(activityApp(db))
      .get('/api/activity')
      .set('Authorization', `Bearer ${admin}`);
    expect(res.status).toBe(200);
  });
});

describe('GET /api/activity/user/:userId', () => {
  it('Employee xem log chính mình -> 200', async () => {
    const db = new FakeDb();
    const res = await request(activityApp(db))
      .get('/api/activity/user/emp-sales')
      .set('Authorization', `Bearer ${salesEmployee}`);
    expect(res.status).toBe(200);
  });

  it('Employee xem log người khác -> 403', async () => {
    const db = new FakeDb();
    const res = await request(activityApp(db))
      .get('/api/activity/user/mgr-sales')
      .set('Authorization', `Bearer ${salesEmployee}`);
    expect(res.status).toBe(403);
    expect(db.calls).toHaveLength(0);
  });

  it('Manager xem log nhân viên -> 200', async () => {
    const db = new FakeDb();
    const res = await request(activityApp(db))
      .get('/api/activity/user/emp-sales')
      .set('Authorization', `Bearer ${salesManager}`);
    expect(res.status).toBe(200);
  });
});

describe('GET /api/activity-logs?departmentId= — audit theo phòng', () => {
  function deptDb() {
    const db = new FakeDb();
    db.onGet((sql) => (sql.includes('FROM departments') ? { id: 'dept-sales', name: 'Phòng Kinh Doanh' } : undefined));
    db.onAll((sql) => {
      if (sql.includes('FROM users')) return [{ id: 'emp-sales' }];
      if (sql.includes('FROM activity_logs')) return [{ id: 'a1', userId: 'emp-sales' }];
      return undefined;
    });
    return db;
  }

  it('thiếu departmentId -> 400', async () => {
    const db = new FakeDb();
    const res = await request(activityApp(db))
      .get('/api/activity-logs')
      .set('Authorization', `Bearer ${salesEmployee}`);
    expect(res.status).toBe(400);
  });

  it('Employee xem phòng mình -> 200 mảng', async () => {
    const db = deptDb();
    const res = await request(activityApp(db))
      .get('/api/activity-logs?departmentId=dept-sales')
      .set('Authorization', `Bearer ${salesEmployee}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(1);
  });

  it('Employee xem phòng khác -> 403, không chạm DB', async () => {
    const db = new FakeDb();
    const res = await request(activityApp(db))
      .get('/api/activity-logs?departmentId=dept-legal')
      .set('Authorization', `Bearer ${salesEmployee}`);
    expect(res.status).toBe(403);
    expect(db.calls).toHaveLength(0);
  });
});
