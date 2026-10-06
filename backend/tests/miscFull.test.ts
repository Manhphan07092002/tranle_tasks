import crypto from 'crypto';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { eventRoutes } from '../routes/events.js';
import { activityRoutes } from '../routes/activity.js';
import { clientRoutes } from '../routes/clients.js';
import { contractLinkRoutes } from '../routes/contractLinks.js';
import { departmentRoutes } from '../routes/departments.js';
import { documentRoutes } from '../routes/documents.js';
import { productRoutes } from '../routes/products.js';
import { roleRoutes } from '../routes/roles.js';
import { aiRoutes } from '../routes/ai.js';
import { mailRoutes } from '../routes/mail.js';
import { uploadRoutes } from '../routes/upload.js';
import { requireAuth, requireAdmin, setAuthDb } from '../middleware/auth.js';
import { ensureBody } from '../middleware/ensureBody.js';

const secret = crypto.randomBytes(32).toString('hex');
process.env.JWT_SECRET = secret;

const employee = { id: 'emp-1', name: 'Emp', email: 'e@t.t', role: 'Employee', department: 'Engineering', avatar: '', permissions: [] as string[] };
const admin = { ...employee, id: 'admin-1', role: 'Admin', permissions: ['admin_panel'] };
const tokenFor = (u: typeof employee) => jwt.sign(u, secret);
const authApp = (prefix: string, router: express.Router) => {
  const app = express();
  app.use(express.json());
  app.use(ensureBody);
  app.use(prefix, requireAuth, router);
  return app;
};

describe('departments/events admin gates', () => {
  it('Employee không tạo/sửa/xóa phòng ban và sự kiện', async () => {
    const db = {
      all: async () => [],
      get: async () => undefined,
      run: async () => ({ changes: 1 }),
    };
    const deptApp = authApp('/api/departments', departmentRoutes(db));
    const evtApp = authApp('/api/events', eventRoutes(db));
    const t = tokenFor(employee);
    expect((await request(deptApp).post('/api/departments').set('Authorization', `Bearer ${t}`).send({ name: 'X' })).status).toBe(403);
    expect((await request(deptApp).put('/api/departments/d-1').set('Authorization', `Bearer ${t}`).send({ name: 'Y' })).status).toBe(403);
    expect((await request(deptApp).delete('/api/departments/d-1').set('Authorization', `Bearer ${t}`)).status).toBe(403);
    expect((await request(evtApp).post('/api/events').set('Authorization', `Bearer ${t}`).send({ title: 'T', date: '2026-01-01' })).status).toBe(403);
    expect((await request(evtApp).delete('/api/events/e-1').set('Authorization', `Bearer ${t}`)).status).toBe(403);
  });
});

describe('documents ownership', () => {
  it('id luôn do server sinh, linkedId lạ bị chặn', async () => {
    const runs: Array<{ sql: string; params: unknown[] }> = [];
    const db = {
      all: async () => [],
      get: async (sql: string) => {
        if (sql.includes('FROM contracts')) return { createdBy: 'someone-else', department: 'Sales' };
        return undefined;
      },
      run: async (sql: string, params: unknown[] = []) => { runs.push({ sql, params }); return { changes: 1 }; },
    };
    const app = authApp('/api/documents', documentRoutes(db));
    const t = tokenFor(employee);
    const blocked = await request(app).post('/api/documents').set('Authorization', `Bearer ${t}`).send({ id: 'squat-id', name: 'x', url: '/uploads/reports/a.png', category: 'contracts', linkedId: 'c-other' });
    expect(blocked.status).toBe(403);
    const created = await request(app).post('/api/documents').set('Authorization', `Bearer ${t}`).send({ id: 'squat-id', name: 'x', url: '/uploads/reports/a.png', category: 'others' });
    expect(created.status).toBe(201);
    expect(created.body.id).not.toBe('squat-id');
    expect(created.body.id.startsWith('doc-')).toBe(true);
  });
});

