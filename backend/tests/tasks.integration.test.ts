import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { FakeDb } from './helpers/fakeDb.js';
import { createTestApp, makeToken } from './helpers/createTestApp.js';

const employeeToken = makeToken({
  id: 'user-1',
  name: 'Nguyen Van A',
  email: 'a@example.com',
  role: 'Employee',
  department: 'dept-sales',
  permissions: [],
});

describe('GET /api/tasks', () => {
  let db: FakeDb;

  beforeEach(() => {
    db = new FakeDb();
    db.onAll((sql) => {
      if (sql.includes('FROM tasks t')) {
        return [
          {
            id: 'task-1',
            title: 'Lắp đặt inverter SAJ',
            description: '',
            startDate: '2026-09-01',
            dueDate: '2026-09-15',
            departmentName: null,
            departmentCode: null,
            projectName: null,
            projectCode: null,
          },
        ];
      }
      if (sql.includes('task_assignees')) return [{ taskId: 'task-1', userId: 'user-1' }, { taskId: 'task-1', userId: 'user-2' }];
      if (sql.includes('task_tags')) return [{ taskId: 'task-1', tag: 'solar' }];
      if (sql.includes('task_subtasks')) return [{ id: 'sub-1', taskId: 'task-1', title: 'Kiểm tra đấu dây', isCompleted: 1 }];
      if (sql.includes('task_comments')) return [];
      return undefined;
    });
  });

  it('không có token → 401 (requireAuth)', async () => {
    const res = await request(createTestApp(db)).get('/api/tasks');
    expect(res.status).toBe(401);
  });

  it('có token → 200 kèm dữ liệu đã join assignees/tags/subtasks', async () => {
    const res = await request(createTestApp(db)).get('/api/tasks').set('Authorization', `Bearer ${employeeToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].assignees).toEqual(['user-1', 'user-2']);
    expect(res.body[0].tags).toEqual(['solar']);
    expect(res.body[0].subtasks[0].isCompleted).toBe(true);
  });

  it('scope related queries theo taskId IN (?) thay vì full-scan (P2)', async () => {
    await request(createTestApp(db)).get('/api/tasks').set('Authorization', `Bearer ${employeeToken}`);

    expect(db.findCall('FROM task_assignees WHERE taskId IN (?)')).toBeTruthy();
    expect(db.findCall('FROM task_tags WHERE taskId IN (?)')).toBeTruthy();
    expect(db.findCall('FROM task_subtasks WHERE taskId IN (?)')).toBeTruthy();
    expect(db.findCall('FROM task_comments WHERE taskId IN (?)')).toBeTruthy();
  });

  it('limit/offset được đẩy xuống SQL, clamp tối đa 500 (P2)', async () => {
    const res = await request(createTestApp(db))
      .get('/api/tasks?limit=10&offset=5')
      .set('Authorization', `Bearer ${employeeToken}`);

    expect(res.status).toBe(200);
    const main = db.findCall('FROM tasks t');
    expect(main!.sql).toContain('LIMIT ? OFFSET ?');
    expect(main!.params.slice(-2)).toEqual([10, 5]);
  });

  it('không có task → 200 rỗng, không query related (P2)', async () => {
    const emptyDb = new FakeDb();
    emptyDb.onAll((sql) => {
      if (sql.includes('FROM tasks t')) return [];
      return undefined;
    });

    const res = await request(createTestApp(emptyDb)).get('/api/tasks').set('Authorization', `Bearer ${employeeToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
    expect(emptyDb.count('SELECT taskId, userId FROM task_assignees WHERE taskId IN (?)')).toBe(0);
  });
});

describe('POST /api/tasks', () => {
  let db: FakeDb;

  beforeEach(() => {
    db = new FakeDb();
  });

  it('tạo task, lưu người được giao và gửi notification cho người được assign', async () => {
    const res = await request(createTestApp(db))
      .post('/api/tasks')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({
        title: 'Thi công dàn pin mặt trời',
        priority: 'High',
        status: 'Todo',
        createdBy: 'user-1',
        assignees: ['user-1', 'user-2'],
      });

    expect(res.status).toBe(200);
    expect(res.body.id).toBeTruthy();
    expect(db.count('INSERT INTO tasks')).toBe(1);
    expect(db.count('INSERT INTO task_assignees')).toBe(2);

    const notif = db.findCall('INSERT INTO notifications');
    expect(notif).toBeTruthy();
    expect(notif!.params[1]).toBe('user-2');
    expect(notif!.params[3]).toBe('Công việc mới');
    expect(db.count('INSERT INTO activity_logs')).toBe(1);
  });

  it('thiếu title → 400 (zod validation P1)', async () => {
    const res = await request(createTestApp(db))
      .post('/api/tasks')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({ priority: 'High', createdBy: 'user-1' });

    expect(res.status).toBe(400);
    expect(db.count('INSERT INTO tasks')).toBe(0);
  });

  it('nhận diện department tự động qua tên phòng ban', async () => {
    db.onGet((sql) => (sql.includes('FROM departments WHERE name') ? { id: 'dept-sales' } : undefined));

    const res = await request(createTestApp(db))
      .post('/api/tasks')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({ title: 'Chăm sóc khách hàng A', department: 'Phòng Kinh Doanh', createdBy: 'user-1' });

    expect(res.status).toBe(200);
    const insert = db.findCall('INSERT INTO tasks');
    expect(insert!.params[10]).toBe('dept-sales');
  });
});

const adminToken = makeToken({
  id: 'admin-1',
  name: 'Admin',
  email: 'admin@example.com',
  role: 'Admin',
  department: 'dept-exec',
  permissions: [],
});

describe('DELETE /api/tasks (P0 RBAC)', () => {
  let db: FakeDb;

  beforeEach(() => {
    db = new FakeDb();
  });

  it('Admin xóa task của người khác → 200', async () => {
    db.onGet((sql) => (sql.includes('FROM tasks WHERE id') ? { id: 'task-1', createdBy: 'user-9' } : undefined));

    const res = await request(createTestApp(db))
      .delete('/api/tasks/task-1')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(db.count('DELETE FROM tasks WHERE id')).toBe(1);
  });

  it('người tạo task tự xóa → 200', async () => {
    db.onGet((sql) => (sql.includes('FROM tasks WHERE id') ? { id: 'task-1', createdBy: 'user-1' } : undefined));

    const res = await request(createTestApp(db))
      .delete('/api/tasks/task-1')
      .set('Authorization', `Bearer ${employeeToken}`);

    expect(res.status).toBe(200);
  });

  it('Employee xóa task của người khác → 403', async () => {
    db.onGet((sql) => (sql.includes('FROM tasks WHERE id') ? { id: 'task-1', createdBy: 'user-2' } : undefined));

    const res = await request(createTestApp(db))
      .delete('/api/tasks/task-1')
      .set('Authorization', `Bearer ${employeeToken}`);

    expect(res.status).toBe(403);
    expect(db.count('DELETE FROM tasks WHERE id')).toBe(0);
  });

  it('task không tồn tại → 404', async () => {
    const res = await request(createTestApp(db))
      .delete('/api/tasks/ghost')
      .set('Authorization', `Bearer ${employeeToken}`);

    expect(res.status).toBe(404);
  });
});
