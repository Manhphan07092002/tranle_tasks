import crypto from 'crypto';
import express from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { adminRoutes } from '../routes/admin.js';
import { requireAuth } from '../middleware/auth.js';

const secret = crypto.randomBytes(32).toString('hex');
process.env.JWT_SECRET = secret;
process.env.MAIL_ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');

const admin = { id: 'admin-1', name: 'A', email: 'a@t.t', role: 'Admin', department: 'D', avatar: '', permissions: ['admin_panel'] };

function adminDb() {
  const runs: Array<{ sql: string; params: unknown[] }> = [];
  const config: Record<string, string> = {};
  return {
    runs,
    config,
    all: async (sql: string, params: unknown[] = []) => {
      if (sql.includes('information_schema.tables')) return [{ name: 'users' }, { name: 'events' }, { name: 'system_config' }];
      if (sql.includes('events')) return [{ id: 'e-1', title: 'T', password: 'should-be-redacted' }];
      if (sql.includes('SELECT `key`, `value` FROM system_config')) {
        return Object.entries(config).map(([key, value]) => ({ key, value }));
      }
      if (sql.includes('mail_quotas')) return [];
      return [];
    },
    get: async (sql: string, params: unknown[] = []) => {
      if (sql.includes('COUNT(*)')) return { count: 1 };
      if (sql.includes('FROM system_config') && params.length > 0) {
        const v = config[String(params[0])];
        return v !== undefined ? { value: v } : undefined;
      }
      return undefined;
    },
    run: async (sql: string, params: unknown[] = []) => {
      runs.push({ sql, params });
      if (sql.startsWith('INSERT INTO system_config')) config[String(params[0])] = String(params[1]);
      return { changes: 1 };
    },
  };
}

function appFor(db: ReturnType<typeof adminDb>) {
  const app = express();
  app.use(express.json());
  app.use('/api/admin', requireAuth, adminRoutes(db, { getSystemConfig: async () => ({}), createTransporter: async () => ({ transporter: null, smtp: {} }) }));
  return app;
}

const auth = `Bearer ${jwt.sign(admin, secret)}`;

describe('admin db browser', () => {
  it('chỉ liệt kê bảng allowlist, chặn users/system_config', async () => {
    const app = appFor(adminDb());
    const tables = await request(app).get('/api/admin/database/tables').set('Authorization', auth);
    expect(tables.status).toBe(200);
    expect(tables.body.map((t: any) => t.name)).toEqual(['events']);
    expect((await request(app).get('/api/admin/database/table/users').set('Authorization', auth)).status).toBe(403);
    expect((await request(app).get('/api/admin/database/table/system_config').set('Authorization', auth)).status).toBe(403);
    expect((await request(app).get('/api/admin/database/table/password_reset_tokens').set('Authorization', auth)).status).toBe(403);
  });

  it('dữ liệu nhạy cảm bị redact', async () => {
    const app = appFor(adminDb());
    const res = await request(app).get('/api/admin/database/table/events').set('Authorization', auth);
    expect(res.status).toBe(200);
    expect(res.body.rows[0].password).toBe('[REDACTED]');
  });

  it('chặn xóa dòng ở bảng nhạy cảm', async () => {
    const db = adminDb();
    const app = appFor(db);
    expect((await request(app).delete('/api/admin/database/table/users/row/1').set('Authorization', auth)).status).toBe(403);
    expect((await request(app).delete('/api/admin/database/table/events/row/1').set('Authorization', auth)).status).toBe(200);
    expect(db.runs.some((r) => r.sql.includes('DELETE FROM `events`'))).toBe(true);
  });

  it('activity_logs là append-only: không xóa được qua DB browser', async () => {
    // Trước đây allowlist có activity_logs và chỉ chặn roles/departments, nên admin
    // xóa được từng dòng log — tức là xóa được dấu vết "ai duyệt khoản này", và
    // audit ghi lại chỉ có tên bảng, không có id dòng bị xóa.
    const db = adminDb();
    const app = appFor(db);
    const res = await request(app).delete('/api/admin/database/table/activity_logs/row/log-1').set('Authorization', auth);
    expect(res.status).toBe(403);
    expect(res.body.error).toContain('append-only');
    expect(db.runs.some((r) => r.sql.includes('DELETE FROM `activity_logs`'))).toBe(false);
  });

  it('xoá dòng thường thì lưu lại nội dung dòng bị xoá trong audit', async () => {
    const db = adminDb();
    const app = appFor(db);
    await request(app).delete('/api/admin/database/table/events/row/evt-9').set('Authorization', auth).expect(200);
    const audit = db.runs.find((r) => r.sql.startsWith('INSERT INTO activity_logs') && r.params[2] === 'admin.db_row_deleted');
    expect(audit).toBeTruthy();
    const metadata = JSON.parse(audit!.params[5] as string);
    expect(metadata.table).toBe('events');
    expect(metadata.rowId).toBe('evt-9');
    // Không có dòng lưu thì hành động vẫn ghi được id, để không mất hoàn toàn dấu vết.
    expect(metadata).toHaveProperty('removed');
  });

  it('export không chứa users thô, secret bị che', async () => {
    const db = adminDb();
    db.config['SMTP_PASS'] = 'supersecret';
    db.config['company_name'] = 'Tran Le';
    const app = appFor(db);
    const res = await request(app).get('/api/admin/database/export').set('Authorization', auth);
    expect(res.status).toBe(200);
    expect(res.body.users).toBeUndefined();
    expect(res.body.password_reset_tokens).toBeUndefined();
    const sysCfg = res.body.system_config as Array<{ key: string; value: string }>;
    expect(sysCfg.find((r) => r.key === 'SMTP_PASS')?.value).toBe('[REDACTED]');
    expect(sysCfg.find((r) => r.key === 'company_name')?.value).toBe('Tran Le');
    expect(JSON.stringify(res.body)).not.toContain('supersecret');
  });

  it('import bỏ qua bảng nhạy cảm, validate shape', async () => {
    const db = adminDb();
    const app = appFor(db);
    const payload = {
      users: [{ id: 'hacker', role: 'Admin' }],
      system_config: [{ key: 'x', value: 'y' }],
      events: [{ id: 'e-1', title: 'T' }],
    };
    const res = await request(app).post('/api/admin/database/import').set('Authorization', auth).attach('file', Buffer.from(JSON.stringify(payload)), 'import.json');
    expect(res.status).toBe(200);
    expect(db.runs.some((r) => r.sql.includes('`users`'))).toBe(false);
    expect(db.runs.some((r) => r.sql.includes('`system_config`'))).toBe(false);
    expect(db.runs.some((r) => r.sql.includes('`events`'))).toBe(true);
    const badShape = await request(app).post('/api/admin/database/import').set('Authorization', auth).attach('file', Buffer.from(JSON.stringify({ events: [{ id: 'e', 'a`b': 1 }] })), 'bad.json');
    expect(badShape.status).toBe(400);
    const notJson = await request(app).post('/api/admin/database/import').set('Authorization', auth).attach('file', Buffer.from('not json'), 'bad.json');
    expect(notJson.status).toBe(400);
  });
});