describe('events/activity/clients', () => {
  it('events CRUD + validate', async () => {
    const runs: string[] = [];
    const db = {
      all: async () => [{ id: 'e-1' }],
      get: async () => undefined,
      run: async (sql: string) => { runs.push(sql); return { changes: 1 }; },
    };
    const app = authApp('/api/events', eventRoutes(db));
    const t = tokenFor(employee);
    const a = tokenFor({ ...employee, id: 'admin-1', role: 'Admin' });
    expect((await request(app).get('/api/events').set('Authorization', `Bearer ${t}`)).body).toEqual([{ id: 'e-1' }]);
    // Employee bị chặn từ guard (403) trước cả validate; Admin thiếu field thì 400.
    expect((await request(app).post('/api/events').set('Authorization', `Bearer ${t}`).send({})).status).toBe(403);
    expect((await request(app).post('/api/events').set('Authorization', `Bearer ${a}`).send({})).status).toBe(400);
    expect((await request(app).post('/api/events').set('Authorization', `Bearer ${a}`).send({ title: 'T', date: '2026-01-01' })).status).toBe(201);
    // PUT không body / không Content-Type cũng phải 404 gọn gàng, không 500.
    expect((await request(app).put('/api/events/nope').set('Authorization', `Bearer ${a}`)).status).toBe(404);
    expect((await request(app).delete('/api/events/e-1').set('Authorization', `Bearer ${a}`)).status).toBe(200);
  });

  // Trước đây test này chỉ kiểm tra "employee đọc được log" và coi đó là hành vi
  // đúng — tức là nó đang bảo vệ chính lỗ hổng. Activity log là nhật ký toàn công
  // ty (ai làm gì lên đối tượng nào), và AdminApp chỉ chặn ở phía UI
  // (AdminApp.tsx:220) nên gọi API trực tiếp là vô hạn.
  it('activity: nhan vien thuong bi tu choi khong doc duoc nhat ky', async () => {
    const db = { all: async () => [{ id: 'l-1', userId: 'emp-1' }] };
    const app = authApp('/api/activity', activityRoutes(db));
    expect((await request(app).get('/api/activity').set('Authorization', `Bearer ${tokenFor(employee)}`)).status).toBe(403);
    expect((await request(app).get('/api/activity/user/admin-1').set('Authorization', `Bearer ${tokenFor(employee)}`)).status).toBe(403);
  });

  it('activity: admin doc duoc va log duoc lam giau ten he thong', async () => {
    const db = {
      all: async (sql: string) => sql.includes('FROM users') ? [{ id: 'emp-1', name: 'Emp' }] : [{ id: 'l-1', userId: 'emp-1' }, { id: 'l-2', userId: 'system' }],
    };
    const app = authApp('/api/activity', activityRoutes(db));
    const res = await request(app).get('/api/activity').set('Authorization', `Bearer ${tokenFor(admin)}`);
    expect(res.status).toBe(200);
    expect(res.body.find((l: any) => l.id === 'l-2').user.name).toBe('Hệ thống');
    expect((await request(app).get('/api/activity/user/emp-1').set('Authorization', `Bearer ${tokenFor(admin)}`)).status).toBe(200);
  });

  it('activity: limit bi kiem soat, khong the do cao nguyen nen', async () => {
    const seen: Array<{ sql: string; params: unknown[] }> = [];
    const db = { all: async (sql: string, params: unknown[] = []) => { seen.push({ sql, params }); return []; } };
    const app = authApp('/api/activity', activityRoutes(db));

    await request(app).get('/api/activity?limit=100000000').set('Authorization', `Bearer ${tokenFor(admin)}`);
    expect(seen.at(-1)!.params[0]).toBe(200);

    await request(app).get('/api/activity?limit=abc').set('Authorization', `Bearer ${tokenFor(admin)}`);
    expect(seen.at(-1)!.params[0]).toBe(50);

    // ?page= ho tro phan trang, offset bi gioi han de khong quet qua ca bang.
    await request(app).get('/api/activity?limit=20&page=3').set('Authorization', `Bearer ${tokenFor(admin)}`);
    expect(seen.at(-1)!.params).toEqual([20, 40]);
    await request(app).get('/api/activity?limit=200&page=99999').set('Authorization', `Bearer ${tokenFor(admin)}`);
    expect(seen.at(-1)!.params).toEqual([200, 99 * 200]);
  });

  it('clients list', async () => {
    const app = authApp('/api/clients', clientRoutes({ all: async () => [{ id: 'c', name: 'C' }] }));
    const res = await request(app).get('/api/clients').set('Authorization', `Bearer ${tokenFor(employee)}`);
    expect(res.body).toEqual([{ id: 'c', name: 'C' }]);
  });
});

