import crypto from 'crypto';
import express from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { taskRoutes } from '../routes/tasks.js';
import { documentRoutes } from '../routes/documents.js';
import { requireAuth } from '../middleware/auth.js';

const secret = crypto.randomBytes(32).toString('hex');
process.env.JWT_SECRET = secret;

const employee = { id: 'emp-1', name: 'Emp', email: 'e@t.t', role: 'Employee', department: 'Engineering', avatar: '', permissions: [] as string[] };
const manager = { ...employee, id: 'mgr-1', role: 'Manager', permissions: ['manage_dept_tasks'] };
const tokenFor = (u: typeof employee) => jwt.sign(u, secret);
const authApp = (prefix: string, router: express.Router) => {
  const app = express();
  app.use(express.json());
  app.use(prefix, requireAuth, router);
  return app;
};

type Run = { sql: string; params: unknown[] };

/** Tasks whose creator is someone else, so `employee` acts as a plain assignee. */
function taskDb(overrides: Record<string, any> = {}, assigneeIds: string[] = ['emp-1']) {
  const runs: Run[] = [];
  const db = {
    runs,
    get: async (sql: string) => (sql.includes('FROM tasks') ? { id: 't-1', createdBy: 'boss', department: 'Engineering', ...overrides } : undefined),
    all: async (sql: string, params: unknown[] = []) => {
      if (sql.includes('FROM task_assignees')) return assigneeIds.map((userId) => ({ userId }));
      if (sql.includes('FROM task_comments')) return [
        { id: 'c-existing', userId: 'boss', createdAt: '2026-01-01T00:00:00.000Z' },
      ];
      return [];
    },
    run: async (sql: string, params: unknown[] = []) => { runs.push({ sql, params }); return { changes: 1 }; },
  };
  return db;
}

const insertsInto = (runs: Run[], table: string) => runs.filter((r) => r.sql.startsWith(`INSERT INTO ${table}`));
/** Id-aware mock: 'c-nguoi-khac' is another team's contract, 'r-cua-toi' is my report. */
const docDb = (existing: any) => {
  const runs: Run[] = [];
  const db = {
    runs,
    get: async (sql: string, params: unknown[] = []) => {
      const id = params[0];
      if (sql.includes('FROM contracts')) return id === 'c-nguoi-khac' ? { createdBy: 'other', department: 'Sales' } : undefined;
      if (sql.includes('FROM reports')) return id === 'r-cua-toi' ? { authorId: 'emp-1', department: 'Engineering' } : undefined;
      if (sql.includes('FROM documents')) return existing;
      return undefined;
    },
    all: async () => [],
    run: async (sql: string, params: unknown[] = []) => { runs.push({ sql, params }); return { changes: 1 }; },
  };
  return db;
};

describe('H12 — không mạo danh được bình luận', () => {
  it('bình luận đã có giữ nguyên tác giả, không nhận userId từ client', async () => {
    const db = taskDb();
    const app = authApp('/api/tasks', taskRoutes(db));
    const res = await request(app).put('/api/tasks/t-1')
      .set('Authorization', `Bearer ${tokenFor(employee)}`)
      .send({ title: 'x', status: 'In Progress', comments: [{ id: 'c-existing', userId: 'ceo-1', content: 'xin sua' }] });
    expect(res.status).toBe(200);
    const inserted = insertsInto(db.runs, 'task_comments');
    expect(inserted).toHaveLength(1);
    // Không được đổi thành ceo-1, và thời điểm gốc cũng không được giả.
    expect(inserted[0].params[2]).toBe('boss');
    expect(inserted[0].params[4]).toBe('2026-01-01T00:00:00.000Z');
  });

  it('bình luận mới được gán cho người gửi, không cho id người khác', async () => {
    const db = taskDb();
    const app = authApp('/api/tasks', taskRoutes(db));
    const res = await request(app).put('/api/tasks/t-1')
      .set('Authorization', `Bearer ${tokenFor(employee)}`)
      .send({ title: 'x', status: 'In Progress', comments: [{ userId: 'ceo-1', content: 'toi la GDBH' }] });
    expect(res.status).toBe(200);
    const inserted = insertsInto(db.runs, 'task_comments');
    expect(inserted).toHaveLength(1);
    expect(inserted[0].params[2]).toBe('emp-1');
    expect(inserted[0].params[4]).not.toBe('2026-01-01T00:00:00.000Z');
  });

  it('không hồi sinh được bình luận đã bị xoá mang tên người khác', async () => {
    const db = taskDb();
    const app = authApp('/api/tasks', taskRoutes(db));
    await request(app).put('/api/tasks/t-1')
      .set('Authorization', `Bearer ${tokenFor(employee)}`)
      .send({ title: 'x', status: 'In Progress', comments: [{ id: 'c-ghost', userId: 'ceo-1', content: 'x' }] })
      .expect(200);
    expect(insertsInto(db.runs, 'task_comments')[0].params[2]).toBe('emp-1');
  });
});

