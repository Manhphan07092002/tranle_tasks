import crypto from 'crypto';
import express from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { describe, expect, it, beforeEach } from 'vitest';
import { userRoutes } from '../routes/users.js';
import { requireAuth } from '../middleware/auth.js';
import { assertUnique, DuplicateFieldError } from '../utils/uniqueness.js';

const secret = crypto.randomBytes(32).toString('hex');
process.env.JWT_SECRET = secret;

const employee = { id: 'emp-1', name: 'Emp', email: 'emp@example.test', role: 'Employee', department: 'Engineering', avatar: '', permissions: [] as string[] };
const admin = { ...employee, id: 'admin-1', role: 'Admin' };
const tokenFor = (u: typeof employee) => jwt.sign(u, secret);

const appFor = (db: any) => {
  const app = express();
  app.use(express.json());
  app.use('/api/users', requireAuth, userRoutes(db));
  return app;
};

/**
 * `users.email` had no uniqueness check at all, and no UNIQUE index in the
 * schema. Login resolves it with `SELECT * FROM users WHERE lower(email) =
 * lower(?)` and takes the first row (`routes/auth.ts:95`), so two users sharing
 * an email means the account you land in after authenticating is whichever row
 * MySQL returns. `db.get` here mirrors that: it returns the row only when the
 * email compares equal ignoring case.
 */
function usersDb(opts: { emails?: string[]; currentEmail?: string; isAdminRole?: string } = {}) {
  const emails = opts.emails ?? [];
  const runs: Array<{ sql: string; params: unknown[] }> = [];
  const roleById: Record<string, string> = { 'admin-1': 'Admin' };
  return {
    runs,
    all: async () => [],
    get: async (sql: string, params: unknown[] = []) => {
      if (sql.includes('LOWER(`email`)')) {
        const wanted = String(params[0]).toLowerCase();
        const exclude = sql.includes('id != ?') ? String(params[1]) : null;
        const hit = emails.find((e) => e.toLowerCase() === wanted && e !== exclude);
        return hit ? { id: 'other-user' } : undefined;
      }
      if (sql.includes('SELECT email FROM users WHERE id = ?')) {
        return { email: opts.currentEmail ?? null };
      }
      if (sql.includes('FROM users') && sql.includes('WHERE id = ?')) {
        return { id: String(params[0]), role: roleById[String(params[0])] || 'Employee', isLocked: 0 };
      }
      return undefined;
    },
    run: async (sql: string, params: unknown[] = []) => { runs.push({ sql, params }); return { changes: 1 }; },
  };
}

const auth = `Bearer ${tokenFor(admin)}`;

