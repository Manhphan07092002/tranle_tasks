import express from 'express';
import rateLimit from 'express-rate-limit';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { resolveTrustProxy, describeTrustProxy } from '../utils/trustProxy.js';

/**
 * Mirrors how server.ts wires the login limiter: express-rate-limit keys its
 * store on req.ip, which express derives from X-Forwarded-For according to the
 * `trust proxy` setting. A forged header therefore either changes the key (rate
 * limit defeated) or does not (limit holds).
 */
function limiterApp(trustProxy: false | number | string[]) {
  const app = express();
  app.set('trust proxy', trustProxy);
  const limiter = rateLimit({ windowMs: 60_000, max: 3, standardHeaders: true, legacyHeaders: false });
  app.get('/login', limiter, (req, res) => { res.json({ ip: req.ip }); });
  return app;
}

const env = (o: Record<string, string | undefined>) => o as NodeJS.ProcessEnv;

describe('H8 — cấu hình trust proxy theo môi trường', () => {
  it('ưu tiên TRUST_PROXY_CIDRS, tách theo dấu phẩy và bỏ khoảng trắng', () => {
    expect(resolveTrustProxy(env({ TRUST_PROXY_CIDRS: '10.0.0.0/8, 192.168.1.5 ,10.0.0.1' })))
      .toEqual(['10.0.0.0/8', '192.168.1.5', '10.0.0.1']);
  });

  it('CHỈ khi CIDR rỗng mới dùng số hop', () => {
    expect(resolveTrustProxy(env({ TRUST_PROXY_CIDRS: '10.0.0.0/8', TRUST_PROXY_HOPS: '3' })))
      .toEqual(['10.0.0.0/8']);
    expect(resolveTrustProxy(env({ TRUST_PROXY_HOPS: '3' }))).toBe(3);
  });

  it('TRUST_PROXY=none tắt hẳn việc tin header', () => {
    for (const v of ['none', 'NONE', 'false', 'off', ' none ']) {
      expect(resolveTrustProxy(env({ TRUST_PROXY: v }))).toBe(false);
    }
  });

  it('không cấu hình thì giữ 1 hop để không phá rate limit đang chạy', () => {
    // Không được fail-closed: loginLimiter chỉ cho 10 lần / 15 phút, mọi người
    // dùng chung IP proxy sẽ bị khoá cả công ty.
    expect(resolveTrustProxy(env({}))).toBe(1);
    expect(resolveTrustProxy(env({ TRUST_PROXY_HOPS: '0' }))).toBe(1);
    expect(resolveTrustProxy(env({ TRUST_PROXY_HOPS: 'abc' }))).toBe(1);
  });

  it('cảnh báo chỉ hiện khi thật sự chưa cấu hình', () => {
    expect(describeTrustProxy(1, env({}))).toContain('TRUST_PROXY_CIDRS');
    expect(describeTrustProxy(1, env({ TRUST_PROXY_HOPS: '1' }))).toBe('');
    expect(describeTrustProxy(['10.0.0.0/8'], env({ TRUST_PROXY_CIDRS: '10.0.0.0/8' }))).toBe('');
  });
});

describe('H8 — header X-Forwarded-For giả không lách được khoá đăng nhập', () => {
  it('khi chỉ tin CIDR của proxy, IP nhìn thấy không đổi theo header giả', async () => {
    const app = limiterApp(resolveTrustProxy(env({ TRUST_PROXY_CIDRS: '10.0.0.0/8' })));
    // supertest kết nối từ 127.0.0.1 — KHÔNG thuộc CIDR của proxy, nên header bị bỏ.
    const a = await request(app).get('/login').set('X-Forwarded-For', '1.2.3.4');
    const b = await request(app).get('/login').set('X-Forwarded-For', '9.9.9.9');
    expect(a.body.ip).toBe(b.body.ip);
    expect(a.body.ip).not.toBe('1.2.3.4');
  });

  it('cùng IP thật thì vẫn bị khoá sau 3 lần, kể cả khi đổi header giả', async () => {
    const app = limiterApp(resolveTrustProxy(env({ TRUST_PROXY_CIDRS: '10.0.0.0/8' })));
    expect((await request(app).get('/login').set('X-Forwarded-For', '1.1.1.1')).status).toBe(200);
    expect((await request(app).get('/login').set('X-Forwarded-For', '2.2.2.2')).status).toBe(200);
    expect((await request(app).get('/login').set('X-Forwarded-For', '3.3.3.3')).status).toBe(200);
    // Lần 4 phải bị chặn, dù client đổi header để né.
    expect((await request(app).get('/login').set('X-Forwarded-For', '4.4.4.4')).status).toBe(429);
    expect((await request(app).get('/login').set('X-Forwarded-For', '5.5.5.5')).status).toBe(429);
  });

  it('khi bỏ hẳn trust proxy thì header hoàn toàn bị bỏ qua', async () => {
    const app = limiterApp(resolveTrustProxy(env({ TRUST_PROXY: 'none' })));
    const a = await request(app).get('/login').set('X-Forwarded-For', '1.2.3.4');
    expect(a.body.ip).not.toBe('1.2.3.4');
    expect(a.body.ip).toBe('::ffff:127.0.0.1');
  });

  it('chế độ hop count vẫn để lộ địa chỉ client gần nhất — đó là lý do cần CIDR', async () => {
    // Ghi nhận hành vi mặc định (1 hop) để tài liệu khỏi sai: header được tin một
    // phần, nên nếu proxy GỘP sẵn XFF do client gửi thì client vẫn chọn được IP.
    const app = limiterApp(resolveTrustProxy(env({ TRUST_PROXY_HOPS: '1' })));
    const res = await request(app).get('/login').set('X-Forwarded-For', '8.8.8.8');
    expect(res.body.ip).toBe('8.8.8.8');
  });
});