describe('contract links', () => {
  const link = { id: 'l-1', outputContractId: 'o', inputContractId: 'i', createdBy: 'emp-1' };
  const dbFor = (contractOwner: string | null) => ({
    all: async () => [],
    get: async (sql: string) => {
      if (sql.includes('FROM contract_links')) return { ...link };
      if (sql.includes('FROM contracts')) return contractOwner ? { createdBy: contractOwner } : undefined;
      return undefined;
    },
    run: async () => ({ changes: 1 }),
  });

  it('validate + authz tạo link', async () => {
    const app = authApp('/api/contract-links', contractLinkRoutes(dbFor('emp-1')));
    const t = tokenFor(employee);
    expect((await request(app).post('/api/contract-links').set('Authorization', `Bearer ${t}`).send({})).status).toBe(400);
    expect((await request(app).post('/api/contract-links').set('Authorization', `Bearer ${t}`).send({ outputContractId: 'o', inputContractId: 'o' })).status).toBe(400);
    expect((await request(app).post('/api/contract-links').set('Authorization', `Bearer ${t}`).send({ outputContractId: 'o', inputContractId: 'i' })).status).toBe(201);
    const appStranger = authApp('/api/contract-links', contractLinkRoutes(dbFor('someone-else')));
    expect((await request(appStranger).post('/api/contract-links').set('Authorization', `Bearer ${t}`).send({ outputContractId: 'o', inputContractId: 'i' })).status).toBe(403);
    const appMissing = authApp('/api/contract-links', contractLinkRoutes(dbFor(null)));
    expect((await request(appMissing).post('/api/contract-links').set('Authorization', `Bearer ${t}`).send({ outputContractId: 'o', inputContractId: 'i' })).status).toBe(404);
  });

  it('sửa/xóa link: 404 khi không có, 403 khi không quyền', async () => {
    const app = authApp('/api/contract-links', contractLinkRoutes({
      all: async () => [], run: async () => ({ changes: 1 }),
      get: async (sql: string) => (sql.includes('FROM contract_links') ? undefined : { createdBy: 'x' }),
    }));
    const t = tokenFor(employee);
    expect((await request(app).put('/api/contract-links/nope').set('Authorization', `Bearer ${t}`).send({})).status).toBe(404);
    expect((await request(app).delete('/api/contract-links/nope').set('Authorization', `Bearer ${t}`)).status).toBe(404);
    const appOwner = authApp('/api/contract-links', contractLinkRoutes(dbFor('emp-1')));
    expect((await request(appOwner).put('/api/contract-links/l-1').set('Authorization', `Bearer ${t}`).send({ linkType: 'procurement' })).status).toBe(200);
    expect((await request(appOwner).delete('/api/contract-links/l-1').set('Authorization', `Bearer ${t}`)).status).toBe(200);
  });
});

