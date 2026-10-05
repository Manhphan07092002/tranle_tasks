import http from 'http';
import crypto from 'crypto';
import express from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { io as clientIo } from 'socket.io-client';
import { forgotPasswordRoutes } from '../routes/auth.js';
import { userRoutes } from '../routes/users.js';
import { aiRoutes } from '../routes/ai.js';
import { documentRoutes } from '../routes/documents.js';
import { taskRoutes } from '../routes/tasks.js';
import { noteRoutes } from '../routes/notes.js';
import { notificationRoutes } from '../routes/notifications.js';
import { projectRoutes } from '../routes/projects.js';
import { requireAuth } from '../middleware/auth.js';
import { initSocket } from '../socket.js';

const secret = crypto.randomBytes(32).toString('hex');
process.env.JWT_SECRET = secret;

const employee = {
  id: 'employee-1', name: 'Employee', email: 'employee@example.test', role: 'Employee',
  department: 'Engineering', avatar: '', permissions: [],
};
const admin = { ...employee, id: 'admin-1', role: 'Admin' };
const tokenFor = (user: typeof employee) => jwt.sign(user, secret);

function protectedApp(prefix: string, router: express.Router) {
  const app = express();
  app.use(express.json());
  app.use(prefix, requireAuth, router);
  return app;
}

