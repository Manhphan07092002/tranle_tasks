import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import express from 'express';
import { createTestApp, makeToken } from './helpers/createTestApp.js';
import { FakeDb } from './helpers/fakeDb.js';
import { requireActiveSession } from '../middleware/auth.js';

const employeeToken = makeToken({
  id: 'employee-1', name: 'Employee', email: 'employee@example.com',
  role: 'Employee', department: 'Sales', permissions: [],
});
const adminToken = makeToken({
  id: 'admin-1', name: 'Admin', email: 'admin@example.com',
  role: 'Admin', department: 'Executive', permissions: [],
});

describe('private-data authorization', () => {
  let db: FakeDb;

  beforeEach(() => { db = new FakeDb(); });

  it('blocks an employee from changing roles', async () => {
    const res = await request(createTestApp(db))
      .post('/api/roles')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({ name: 'Escalated', permissions: ['admin_panel'] });

    expect(res.status).toBe(403);
    expect(db.count('INSERT INTO roles')).toBe(0);
  });

  it('allows an admin to create a role', async () => {
    const res = await request(createTestApp(db))
      .post('/api/roles')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Auditor', permissions: ['reports.view'] });

    expect(res.status).toBe(201);
    expect(db.count('INSERT INTO roles')).toBe(1);
  });

  it('rejects document metadata that does not reference a managed upload', async () => {
    const res = await request(createTestApp(db))
      .post('/api/documents')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({ name: 'server.ts', url: 'backend/server.ts', category: 'reports' });

    expect(res.status).toBe(400);
    expect(db.count('INSERT INTO documents')).toBe(0);
  });

  it('uses the authenticated user for notes, never a body/query user id', async () => {
    const res = await request(createTestApp(db))
      .post('/api/notes')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({ id: 'note-1', title: 'Private', content: 'x', userId: 'victim-1' });

    expect(res.status).toBe(200);
    const insert = db.findCall('INSERT INTO notes');
    expect(insert?.params.at(-1)).toBe('employee-1');
  });

  it('only permits the notification owner to mark it read', async () => {
    const res = await request(createTestApp(db))
      .patch('/api/notifications/notification-1/read')
      .set('Authorization', `Bearer ${employeeToken}`);

    expect(res.status).toBe(200);
    const update = db.findCall('UPDATE notifications SET isRead');
    expect(update?.params).toEqual(['notification-1', 'employee-1']);
  });

  it('does not allow an employee to create a meeting for a different host', async () => {
    const res = await request(createTestApp(db))
      .post('/api/meetings')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({ title: 'Spoofed', hostId: 'victim-1', startTime: '2026-01-01', endTime: '2026-01-01' });

    expect(res.status).toBe(201);
    const insert = db.findCall('INSERT INTO meetings');
    expect(insert?.params[3]).toBe('employee-1');
  });

  it('rejects a JWT after its account session version changes', async () => {
    db.onGet((sql) => sql.includes('sessionVersion') ? { id: 'employee-1', isLocked: 0, sessionVersion: 1 } : undefined);
    const app = express();
    app.get('/private', requireActiveSession(db), (_req, res) => res.json({ success: true }));

    const res = await request(app).get('/private').set('Authorization', `Bearer ${employeeToken}`);

    expect(res.status).toBe(401);
  });
});
