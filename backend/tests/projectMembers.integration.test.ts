import request from 'supertest';
import { describe, it, expect } from 'vitest';
import { FakeDb } from './helpers/fakeDb.js';
import { createTestApp, makeToken } from './helpers/createTestApp.js';

const outsider = makeToken({
  id: 'emp-x', name: 'Outsider', email: 'x@example.com',
  role: 'Employee', department: 'Phòng Kho & Logistics', departmentId: 'dept-wh', permissions: [],
});

const member = makeToken({
  id: 'emp-m', name: 'Member', email: 'm@example.com',
  role: 'Employee', department: 'Phòng Kho & Logistics', departmentId: 'dept-wh', permissions: [],
});

const projManager = makeToken({
  id: 'pm-1', name: 'PM', email: 'pm@example.com',
  role: 'Manager', department: 'Khối Tổng Thầu EPC & Thi Công', departmentId: 'dept-epc', permissions: [],
});

const project = { id: 'p1', managerId: 'pm-1', departmentId: 'dept-epc', primaryDepartmentId: 'dept-epc' };

function projectDb() {
  const db = new FakeDb();
  db.onGet((sql, params) => {
    if (sql.includes('FROM projects WHERE id = ?')) return { ...project };
    if (sql.includes('FROM project_members WHERE projectId = ? AND userId = ?')) {
      return params[1] === 'emp-m' ? { projectId: 'p1', userId: 'emp-m' } : undefined;
    }
    return undefined;
  });
  return db;
}

describe('project_members — RBAC phạm vi dự án', () => {
  it('thành viên trong project_members đọc được dự án ngoài phòng mình', async () => {
    const db = projectDb();
    db.onAll((sql) => (sql.includes('FROM contracts') ? [] : sql.includes('FROM project_reports') ? [] : sql.includes('FROM project_departments') ? [] : undefined));
    const res = await request(createTestApp(db)).get('/api/projects/p1')
      .set('Authorization', `Bearer ${member}`);
    expect(res.status).toBe(200);
  });

  it('người ngoài (không member, khác phòng) -> 403', async () => {
    const db = projectDb();
    const res = await request(createTestApp(db)).get('/api/projects/p1')
      .set('Authorization', `Bearer ${outsider}`);
    expect(res.status).toBe(403);
  });

  it('GET /:id/members — outsider 403, member 200', async () => {
    const dbOut = projectDb();
    const r1 = await request(createTestApp(dbOut)).get('/api/projects/p1/members')
      .set('Authorization', `Bearer ${outsider}`);
    expect(r1.status).toBe(403);

    const dbIn = projectDb();
    dbIn.onAll((sql) => (sql.includes('FROM project_members pm') ? [{ userId: 'emp-m' }] : undefined));
    const r2 = await request(createTestApp(dbIn)).get('/api/projects/p1/members')
      .set('Authorization', `Bearer ${member}`);
    expect(r2.status).toBe(200);
  });

  it('POST /:id/members — manager dự án 201, outsider 403', async () => {
    const dbPm = projectDb();
    const r1 = await request(createTestApp(dbPm)).post('/api/projects/p1/members')
      .set('Authorization', `Bearer ${projManager}`)
      .send({ userId: 'emp-new', role: 'member' });
    expect(r1.status).toBe(201);
    expect(dbPm.count('INSERT INTO project_members')).toBe(1);

    const dbOut = projectDb();
    const r2 = await request(createTestApp(dbOut)).post('/api/projects/p1/members')
      .set('Authorization', `Bearer ${outsider}`)
      .send({ userId: 'emp-new' });
    expect(r2.status).toBe(403);
  });

  it('DELETE /:id/members/:userId — manager 200, member thường 403', async () => {
    const dbPm = projectDb();
    const r1 = await request(createTestApp(dbPm)).delete('/api/projects/p1/members/emp-m')
      .set('Authorization', `Bearer ${projManager}`);
    expect(r1.status).toBe(200);

    const dbMem = projectDb();
    const r2 = await request(createTestApp(dbMem)).delete('/api/projects/p1/members/emp-m')
      .set('Authorization', `Bearer ${member}`);
    expect(r2.status).toBe(403);
    expect(dbMem.count('DELETE FROM project_members')).toBe(0);
  });

  it('GET / list — lọc theo member (SQL chứa project_members)', async () => {
    const db = new FakeDb();
    const res = await request(createTestApp(db)).get('/api/projects')
      .set('Authorization', `Bearer ${member}`);
    expect(res.status).toBe(200);
    const call = db.findCall('FROM projects p');
    expect(call?.sql).toContain('project_members');
    expect(call?.params).toContain('emp-m');
  });
});
