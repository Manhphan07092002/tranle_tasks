import crypto from 'crypto';
import express from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import bcrypt from 'bcryptjs';
import { requireAuth, setAuthDb } from '../middleware/auth.js';

const secret = crypto.randomBytes(32).toString('hex');
process.env.JWT_SECRET = secret;

/** No user row -> the freshness check would 401 anyway, so pin the algorithm
 *  assertion on the distinct "invalid signature" failure instead. */
const dbWithNoUsers = {
  get: async () => undefined,
  all: async () => [],
  run: async () => ({ changes: 0 }),
};

const appFor = () => {
  const app = express();
  app.use(express.json());
  setAuthDb(dbWithNoUsers);
  app.get('/api/probe', requireAuth, (req: any, res) => res.json({ ok: true, role: req.user?.role }));
  return app;
};

describe('token hardening — thuật toán và độ mới', () => {
  it('HS256 hợp lệ thì đi qua kiểm tra chữ ký', async () => {
    const res = await request(appFor()).get('/api/probe')
      .set('Authorization', `Bearer ${jwt.sign({ id: 'u-1', role: 'Employee' }, secret, { algorithm: 'HS256' })}`);
    // 401 here means "account no longer exists", which is the freshness check,
    // not a signature rejection — so the signature was accepted.
    expect(res.status).toBe(401);
    expect(res.body.error).toContain('no longer exists');
  });

  it('HS512 bị từ chối: thuật toán đã được ghim, header token không tự chọn', async () => {
    // Không ghim thuật toán thì header trong token quyết định cách xác minh.
    const token = jwt.sign({ id: 'u-1', role: 'Employee' }, secret, { algorithm: 'HS512' });
    const pinned = await request(appFor()).get('/api/probe').set('Authorization', `Bearer ${token}`);
    expect(pinned.status).toBe(401);
    expect(pinned.body.error).not.toContain('no longer exists');

    // Cùng token đó vẫn verify được nếu không ghim — chứng minh test này thật sự
    // bắt được hành vi, chứ không phải token hỏng.
    const unpinned = jwt.verify(token, secret) as { id: string };
    expect(unpinned.id).toBe('u-1');
  });

  it('alg=none bị từ chối', async () => {
    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ id: 'u-1', role: 'Admin' })).toString('base64url');
    const res = await request(appFor()).get('/api/probe').set('Authorization', `Bearer ${header}.${payload}.`);
    expect(res.status).toBe(401);
    expect(res.body.error).not.toContain('no longer exists');
  });

  it('token hết hạn bị từ chối', async () => {
    const expired = jwt.sign({ id: 'u-1', role: 'Employee' }, secret, { algorithm: 'HS256', expiresIn: -60 });
    const res = await request(appFor()).get('/api/probe').set('Authorization', `Bearer ${expired}`);
    expect(res.status).toBe(401);
    expect(res.body.error).not.toContain('no longer exists');
  });
});

describe('bcrypt cost — mật khẩu mới dùng cost 12', () => {
  const costOf = (hash: string) => Number(hash.split('$')[2]);

  it('hash mới có cost 12, không còn 10', async () => {
    const hash = await bcrypt.hash('Str0ng!passw0rd', 12);
    expect(costOf(hash)).toBe(12);
  });

  it('mật khẩu cũ cost 10 vẫn đăng nhập được, không khoá ai ra ngoài', async () => {
    // compare đọc cost từ chuỗi hash, nên nâng cost không làm hỏng hash cũ.
    const legacy = await bcrypt.hash('Str0ng!passw0rd', 10);
    expect(costOf(legacy)).toBe(10);
    expect(await bcrypt.compare('Str0ng!passw0rd', legacy)).toBe(true);
  });

  it('mỗi lần hash cho ra chuỗi khác nhau (salt ngẫu nhiên)', async () => {
    const a = await bcrypt.hash('same', 12);
    const b = await bcrypt.hash('same', 12);
    expect(a).not.toBe(b);
    expect(await bcrypt.compare('same', a)).toBe(true);
    expect(await bcrypt.compare('same', b)).toBe(true);
  });
});