describe('departments/documents/products/roles', () => {
  it('departments: validate + chặn xóa khi còn nhân viên + rename lan tỏa', async () => {
    const runs: string[] = [];
    const db = {
      all: async () => [],
      get: async (sql: string) => {
        if (sql.includes('FROM departments WHERE id')) return { id: 'd-1', name: 'Old', description: '', color: '', managerId: null };
        if (sql.includes('COUNT(*)')) return { count: 3 };
        return undefined;
      },
      run: async (sql: string) => { runs.push(sql); return { changes: 1 }; },
    };
    const app = authApp('/api/departments', departmentRoutes(db));
    const t = tokenFor(admin);
    expect((await request(app).post('/api/departments').set('Authorization', `Bearer ${t}`).send({ name: '  ' })).status).toBe(400);
    expect((await request(app).post('/api/departments').set('Authorization', `Bearer ${t}`).send({ name: 'New Dept' })).status).toBe(201);
    expect((await request(app).delete('/api/departments/d-1').set('Authorization', `Bearer ${t}`)).status).toBe(409);
    expect((await request(app).put('/api/departments/d-1').set('Authorization', `Bearer ${t}`).send({ name: 'New' })).status).toBe(200);
    expect(runs.some((s) => s.startsWith('UPDATE users SET department'))).toBe(true);
  });

  it('documents: chặn URL ngoài, bind createdBy, phân quyền sửa/xóa', async () => {
    const runs: Array<{ sql: string; params: unknown[] }> = [];
    const dbFor = (ownerId: string) => ({
      all: async () => [],
      get: async (sql: string) => {
        if (sql.includes('SELECT createdBy, category FROM documents')) return { createdBy: ownerId, category: 'others' };
        if (sql.includes('SELECT * FROM documents')) return { id: 'd-1', createdBy: ownerId, url: '/uploads/reports/a.png', category: 'others', linkedId: null };
        return undefined;
      },
      run: async (sql: string, params: unknown[] = []) => { runs.push({ sql, params }); return { changes: 1 }; },
    });
    const app = authApp('/api/documents', documentRoutes(dbFor('emp-1')));
    const t = tokenFor(employee);
    expect((await request(app).post('/api/documents').set('Authorization', `Bearer ${t}`).send({ name: 'x', url: 'https://evil/x.png', category: 'others' })).status).toBe(400);
    expect((await request(app).post('/api/documents').set('Authorization', `Bearer ${t}`).send({ name: 'x' })).status).toBe(400);
    const created = await request(app).post('/api/documents').set('Authorization', `Bearer ${t}`).send({ name: 'x', url: '/uploads/reports/a.png', category: 'others' });
    expect(created.status).toBe(201);
    expect(runs.find((r) => r.sql.startsWith('INSERT INTO documents'))!.params[7]).toBe('emp-1');
    const appStranger = authApp('/api/documents', documentRoutes(dbFor('other')));
    expect((await request(appStranger).put('/api/documents/d-1').set('Authorization', `Bearer ${t}`).send({ name: 'y' })).status).toBe(403);
    expect((await request(appStranger).delete('/api/documents/d-1').set('Authorization', `Bearer ${t}`)).status).toBe(403);
    expect((await request(app).put('/api/documents/d-1').set('Authorization', `Bearer ${t}`).send({ name: 'y' })).status).toBe(200);
  });

  it('products: check-code, suggest-code, quyền kho, validate giá', async () => {
    const db = {
      all: async (sql: string) => {
        if (sql.includes('SELECT importCode FROM products')) return [{ importCode: 'NK-0007' }, { importCode: 'junk' }];
        return [];
      },
      get: async (sql: string) => {
        if (sql.includes('FROM roles')) return { permissions: JSON.stringify(['manage_warehouse']) };
        if (sql.includes('LOWER(importCode) = LOWER')) return undefined;
        return undefined;
      },
      run: async () => ({ changes: 1 }),
    };
    const app = authApp('/api/products', productRoutes(db));
    const t = tokenFor(employee);
    expect((await request(app).get('/api/products/check-code').set('Authorization', `Bearer ${t}`)).body).toEqual({ exists: false });
    expect((await request(app).get('/api/products/suggest-code?prefix=NK-').set('Authorization', `Bearer ${t}`)).body).toEqual({ suggestedCode: 'NK-0008' });
    expect((await request(app).post('/api/products').set('Authorization', `Bearer ${t}`).send({ name: 'P', importPrice: 100, salePrice: 50 })).status).toBe(400);
    expect((await request(app).post('/api/products').set('Authorization', `Bearer ${t}`).send({ name: 'P', importPrice: 100, salePrice: 150 })).status).toBe(201);
    // Không quyền kho
    const noPerm = authApp('/api/products', productRoutes({
      all: async () => [], run: async () => ({ changes: 1 }),
      get: async () => ({ permissions: '[]' }),
    }));
    expect((await request(noPerm).post('/api/products').set('Authorization', `Bearer ${t}`).send({ name: 'P', importPrice: 1, salePrice: 2 })).status).toBe(403);
  });

  it('roles: đọc mở, ghi chỉ admin', async () => {
    const db = {
      all: async () => [{ id: 'r', name: 'Employee', permissions: '[]', isSystem: 1 }],
      get: async (sql: string) => {
        if (sql.includes('COUNT(*)')) return { count: 0 };
        return undefined;
      },
      run: async () => ({ changes: 1 }),
    };
    const app = authApp('/api/roles', roleRoutes(db));
    expect((await request(app).get('/api/roles').set('Authorization', `Bearer ${tokenFor(employee)}`)).status).toBe(200);
    expect((await request(app).post('/api/roles').set('Authorization', `Bearer ${tokenFor(employee)}`).send({ name: 'X' })).status).toBe(403);
    expect((await request(app).post('/api/roles').set('Authorization', `Bearer ${tokenFor(admin)}`).send({ id: 'rx', name: 'X', permissions: '[]' })).status).toBe(201);
    expect((await request(app).delete('/api/roles/nope').set('Authorization', `Bearer ${tokenFor(admin)}`)).status).toBe(404);
  });
});