describe('admin secrets config', () => {
  it('ai-keys GET chỉ trả masked, POST mã hóa khi lưu', async () => {
    const db = adminDb();
    const { encrypt } = await import('../utils/cryptoUtils.js');
    db.config['gemini_api_keys'] = encrypt(JSON.stringify(['AIzaSy-real-secret-key-12345']));
    db.config['ai_provider'] = 'gemini';
    const app = appFor(db);
    const get = await request(app).get('/api/admin/system-config/ai-keys').set('Authorization', auth);
    expect(get.status).toBe(200);
    expect(JSON.stringify(get.body)).not.toContain('AIzaSy-real-secret-key-12345');
    expect(get.body.keysMap.gemini[0]).toContain('****');
    // Thêm key mới qua addKeys
    const post = await request(app).post('/api/admin/system-config/ai-keys').set('Authorization', auth).send({ addKeys: { gemini: ['AIzaSy-brand-new-key-999'] }, provider: 'groq' });
    expect(post.status).toBe(200);
    expect(db.config['gemini_api_keys'].startsWith('gcm:')).toBe(true);
    expect(db.config['ai_provider']).toBe('groq');
  });

  it('smtp POST mã hóa SMTP_PASS, poste-api chặn URL lạ', async () => {
    const db = adminDb();
    const app = appFor(db);
    const smtp = await request(app).post('/api/admin/system-config/smtp').set('Authorization', auth).send({ SMTP_HOST: 'smtp.x', SMTP_PASS: 'mail-secret' });
    expect(smtp.status).toBe(200);
    expect(db.config['SMTP_PASS'].startsWith('gcm:')).toBe(true);
    const badUrl = await request(app).post('/api/admin/system-config/poste-api').set('Authorization', auth).send({ POSTE_API_URL: 'ftp://evil/x' });
    expect(badUrl.status).toBe(400);
    const meta = await request(app).post('/api/admin/system-config/poste-api').set('Authorization', auth).send({ POSTE_API_URL: 'http://169.254.169.254/' });
    expect(meta.status).toBe(400);
    const ok = await request(app).post('/api/admin/system-config/poste-api').set('Authorization', auth).send({ POSTE_API_URL: 'http://tranle_mailserver:8080/admin/api', POSTE_API_USER: 'u' });
    expect(ok.status).toBe(200);
  });

  it('import chạy trong transaction + chặn private IP cho poste', async () => {
    const db = adminDb();
    const app = appFor(db);
    await request(app).post('/api/admin/database/import').set('Authorization', auth).attach('file', Buffer.from(JSON.stringify({ events: [{ id: 'e-1' }] })), 'ok.json');
    const seq = db.runs.map((r) => r.sql);
    expect(seq[0]).toBe('BEGIN TRANSACTION');
    expect(seq).toContain('COMMIT');
    // COMMIT phải xảy ra trước audit-log (không ghi gì sau commit ngoài audit).
    expect(seq.indexOf('COMMIT')).toBeLessThan(seq.findIndex((s) => s.startsWith('INSERT INTO activity_logs')));
    for (const host of ['http://192.168.0.1/', 'http://10.1.2.3/', 'http://127.0.0.1:8080/', 'http://169.254.169.254/']) {
      const res = await request(app).post('/api/admin/system-config/poste-api').set('Authorization', auth).send({ POSTE_API_URL: host });
      expect(res.status).toBe(400);
    }
    const internal = await request(app).post('/api/admin/system-config/poste-api').set('Authorization', auth).send({ POSTE_API_URL: 'http://tranle_mailserver:8080/admin/api', POSTE_API_USER: 'u' });
    expect(internal.status).toBe(200);
  });

  it('stats không lộ node/platform/memory', async () => {
    const app = appFor(adminDb());
    const res = await request(app).get('/api/admin/stats').set('Authorization', auth);
    expect(res.status).toBe(200);
    expect(res.body.systemInfo?.nodeVersion).toBeUndefined();
    expect(res.body.systemInfo?.platform).toBeUndefined();
    expect(res.body.systemInfo?.memoryUsage).toBeUndefined();
  });
});
