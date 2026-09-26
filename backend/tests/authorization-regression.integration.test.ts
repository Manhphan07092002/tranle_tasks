import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { getManagedUploadPath } from '../routes/upload.js';
import { requireActiveSession } from '../middleware/auth.js';
import { createTestApp, makeToken } from './helpers/createTestApp.js';
import { FakeDb } from './helpers/fakeDb.js';

const employee = makeToken({
  id: 'employee-1', name: 'Employee', email: 'employee@example.com', role: 'Employee',
  department: 'Sales', departmentId: 'dept-sales', permissions: [],
});
const financeManager = makeToken({
  id: 'manager-fin', name: 'Finance manager', email: 'finance@example.com', role: 'Manager',
  department: 'Finance', departmentId: 'dept-fin', permissions: [],
});
const admin = makeToken({
  id: 'admin-1', name: 'Admin', email: 'admin@example.com', role: 'Admin',
  department: 'Executive', departmentId: 'dept-exec', permissions: [],
});

describe('authorization regression coverage', () => {
  it('denies a department manager from another department workspace', async () => {
    const res = await request(createTestApp(new FakeDb()))
      .get('/api/department-workspace/dept-sales/records?type=leads')
      .set('Authorization', `Bearer ${financeManager}`);

    expect(res.status).toBe(403);
  });

  it('denies an employee from creating a department task template', async () => {
    const db = new FakeDb();
    const res = await request(createTestApp(db))
      .post('/api/task-templates')
      .set('Authorization', `Bearer ${employee}`)
      .send({ departmentId: 'dept-sales', title: 'Template', taskType: 'general' });

    expect(res.status).toBe(403);
    expect(db.count('INSERT INTO task_templates')).toBe(0);
  });

  it('denies an employee from changing the shared event calendar', async () => {
    const db = new FakeDb();
    const res = await request(createTestApp(db))
      .post('/api/events')
      .set('Authorization', `Bearer ${employee}`)
      .send({ title: 'Spoofed holiday', date: '2026-10-01' });

    expect(res.status).toBe(403);
    expect(db.count('INSERT INTO events')).toBe(0);
  });

  it('denies a user access to a project outside their department', async () => {
    const db = new FakeDb().onGet((sql) => sql.includes('FROM projects WHERE id')
      ? { id: 'project-fin', managerId: 'manager-fin', departmentId: 'dept-fin', primaryDepartmentId: 'dept-fin' }
      : undefined);
    const res = await request(createTestApp(db))
      .get('/api/projects/project-fin')
      .set('Authorization', `Bearer ${employee}`);

    expect(res.status).toBe(403);
  });

  it('allows an administrator to access a project across departments', async () => {
    const db = new FakeDb().onGet((sql) => sql.includes('FROM projects WHERE id')
      ? { id: 'project-fin', managerId: 'manager-fin', departmentId: 'dept-fin', primaryDepartmentId: 'dept-fin' }
      : undefined);
    const res = await request(createTestApp(db))
      .get('/api/projects/project-fin')
      .set('Authorization', `Bearer ${admin}`);

    expect(res.status).toBe(200);
  });

  it('accepts only generated upload URLs and rejects traversal paths', () => {
    expect(getManagedUploadPath('/api/upload/0123456789abcdef01234567.pdf')).toBeTruthy();
    expect(getManagedUploadPath('/api/upload/../../backend/server.ts')).toBeNull();
    expect(getManagedUploadPath('backend/server.ts')).toBeNull();
  });

  it('accepts an active JWT session with its current version', async () => {
    const db = new FakeDb().onGet((sql) => sql.includes('sessionVersion')
      ? { id: 'employee-1', isLocked: 0, sessionVersion: 0 }
      : undefined);
    const app = express();
    app.get('/private', requireActiveSession(db), (_req, res) => res.json({ success: true }));

    const res = await request(app).get('/private').set('Authorization', `Bearer ${employee}`);

    expect(res.status).toBe(200);
  });
});