describe('ai endpoints', () => {
  const db = {
    get: async (sql: string) => {
      if (sql.includes('ai_provider')) return { value: 'gemini' };
      return { value: '[]' };
    },
  };
  it('status + keys-status masked + validate input', async () => {
    const app = authApp('/api/ai', aiRoutes(db));
    const status = await request(app).get('/api/ai/status').set('Authorization', `Bearer ${tokenFor(employee)}`);
    expect(status.body).toEqual({ configured: false, provider: 'gemini', keyCount: 0 });
    expect((await request(app).post('/api/ai/test-key').set('Authorization', `Bearer ${tokenFor(admin)}`).send({})).status).toBe(400);
    expect((await request(app).post('/api/ai/generate-subtasks').set('Authorization', `Bearer ${tokenFor(admin)}`).send({})).status).toBe(400);
    expect((await request(app).post('/api/ai/generate-details').set('Authorization', `Bearer ${tokenFor(admin)}`).send({})).status).toBe(400);
    expect((await request(app).post('/api/ai/generate-tasks-from-goal').set('Authorization', `Bearer ${tokenFor(admin)}`).send({})).status).toBe(400);
    expect((await request(app).post('/api/ai/chat-stream').set('Authorization', `Bearer ${tokenFor(admin)}`).send({})).status).toBe(400);
  });

  it('từ chối input quá khổ (quota-DoS guard)', async () => {
    const app = authApp('/api/ai', aiRoutes(db));
    const t = tokenFor(admin);
    expect((await request(app).post('/api/ai/chat-stream').set('Authorization', `Bearer ${t}`).send({ message: 'x'.repeat(5000) })).status).toBe(400);
    expect((await request(app).post('/api/ai/chat-stream').set('Authorization', `Bearer ${t}`).send({ message: 'hi', history: Array.from({ length: 25 }, () => ({ role: 'user', text: 'hi' })) })).status).toBe(400);
    expect((await request(app).post('/api/ai/chat-stream').set('Authorization', `Bearer ${t}`).send({ message: 'hi', contextString: 'x'.repeat(25000) })).status).toBe(400);
    expect((await request(app).post('/api/ai/generate-subtasks').set('Authorization', `Bearer ${t}`).send({ taskTitle: 'x'.repeat(600) })).status).toBe(400);
  });
});

