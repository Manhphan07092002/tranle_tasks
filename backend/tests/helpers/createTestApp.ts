import express from 'express';
import jwt from 'jsonwebtoken';
import { authRoutes, forgotPasswordRoutes } from '../../routes/auth.js';
import { taskRoutes } from '../../routes/tasks.js';
import { contractRoutes } from '../../routes/contracts.js';
import { departmentWorkspaceRoutes } from '../../routes/departmentWorkspace.js';
import { roleRoutes } from '../../routes/roles.js';
import { documentRoutes } from '../../routes/documents.js';
import { noteRoutes } from '../../routes/notes.js';
import { notificationRoutes } from '../../routes/notifications.js';
import { meetingRoutes } from '../../routes/meetings.js';
import { projectRoutes } from '../../routes/projects.js';
import { eventRoutes } from '../../routes/events.js';
import { taskTemplateRoutes } from '../../routes/taskTemplates.js';
import { departmentRoutes } from '../../routes/departments.js';
import { requireAuth } from '../../middleware/auth.js';
import type { FakeDb } from './fakeDb.js';

const TEST_JWT_SECRET = 'test-jwt-secret-0123456789abcdef';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || TEST_JWT_SECRET;

export function createTestApp(db: FakeDb) {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes(db));
  app.use('/api/auth', forgotPasswordRoutes(db, { sendResetLinkEmail: async () => true }));
  app.use('/api/tasks', requireAuth, taskRoutes(db));
  app.use('/api/contracts', requireAuth, contractRoutes(db));
  app.use('/api/department-workspace', requireAuth, departmentWorkspaceRoutes(db as any));
  app.use('/api/roles', requireAuth, roleRoutes(db));
  app.use('/api/documents', requireAuth, documentRoutes(db));
  app.use('/api/notes', requireAuth, noteRoutes(db));
  app.use('/api/notifications', requireAuth, notificationRoutes(db));
  app.use('/api/meetings', requireAuth, meetingRoutes(db));
  app.use('/api/projects', requireAuth, projectRoutes(db));
  app.use('/api/events', requireAuth, eventRoutes(db));
  app.use('/api/task-templates', requireAuth, taskTemplateRoutes(db));
  app.use('/api/departments', requireAuth, departmentRoutes(db));
  return app;
}

export interface TestUser {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  departmentId?: string;
  avatar?: string;
  permissions?: string[];
}

export function makeToken(user: TestUser): string {
  return jwt.sign({ ...user, permissions: user.permissions || [] }, process.env.JWT_SECRET as string, { expiresIn: '1h' });
}