describe('H-High — email trùng làm hỏng danh tính đăng nhập', () => {
  it('tạo user với email đã có thì bị chặn', async () => {
    const db = usersDb({ emails: ['taken@example.test'] });
    const res = await request(appFor(db)).post('/api/users').set('Authorization', auth)
      .send({ id: 'u-new', name: 'New', email: 'taken@example.test', password: 'Str0ng!passw0rd', role: 'Employee', department: 'D' });
    expect(res.status).toBe(409);
    expect(res.body.error).toContain('đã được sử dụng');
    expect(res.body.field).toBe('email');
    // Quan trọng: không được ghi dòng nào.
    expect(db.runs.some((r) => r.sql.startsWith('INSERT INTO users'))).toBe(false);
  });

  it('email chỉ khác hoa thường vẫn bị coi là trùng, đúng như login tra cứu', async () => {
    const db = usersDb({ emails: ['Taken@Example.test'] });
    const res = await request(appFor(db)).post('/api/users').set('Authorization', auth)
      .send({ id: 'u-new', name: 'New', email: 'taken@example.test', password: 'Str0ng!passw0rd', role: 'Employee', department: 'D' });
    expect(res.status).toBe(409);
  });

  it('email trống hoặc thiếu không bị chặn (user chưa có email vẫn tạo được)', async () => {
    const db = usersDb({ emails: ['taken@example.test'] });
    const res = await request(appFor(db)).post('/api/users').set('Authorization', auth)
      .send({ id: 'u-new', name: 'New', role: 'Employee', department: 'D' });
    expect(res.status).toBe(200);
    expect(db.runs.some((r) => r.sql.startsWith('INSERT INTO users'))).toBe(true);
  });

  it('sửa user sang email của người khác thì bị chặn', async () => {
    const db = usersDb({ emails: ['victim@example.test'], currentEmail: 'me@example.test' });
    const res = await request(appFor(db)).put('/api/users/admin-1').set('Authorization', auth)
      .send({ name: 'Admin', email: 'victim@example.test', role: 'Admin', department: 'D' });
    expect(res.status).toBe(409);
    expect(db.runs.some((r) => r.sql.startsWith('UPDATE users'))).toBe(false);
  });

  it('giữ nguyên email hiện tại của chính mình thì không bị chặn', async () => {
    const db = usersDb({ emails: ['me@example.test'], currentEmail: 'me@example.test' });
    const res = await request(appFor(db)).put('/api/users/admin-1').set('Authorization', auth)
      .send({ name: 'Admin Tên Mới', email: 'me@example.test', role: 'Admin', department: 'D' });
    expect(res.status).toBe(200);
    expect(db.runs.some((r) => r.sql.startsWith('UPDATE users'))).toBe(true);
  });

  it('không gửi email trong payload thì giữ email cũ, không xoá', async () => {
    const db = usersDb({ emails: ['me@example.test'], currentEmail: 'me@example.test' });
    await request(appFor(db)).put('/api/users/admin-1').set('Authorization', auth)
      .send({ name: 'Admin', role: 'Admin', department: 'D' })
      .expect(200);
    const update = db.runs.find((r) => r.sql.startsWith('UPDATE users'))!;
    expect(update.params[1]).toBe('me@example.test');
  });
});

describe('assertUnique — hàm dùng chung', () => {
  // Mảng phải reset trước mỗi test, nếu không test trước để lại SQL sẽ làm
  // các khẳng định về "chưa truy vấn" sai.
  let seen: string[] = [];
  const spy = (hit: unknown) => ({
    get: async (sql: string, params: unknown[]) => { seen.push(sql); return hit ? { id: 'x' } : undefined; },
  });
  beforeEach(() => { seen = []; });

  it('truy vấn LOWER để khớp với cách login tìm user', async () => {
    await assertUnique(spy(null), { table: 'users', column: 'email', value: 'A@B.com' });
    expect(seen[0]).toContain('LOWER(`email`)');
    expect(seen[0]).toContain('LIMIT 1');
  });

  it('loại trừ chính dòng đang sửa khi có excludeId', async () => {
    await assertUnique(spy(null), { table: 'users', column: 'email', value: 'a@b.com', excludeId: 'u-9' });
    expect(seen[0]).toContain('id != ?');
  });

  it('từ chối identifier không hợp lệ thay vì nội suy vào SQL', async () => {
    await expect(assertUnique(spy(null), { table: 'users; DROP TABLE users', column: 'email', value: 'a@b.com' }))
      .rejects.toThrow(/illegal identifier/);
    await expect(assertUnique(spy(null), { table: 'users', column: 'email`, `x', value: 'a@b.com' }))
      .rejects.toThrow(/illegal identifier/);
  });

  it('bỏ qua giá trị rỗng thay vì coi là trùng', async () => {
    for (const v of [undefined, null, '', '   ']) {
      await expect(assertUnique(spy(null), { table: 'users', column: 'email', value: v })).resolves.toBeUndefined();
    }
    expect(seen).toHaveLength(0);
  });

  it('lỗi mang tên trường để route trả 409 kèm field', async () => {
    await expect(assertUnique(spy({ id: 'x' }), { table: 'users', column: 'email', value: 'a@b.com', label: 'Email' }))
      .rejects.toMatchObject({ name: 'DuplicateFieldError', field: 'email' });
  });
});
