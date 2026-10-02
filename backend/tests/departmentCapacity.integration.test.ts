import request from 'supertest';
import { describe, it, expect } from 'vitest';
import { FakeDb } from './helpers/fakeDb.js';
import { createTestApp, makeToken } from './helpers/createTestApp.js';

const hrEmployee = makeToken({
  id: 'emp-hr', name: 'HR Employee', email: 'hre@example.com',
  role: 'Employee', department: 'Phòng Hành Chính – Nhân Sự', departmentId: 'dept-hr', permissions: [],
});

const hrManager = makeToken({
  id: 'mgr-hr', name: 'HR Manager', email: 'hrm@example.com',
  role: 'Manager', department: 'Phòng Hành Chính – Nhân Sự', departmentId: 'dept-hr', permissions: [],
});

const salesManager = makeToken({
  id: 'mgr-sales', name: 'Sales Manager', email: 'sm@example.com',
  role: 'Manager', department: 'Phòng Kinh Doanh', departmentId: 'dept-sales', permissions: [],
});

const admin = makeToken({
  id: 'admin-1', name: 'Admin', email: 'admin@example.com',
  role: 'Admin', department: 'Ban Giám Đốc', permissions: ['admin_panel'],
});

const existingDept = { id: 'dept-hr', name: 'Phòng Hành Chính – Nhân Sự', code: 'HR', workloadCapacityHours: 40 };

function deptDb() {
  const db = new FakeDb();
  db.onGet((sql) => (sql.includes('FROM departments') ? { ...existingDept } : undefined));
  return db;
}

describe('PUT /api/departments/:id — định mức workload', () => {
  it('Employee -> 403', async () => {
    const db = deptDb();
    const res = await request(createTestApp(db)).put('/api/departments/dept-hr')
      .set('Authorization', `Bearer ${hrEmployee}`)
      .send({ workloadCapacityHours: 50 });
    expect(res.status).toBe(403);
    expect(db.count('UPDATE departments')).toBe(0);
  });

  it('Manager phòng khác -> 403', async () => {
    const db = deptDb();
    const res = await request(createTestApp(db)).put('/api/departments/dept-hr')
      .set('Authorization', `Bearer ${salesManager}`)
      .send({ workloadCapacityHours: 50 });
    expect(res.status).toBe(403);
  });

  it('Manager phòng mình -> 200, chỉ đổi capacity', async () => {
    const db = deptDb();
    const res = await request(createTestApp(db)).put('/api/departments/dept-hr')
      .set('Authorization', `Bearer ${hrManager}`)
      .send({ workloadCapacityHours: 50, name: 'Tên hack' });
    expect(res.status).toBe(200);
    const call = db.findCall('UPDATE departments');
    expect(call?.sql).toContain('workloadCapacityHours');
    expect(call?.sql).not.toContain('name = ?');
    expect(call?.params[0]).toBe(50);
  });

  it('Admin đổi full + capacity clamp >= 1', async () => {
    const db = deptDb();
    const res = await request(createTestApp(db)).put('/api/departments/dept-hr')
      .set('Authorization', `Bearer ${admin}`)
      .send({ name: 'Phòng Hành Chính – Nhân Sự', workloadCapacityHours: -5 });
    expect(res.status).toBe(200);
    const call = db.findCall('UPDATE departments');
    expect(call?.params).toContain(40);
  });
});