describe('mail validation', () => {
  const db = { get: async () => undefined, all: async () => [], run: async () => ({ changes: 1 }) };
  // mailRoutes tự gắn requireAuth từng route — mount trần để giữ nguyên semantics (kể cả pixel public).
  const bareApp = () => {
    const app = express();
    app.use(express.json());
    app.use('/api/mail', mailRoutes(db));
    return app;
  };
  const app = bareApp();
  const t = () => `Bearer ${tokenFor(employee)}`;

  it('chặn custom host nội bộ/metadata + port lạ', async () => {
    const evilHosts = ['127.0.0.1', '10.0.0.5', '192.168.1.1', '172.16.0.1', '169.254.169.254', 'localhost', 'mysql:3306', '0.0.0.0'];
    for (const h of evilHosts) {
      const res = await request(app).post('/api/mail/connect').set('Authorization', t()).send({ email: 'a@b.c', password: 'x', provider: 'custom', customImapHost: h, customSmtpHost: h });
      expect(res.status).toBe(400);
    }
    const badPort = await request(app).post('/api/mail/connect').set('Authorization', t()).send({ email: 'a@b.c', password: 'x', provider: 'custom', customImapHost: 'mail.example.com', customImapPort: 3306, customSmtpHost: 'mail.example.com' });
    expect(badPort.status).toBe(400);
  });

  it('connect validate + chặn CRLF injection', async () => {
    expect((await request(app).post('/api/mail/connect').set('Authorization', t()).send({})).status).toBe(400);
    expect((await request(app).post('/api/mail/connect').set('Authorization', t()).send({ email: 'a@b.c\r\nINJECT', password: 'x' })).status).toBe(400);
  });

  it('send validate', async () => {
    expect((await request(app).post('/api/mail/send').set('Authorization', t()).send({})).status).toBe(400);
    expect((await request(app).post('/api/mail/send').set('Authorization', t()).send({ to: 'not-an-email', subject: 's' })).status).toBe(400);
    expect((await request(app).post('/api/mail/send').set('Authorization', t()).send({ to: 'a@b.c\r\nBcc:evil@x.y', subject: 's' })).status).toBe(400);
    expect((await request(app).post('/api/mail/send').set('Authorization', t()).send({ to: 'a@b.c', subject: 'x'.repeat(300) })).status).toBe(400);
  });

  it('bulk/star/read/message validate', async () => {
    expect((await request(app).post('/api/mail/bulk').set('Authorization', t()).send({ action: 'delete' })).status).toBe(400);
    expect((await request(app).post('/api/mail/bulk').set('Authorization', t()).send({ uids: ['1;DROP'], action: 'delete' })).status).toBe(400);
    expect((await request(app).patch('/api/mail/message/abc/star').set('Authorization', t()).send({})).status).toBe(400);
    expect((await request(app).get('/api/mail/message/abc').set('Authorization', t())).status).toBe(400);
  });

  it('tracking pixel public + stats cần auth', async () => {
    const gif = await request(app).get('/api/mail/track/abc123XYZ.gif');
    expect(gif.status).toBe(200);
    expect(gif.headers['content-type']).toContain('image/gif');
    expect((await request(app).get('/api/mail/tracking-stats')).status).toBe(401);
    expect((await request(app).get('/api/mail/tracking-stats').set('Authorization', t())).status).toBe(200);
  });

  it('mail không creds trả 401 mail-auth, không leak', async () => {
    const res = await request(app).get('/api/mail/inbox').set('Authorization', t());
    expect(res.status).toBe(401);
    expect(res.body.error).not.toContain('credentials');
  });
});