describe('H10 — không leo thang được danh sách người được giao', () => {
  it('assignee thuong khong gan duoc viec cho nguoi khac qua PUT', async () => {
    const db = taskDb();
    const app = authApp('/api/tasks', taskRoutes(db));
    const res = await request(app).put('/api/tasks/t-1')
      .set('Authorization', `Bearer ${tokenFor(employee)}`)
      .send({ title: 'x', status: 'In Progress', assignees: ['emp-1', 'victim-9'] });
    expect(res.status).toBe(403);
    expect(db.runs.some((r) => r.sql.startsWith('INSERT INTO task_assignees'))).toBe(false);
  });

  it('assignee thuong van gan duoc chinh minh', async () => {
    const db = taskDb();
    const app = authApp('/api/tasks', taskRoutes(db));
    const res = await request(app).put('/api/tasks/t-1')
      .set('Authorization', `Bearer ${tokenFor(employee)}`)
      .send({ title: 'x', status: 'In Progress', assignees: ['emp-1'] });
    expect(res.status).toBe(200);
    expect(insertsInto(db.runs, 'task_assignees').map((r) => r.params[1])).toEqual(['emp-1']);
  });

  it('nguoi tao cong viec (khong phai assignee) cung bi chan khi gan viec cho nguoi khac', async () => {
    // canEditTask cho phep ca creator lan assignee; guard phai phu ca hai.
    const db = taskDb({ createdBy: 'emp-1' }, ['someone-else']);
    const app = authApp('/api/tasks', taskRoutes(db));
    const res = await request(app).put('/api/tasks/t-1')
      .set('Authorization', `Bearer ${tokenFor(employee)}`)
      .send({ title: 'x', status: 'In Progress', assignees: ['emp-1', 'victim-9'] });
    expect(res.status).toBe(403);
  });

  // canEditTask chỉ cho creator/assignee sửa, nên để Truởng phòng thao tác được
  // thì phải đưa ông vào danh sách assignee.
  it('truong phong van gan duoc cho nguoi khac', async () => {
    const db = taskDb({}, ['mgr-1']);
    const app = authApp('/api/tasks', taskRoutes(db));
    const res = await request(app).put('/api/tasks/t-1')
      .set('Authorization', `Bearer ${tokenFor(manager)}`)
      .send({ title: 'x', status: 'In Progress', assignees: ['mgr-1', 'emp-2'] });
    expect(res.status).toBe(200);
    expect(insertsInto(db.runs, 'task_assignees').map((r) => r.params[1])).toEqual(['mgr-1', 'emp-2']);
  });
});

