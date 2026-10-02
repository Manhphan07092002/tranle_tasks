import express from 'express';
import request from 'supertest';
import { describe, it, expect } from 'vitest';
import { FakeDb } from './helpers/fakeDb.js';
import { makeToken } from './helpers/createTestApp.js';
import { requireAuth } from '../middleware/auth.js';
import {
  normalizePriority, ensureDefaultPolicies, runSlaEscalationCheck,
} from '../schedulers/slaEscalation.js';
import { slaRoutes } from '../routes/sla.js';

const POLICY = { id: 'sla-cs-high', ticketType: 'cs', priority: 'high', responseHours: 8, resolveHours: 72 };

describe('normalizePriority', () => {
  it('map severity/priority đa dạng về 4 mức', () => {
    expect(normalizePriority('critical')).toBe('critical');
    expect(normalizePriority('urgent')).toBe('critical');
    expect(normalizePriority('major')).toBe('high');
    expect(normalizePriority('High')).toBe('high');
    expect(normalizePriority('minor')).toBe('low');
    expect(normalizePriority('')).toBe('medium');
    expect(normalizePriority(undefined)).toBe('medium');
    expect(normalizePriority('medium')).toBe('medium');
  });
});

describe('ensureDefaultPolicies', () => {
  it('seed 12 policies khi bảng trống', async () => {
    const db = new FakeDb();
    db.onAll((sql) => (sql.includes('FROM sla_policies') && db.count('INSERT INTO sla_policies') > 0
      ? [{ ...POLICY }]
      : undefined));
    const rows = await ensureDefaultPolicies(db);
    expect(db.count('INSERT INTO sla_policies')).toBe(12);
    expect(rows.length).toBeGreaterThan(0);
  });

  it('không seed khi đã có policies', async () => {
    const db = new FakeDb();
    db.onAll((sql) => (sql.includes('FROM sla_policies') ? [POLICY] : undefined));
    await ensureDefaultPolicies(db);
    expect(db.count('INSERT INTO sla_policies')).toBe(0);
  });
});

describe('runSlaEscalationCheck', () => {
  const ticket = {
    id: 't1', customer: 'ACME', title: 'Mất điện', status: 'open',
    priority: 'high', escalatedLevel: 0, createdAt: '2026-09-01T00:00:00.000Z',
  };
  const mgr = { id: 'mgr-cs', role: 'Manager', department: 'Phòng Chăm Sóc Khách Hàng' };

  function escalationDb(opts: { notified?: boolean; resolveBreached?: boolean } = {}) {
    const db = new FakeDb();
    db.onAll((sql) => {
      if (sql.includes('FROM sla_policies')) return [POLICY];
      if (sql.includes('FROM customer_tickets')) return [ticket];
      if (sql.includes('FROM users')) return [mgr];
      return undefined;
    });
    db.onGet((sql) => {
      if (sql.includes('FROM notifications') && opts.notified) return { id: 'n1' };
      if (sql.includes('DATE_SUB') && opts.resolveBreached) return { id: 't1' };
      return undefined;
    });
    return db;
  }

  it('ticket quá response SLA -> leo thang L1 + notify + update', async () => {
    const db = escalationDb();
    const n = await runSlaEscalationCheck(db, '2026-10-02T02:00:00.000Z', '2026-10-02');
    expect(n).toBe(1);
    const upd = db.findCall('UPDATE customer_tickets');
    expect(upd?.params[0]).toBe(1);
    expect(upd?.params[1]).toBe('2026-10-02T02:00:00.000Z');
    const notif = db.findCall("type, title, message, relatedId, isRead");
    expect(notif?.params).toContain('t1:L1');
  });

  it('đã notify hôm nay -> không leo thang trùng', async () => {
    const db = escalationDb({ notified: true });
    const n = await runSlaEscalationCheck(db, '2026-10-02T02:00:00.000Z', '2026-10-02');
    expect(n).toBe(0);
    expect(db.count('UPDATE customer_tickets')).toBe(0);
  });

  it('quá cả resolve SLA -> leo thang thẳng L2', async () => {
    const db = escalationDb({ resolveBreached: true });
    const n = await runSlaEscalationCheck(db, '2026-10-02T02:00:00.000Z', '2026-10-02');
    expect(n).toBe(1);
    expect(db.findCall('UPDATE customer_tickets')?.params[0]).toBe(2);
  });
});

describe('PUT /api/sla-policies/:id', () => {
  function slaApp(db: FakeDb) {
    const app = express();
    app.use(express.json());
    app.use('/api/sla-policies', requireAuth, slaRoutes(db as any));
    return app;
  }
  const employee = makeToken({
    id: 'e1', name: 'E', email: 'e@x.vn', role: 'Employee',
    department: 'Phòng Chăm Sóc Khách Hàng', permissions: [],
  });
  const manager = makeToken({
    id: 'm1', name: 'M', email: 'm@x.vn', role: 'Manager',
    department: 'Phòng Chăm Sóc Khách Hàng', permissions: [],
  });

  it('Employee -> 403', async () => {
    const db = new FakeDb();
    const res = await request(slaApp(db)).put('/api/sla-policies/sla-cs-high')
      .set('Authorization', `Bearer ${employee}`)
      .send({ responseHours: 4, resolveHours: 24 });
    expect(res.status).toBe(403);
  });

  it('Manager số không hợp lệ -> 400', async () => {
    const db = new FakeDb();
    const res = await request(slaApp(db)).put('/api/sla-policies/sla-cs-high')
      .set('Authorization', `Bearer ${manager}`)
      .send({ responseHours: -1, resolveHours: 0 });
    expect(res.status).toBe(400);
    expect(db.count('UPDATE sla_policies')).toBe(0);
  });

  it('Manager hợp lệ -> 200', async () => {
    const db = new FakeDb();
    const res = await request(slaApp(db)).put('/api/sla-policies/sla-cs-high')
      .set('Authorization', `Bearer ${manager}`)
      .send({ responseHours: 4, resolveHours: 24 });
    expect(res.status).toBe(200);
    expect(db.count('UPDATE sla_policies')).toBe(1);
  });
});