describe('upload routes', () => {
  const __filename = fileURLToPath(import.meta.url);
  const uploadsDir = path.resolve(path.dirname(__filename), '../../uploads/reports');

  it('từ chối khi không có file và chặn .html giả mimetype', async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/upload', (req: any, _res: any, next: any) => { req.user = employee; next(); }, uploadRoutes());
    expect((await request(app).post('/api/upload')).status).toBe(400);
    const evil = await request(app).post('/api/upload').attach('files', Buffer.from('<script>alert(1)</script>'), { filename: 'shell.html', contentType: 'image/jpeg' });
    expect(evil.status).toBe(400);
  });

  it('nhận png hợp lệ, tên file ngẫu nhiên an toàn', async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/upload', (req: any, _res: any, next: any) => { req.user = employee; next(); }, uploadRoutes());
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const res = await request(app).post('/api/upload').attach('files', png, { filename: 'photo.png', contentType: 'image/png' });
    expect(res.status).toBe(200);
    const url = res.body.files[0].url as string;
    expect(url).toMatch(/^\/uploads\/reports\/[0-9a-f]{24}\.png$/);
    await fs.promises.unlink(path.join(uploadsDir, path.basename(url)));
  });
});

describe('auth middleware', () => {
  afterEach(() => setAuthDb(null));

  const gate = () => {
    const app = express();
    app.use(express.json());
    app.get('/private', requireAuth, (_req, res) => res.json({ ok: true }));
    app.get('/admin', requireAuth, requireAdmin, (_req, res) => res.json({ ok: true }));
    return app;
  };

  it('thiếu/sai/hết hạn token đều 401', async () => {
    const app = gate();
    expect((await request(app).get('/private')).status).toBe(401);
    expect((await request(app).get('/private').set('Authorization', 'Bearer garbage')).status).toBe(401);
    const expired = jwt.sign({ id: 'x' }, secret, { expiresIn: '-10s' });
    expect((await request(app).get('/private').set('Authorization', `Bearer ${expired}`)).status).toBe(401);
  });

  it('không còn fallback cookie access — chỉ Bearer header', async () => {
    const app = express();
    app.use(express.json());
    const { cookiesMiddleware } = await import('../middleware/auth.js');
    app.use(cookiesMiddleware);
    app.get('/private', requireAuth, (_req, res) => res.json({ ok: true }));
    // Cookie lạ không xác thực được (tránh nhầm lẫn audit: chỉ refresh cookie mới có ý nghĩa).
    const res = await request(app).get('/private').set('Cookie', `tranle_access=${tokenFor(employee)}`);
    expect(res.status).toBe(401);
    expect((await request(app).get('/private').set('Authorization', `Bearer ${tokenFor(employee)}`)).status).toBe(200);
  });

  it('DB freshness: khóa/xóa/hạ quyền có hiệu lực ngay', async () => {
    const state = { role: 'Admin', isLocked: 0 as number, exists: true };
    setAuthDb({
      get: async () => (state.exists ? { id: 'admin-1', role: state.role, isLocked: state.isLocked, lockedUntil: null } : undefined),
    });
    const app = gate();
    const t = tokenFor(admin);
    expect((await request(app).get('/private').set('Authorization', `Bearer ${t}`)).status).toBe(200);
    state.isLocked = 1;
    expect((await request(app).get('/private').set('Authorization', `Bearer ${t}`)).status).toBe(403);
    state.isLocked = 0;
    state.exists = false;
    expect((await request(app).get('/private').set('Authorization', `Bearer ${t}`)).status).toBe(401);
    state.exists = true;
    state.role = 'Employee';
    expect((await request(app).get('/admin').set('Authorization', `Bearer ${t}`)).status).toBe(403);
  });
});