describe('H11 — không đổi được phòng ban để né duyệt', () => {
  it('assignee thuong khong chuyen duoc sang phong ban khac', async () => {
    const db = taskDb();
    const app = authApp('/api/tasks', taskRoutes(db));
    const res = await request(app).put('/api/tasks/t-1')
      .set('Authorization', `Bearer ${tokenFor(employee)}`)
      .send({ title: 'x', status: 'In Progress', department: 'Phòng Khác' });
    expect(res.status).toBe(200);
    const update = db.runs.find((r) => r.sql.startsWith('UPDATE tasks'))!;
    expect(update.params[7]).toBe('Engineering');
  });

  it('PUT khong gui department thi giu nguyen, khong bien thanh NULL', async () => {
    const db = taskDb();
    const app = authApp('/api/tasks', taskRoutes(db));
    await request(app).put('/api/tasks/t-1')
      .set('Authorization', `Bearer ${tokenFor(employee)}`)
      .send({ title: 'x', status: 'In Progress' })
      .expect(200);
    expect(db.runs.find((r) => r.sql.startsWith('UPDATE tasks'))!.params[7]).toBe('Engineering');
  });

  it('truong phong doi duoc phong ban', async () => {
    const db = taskDb({}, ['mgr-1']);
    const app = authApp('/api/tasks', taskRoutes(db));
    await request(app).put('/api/tasks/t-1')
      .set('Authorization', `Bearer ${tokenFor(manager)}`)
      .send({ title: 'x', status: 'In Progress', department: 'Phòng Khác' })
      .expect(200);
    expect(db.runs.find((r) => r.sql.startsWith('UPDATE tasks'))!.params[7]).toBe('Phòng Khác');
  });
});

describe('M6 — PUT tài liệu cũng phải kiểm tra quyền liên kết', () => {
  it('khong lien ket duoc sang hop dong phong ban khac', async () => {
    const db = docDb({ createdBy: 'emp-1', category: 'contracts' });
    const app = authApp('/api/documents', documentRoutes(db));
    const res = await request(app).put('/api/documents/d-1')
      .set('Authorization', `Bearer ${tokenFor(employee)}`)
      .send({ name: 't', category: 'contracts', linkedId: 'c-nguoi-khac' });
    expect(res.status).toBe(403);
    expect(db.runs.some((r) => r.sql.startsWith('UPDATE documents'))).toBe(false);
  });

  it('lien ket duoc sang bao cao cua chinh minh', async () => {
    const db = docDb({ createdBy: 'emp-1', category: 'reports' });
    const app = authApp('/api/documents', documentRoutes(db));
    const res = await request(app).put('/api/documents/d-1')
      .set('Authorization', `Bearer ${tokenFor(employee)}`)
      .send({ name: 't', category: 'reports', linkedId: 'r-cua-toi' });
    expect(res.status).toBe(200);
    expect(db.runs.find((r) => r.sql.startsWith('UPDATE documents'))!.params[2]).toBe('r-cua-toi');
  });

  it('doi danh muc de né canLinkTo van bi chan', async () => {
    // Hop dong bi chan o category "contracts"; doi sang "reports" de mong co
    // quyen, nhung category moi la "reports" va linkedId thuoc hop dong khac.
    const db = docDb({ createdBy: 'emp-1', category: 'contracts' });
    const app = authApp('/api/documents', documentRoutes(db));
    const res = await request(app).put('/api/documents/d-1')
      .set('Authorization', `Bearer ${tokenFor(employee)}`)
      .send({ name: 't', category: 'reports', linkedId: 'c-nguoi-khac' });
    expect(res.status).toBe(403);
  });

  it('bo lien ket (linkedId rong) van duoc phep', async () => {
    const db = docDb({ createdBy: 'emp-1', category: 'contracts' });
    const app = authApp('/api/documents', documentRoutes(db));
    await request(app).put('/api/documents/d-1')
      .set('Authorization', `Bearer ${tokenFor(employee)}`)
      .send({ name: 't', category: 'contracts', linkedId: '' })
      .expect(200);
    expect(db.runs.find((r) => r.sql.startsWith('UPDATE documents'))!.params[2]).toBeNull();
  });
});

describe('M5 — PUT tài liệu không ghi vào cột updatedAt không tồn tại', () => {
  it('cau lenh UPDATE khong con tham chieu cot updatedAt', async () => {
    const db = docDb({ createdBy: 'emp-1', category: 'contracts' });
    const app = authApp('/api/documents', documentRoutes(db));
    const res = await request(app).put('/api/documents/d-1')
      .set('Authorization', `Bearer ${tokenFor(employee)}`)
      .send({ name: 't', category: 'contracts' });
    expect(res.status).toBe(200);
    const update = db.runs.find((r) => r.sql.startsWith('UPDATE documents'))!;
    expect(update.sql).not.toContain('updatedAt');
    expect(update.params).toEqual(['t', 'contracts', null, 'd-1']);
  });
});