describe('security regressions', () => {
  it('does not expose password reset tokens in the public response', async () => {
    let storedToken = '';
    const db = {
      get: async (sql: string) => {
        if (sql.includes('FROM users')) return { id: 'user-1', email: 'user@example.test', isLocked: 0 };
        return undefined;
      },
      run: async (sql: string, params: unknown[]) => {
        if (sql.startsWith('INSERT INTO password_reset_tokens')) storedToken = String(params[3]);
        return { changes: 1 };
      },
    };
    const app = express();
    app.use(express.json());
    app.use('/api/auth', forgotPasswordRoutes(db, { sendResetLinkEmail: async () => true }));

    const response = await request(app).post('/api/auth/forgot-password').send({ email: 'user@example.test' });

    expect(response.status).toBe(200);
    expect(response.body.resetLink).toBeUndefined();
    expect(JSON.stringify(response.body)).not.toContain(storedToken);
  });

  it('prevents employees from managing users or escalating their own role', async () => {
    const runs: Array<{ sql: string; params: unknown[] }> = [];
    const db = { run: async (sql: string, params: unknown[]) => { runs.push({ sql, params }); return { changes: 1 }; } };
    const app = protectedApp('/api/users', userRoutes(db, {}));

    const crossUser = await request(app)
      .put('/api/users/another-user')
      .set('Authorization', `Bearer ${tokenFor(employee)}`)
      .send({ ...employee, role: 'Admin' });
    expect(crossUser.status).toBe(403);

    const self = await request(app)
      .put('/api/users/employee-1')
      .set('Authorization', `Bearer ${tokenFor(employee)}`)
      .send({ ...employee, role: 'Admin' });
    expect(self.status).toBe(200);
    expect(runs).toHaveLength(1);
    expect(runs[0].sql).not.toContain('role=');

    const create = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${tokenFor(employee)}`)
      .send({ ...employee, id: 'new-user' });
    expect(create.status).toBe(403);
  });

  it('restricts AI key status to admins', async () => {
    const db = { get: async () => ({ value: '[]' }) };
    const app = protectedApp('/api/ai', aiRoutes(db));

    const denied = await request(app).get('/api/ai/keys-status').set('Authorization', `Bearer ${tokenFor(employee)}`);
    const allowed = await request(app).get('/api/ai/keys-status').set('Authorization', `Bearer ${tokenFor(admin)}`);

    expect(denied.status).toBe(403);
    expect(allowed.status).toBe(200);
  });

  it('rejects document metadata that is not a managed upload URL', async () => {
    const app = protectedApp('/api/documents', documentRoutes({ run: async () => ({ changes: 1 }) }));

    const response = await request(app)
      .post('/api/documents')
      .set('Authorization', `Bearer ${tokenFor(employee)}`)
      .send({ id: 'doc-1', name: 'bad', url: '../outside.txt', category: 'others' });

    expect(response.status).toBe(400);
  });

  it('filters tasks by the caller and blocks changes to another user’s task', async () => {
    const ownTask = { id: 'task-own', createdBy: employee.id, department: employee.department, title: 'Own task' };
    const otherTask = { id: 'task-other', createdBy: 'other-user', department: 'Sales', title: 'Other task' };
    const db = {
      all: async (sql: string, params?: unknown[]) => {
        if (sql.startsWith('SELECT * FROM tasks')) return [ownTask, otherTask];
        if (sql.startsWith('SELECT userId FROM task_assignees')) {
          return params?.length ? [{ userId: 'other-user' }] : [{ taskId: otherTask.id, userId: 'other-user' }];
        }
        return [];
      },
      get: async (_sql: string, params: unknown[]) => params[0] === otherTask.id ? otherTask : undefined,
      run: async () => ({ changes: 1 }),
    };
    const app = protectedApp('/api/tasks', taskRoutes(db));

    const listed = await request(app).get('/api/tasks').set('Authorization', `Bearer ${tokenFor(employee)}`);
    const update = await request(app)
      .put('/api/tasks/task-other')
      .set('Authorization', `Bearer ${tokenFor(employee)}`)
      .send(otherTask);
    const deleted = await request(app)
      .delete('/api/tasks/task-other')
      .set('Authorization', `Bearer ${tokenFor(employee)}`);

    expect(listed.status).toBe(200);
    expect(listed.body.map((task: { id: string }) => task.id)).toEqual(['task-own']);
    expect(update.status).toBe(403);
    expect(deleted.status).toBe(403);
  });

  it('binds notes and notifications to the authenticated user', async () => {
    const noteRuns: Array<{ sql: string; params: unknown[] }> = [];
    const notesApp = protectedApp('/api/notes', noteRoutes({
      all: async () => [],
      run: async (sql: string, params: unknown[]) => {
        noteRuns.push({ sql, params });
        return { changes: 1 };
      },
    }));
    const notificationRuns: Array<{ sql: string; params: unknown[] }> = [];
    const notificationsApp = protectedApp('/api/notifications', notificationRoutes({
      all: async () => [],
      run: async (sql: string, params: unknown[]) => {
        notificationRuns.push({ sql, params });
        return { changes: 1 };
      },
    }));

    const note = await request(notesApp)
      .post('/api/notes')
      .set('Authorization', `Bearer ${tokenFor(employee)}`)
      .send({ id: 'note-1', title: 'private', userId: 'other-user' });
    const otherNotifications = await request(notificationsApp)
      .get('/api/notifications/other-user')
      .set('Authorization', `Bearer ${tokenFor(employee)}`);
    const markRead = await request(notificationsApp)
      .patch('/api/notifications/notification-1/read')
      .set('Authorization', `Bearer ${tokenFor(employee)}`);

    expect(note.status).toBe(200);
    expect(noteRuns[0].params.at(-1)).toBe(employee.id);
    expect(otherNotifications.status).toBe(403);
    expect(markRead.status).toBe(200);
    expect(notificationRuns[0].params).toEqual(['notification-1', employee.id]);
  });

  it('requires project access for project details and nested resources', async () => {
    const otherProject = { id: 'project-other', managerId: 'other-user', department: 'Sales', name: 'Other project' };
    const db = {
      get: async (sql: string) => sql.includes('FROM projects') ? otherProject : undefined,
      all: async () => [],
      run: async () => ({ changes: 1 }),
    };
    const app = protectedApp('/api/projects', projectRoutes(db));

    const detail = await request(app)
      .get('/api/projects/project-other')
      .set('Authorization', `Bearer ${tokenFor(employee)}`);
    const milestone = await request(app)
      .post('/api/projects/project-other/milestones')
      .set('Authorization', `Bearer ${tokenFor(employee)}`)
      .send({ title: 'Hidden milestone' });

    expect(detail.status).toBe(403);
    expect(milestone.status).toBe(403);
  });

  it('requires a valid JWT before a socket can connect and assigns the verified user room', async () => {
    const server = http.createServer();
    const io = initSocket(server);
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const port = (server.address() as { port: number }).port;
    const unauthenticated = clientIo(`http://127.0.0.1:${port}`, { transports: ['websocket'], reconnection: false });
    const authenticated = clientIo(`http://127.0.0.1:${port}`, {
      transports: ['websocket'], reconnection: false, auth: { token: tokenFor(employee) },
    });

    try {
      await expect(new Promise((resolve, reject) => {
        unauthenticated.once('connect', () => reject(new Error('unexpected socket connection')));
        unauthenticated.once('connect_error', resolve);
      })).resolves.toBeDefined();

      await expect(new Promise<void>((resolve, reject) => {
        authenticated.once('connect', () => resolve());
        authenticated.once('connect_error', reject);
      })).resolves.toBeUndefined();
      const socket = io.sockets.sockets.get(authenticated.id!);
      expect(socket?.rooms.has(employee.id)).toBe(true);
      expect(socket?.rooms.has('another-user')).toBe(false);
    } finally {
      unauthenticated.disconnect();
      authenticated.disconnect();
      await new Promise<void>((resolve) => io.close(() => resolve()));
    }
  });
});
