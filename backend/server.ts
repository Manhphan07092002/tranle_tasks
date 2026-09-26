import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend folder or root folder
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import express from 'express';
import crypto from 'crypto';
import http from 'http';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

import { initDbMysql } from './db_mysql.js';
import { createMailer } from './mailer.js';

import { authRoutes, forgotPasswordRoutes } from './routes/auth.js';
import { userRoutes } from './routes/users.js';
import { taskRoutes } from './routes/tasks.js';
import { noteRoutes } from './routes/notes.js';
import { meetingRoutes } from './routes/meetings.js';
import { reportRoutes } from './routes/reports.js';
import { roleRoutes } from './routes/roles.js';
import { departmentRoutes } from './routes/departments.js';
import { teamRoutes } from './routes/teams.js';
import { positionRoutes } from './routes/positions.js';
import { organizationRoutes } from './routes/organization.js';
import { notificationRoutes } from './routes/notifications.js';
import { adminRoutes } from './routes/admin.js';
import { eventRoutes } from './routes/events.js';
import { activityRoutes } from './routes/activity.js';
import { mailRoutes } from './routes/mail.js';
import { uploadRoutes } from './routes/upload.js';
import { contractRoutes } from './routes/contracts.js';
import { contractLinkRoutes } from './routes/contractLinks.js';
import { revenueRoutes } from './routes/revenue.js';
import { clientRoutes } from './routes/clients.js';
import { productRoutes } from './routes/products.js';
import { projectRoutes } from './routes/projects.js';
import { documentRoutes } from './routes/documents.js';
import { departmentRequestRoutes } from './routes/departmentRequests.js';
import { approvalRoutes } from './routes/approvals.js';
import { taskTemplateRoutes } from './routes/taskTemplates.js';
import { departmentWorkspaceRoutes } from './routes/departmentWorkspace.js';
import { aiRoutes, invalidateAiKeyCache } from './routes/ai.js';

import { initSocket } from './socket.js';
import { requireAuth, requireActiveSession, requireAdmin } from './middleware/auth.js';

import { scheduleFridayReminder } from './schedulers/fridayReminder.js';
import { scheduleNoteReminders } from './schedulers/noteReminder.js';
import { scheduleDailyTaskReminder } from './schedulers/dailyTaskReminder.js';
import { initMailScheduler } from './schedulers/mailScheduler.js';
import { scheduleRevenueAutoSubmit } from './schedulers/revenueAutoSubmit.js';
import { scheduleChainReminders } from './schedulers/chainReminders.js';

async function startServer() {
  const app = express();
  
  // Trust the first proxy to correctly extract client IP for rate limiting
  app.set('trust proxy', 1);

  if (!process.env.JWT_SECRET) {
    if (process.env.NODE_ENV === 'production') {
      console.error('❌ LỖI BẢO MẬT: Biến môi trường JWT_SECRET chưa được thiết lập trong production!');
      process.exit(1);
    } else {
      process.env.JWT_SECRET = crypto.randomBytes(32).toString('hex');
      console.warn('⚠️ CẢNH BÁO DEV: JWT_SECRET chưa thiết lập. Đã tự sinh ngẫu nhiên tạm thời cho phiên làm việc hiện tại.');
    }
  }

  const httpServer = http.createServer(app);
  const PORT = process.env.PORT || 3500;

  initSocket(httpServer);

  // P1: origin '*' không dùng được chung với credentials (browser chặn) → chỉ cho origin khai báo.
  // Cùng-origin (vite proxy lúc dev / serve static lúc prod) không cần CORS nên mặc định tắt cross-origin.
  const allowedOrigins = (process.env.ALLOWED_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean);
  app.use(cors({ origin: allowedOrigins.length > 0 ? allowedOrigins : false, credentials: true }));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));

  const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 2000,
    message: { error: 'Too many requests from this IP' },
  });
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { error: 'Too many login attempts from this IP' },
  });
  // P1: các endpoint reset-password không xác thực cũng cần throttle (tránh spam mail/token).
  const forgotLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { error: 'Too many password-reset attempts from this IP' },
  });

  app.use('/api', globalLimiter);
  app.use('/api/auth/login', loginLimiter);
  app.use('/api/auth/forgot-password', forgotLimiter);
  app.use('/api/auth/reset-password', forgotLimiter);

  // Database: MySQL (duy nhất)
  const db = await initDbMysql();

  const mailer = createMailer(db);

  app.get('/health', async (_req, res) => {
    try {
      await db.get('SELECT 1 AS ok');
      res.json({ status: 'ok', database: 'ok', uptime: process.uptime(), timestamp: new Date() });
    } catch {
      res.status(503).json({ status: 'unavailable', database: 'unavailable' });
    }
  });

  const authenticated = requireActiveSession(db);

  app.use('/api/auth', authRoutes(db));
  app.use('/api/auth', forgotPasswordRoutes(db, mailer));
  app.use('/api/users', authenticated, userRoutes(db, mailer));
  app.use('/api/tasks', authenticated, taskRoutes(db));
  app.use('/api/notes', authenticated, noteRoutes(db));
  app.use('/api/meetings', authenticated, meetingRoutes(db));
  app.use('/api/reports', authenticated, reportRoutes(db));
  app.use('/api/roles', authenticated, roleRoutes(db));
  app.use('/api/departments', authenticated, departmentRoutes(db));
  app.use('/api/teams', authenticated, teamRoutes(db));
  app.use('/api/positions', authenticated, positionRoutes(db));
  app.use('/api/organization', authenticated, organizationRoutes(db));
  app.use('/api/notifications', authenticated, notificationRoutes(db));

  app.use('/api/ai', authenticated, aiRoutes(db));
  app.use('/api/admin', authenticated, requireAdmin, adminRoutes(db, mailer));
  app.use('/api/events', authenticated, eventRoutes(db));
  app.use('/api/activity', authenticated, activityRoutes(db));
  app.use('/api/mail', authenticated, mailRoutes(db));
  app.use('/api/contracts', authenticated, contractRoutes(db));
  app.use('/api/contract-links', authenticated, contractLinkRoutes(db));
  app.use('/api/revenue-reports', authenticated, revenueRoutes(db));
  app.use('/api/clients', authenticated, clientRoutes(db));
  app.use('/api/products', authenticated, productRoutes(db));
  app.use('/api/projects', authenticated, projectRoutes(db));
  app.use('/api/documents', authenticated, documentRoutes(db));
  app.use('/api/department-requests', authenticated, departmentRequestRoutes(db));
  app.use('/api/approvals', authenticated, approvalRoutes(db));
  app.use('/api/task-templates', authenticated, taskTemplateRoutes(db));
  app.use('/api/department-workspace', authenticated, departmentWorkspaceRoutes(db));

  scheduleFridayReminder(db);
  scheduleNoteReminders(db);
  scheduleDailyTaskReminder(db);
  initMailScheduler(db);
  scheduleRevenueAutoSubmit(db);
  scheduleChainReminders(db);

  app.use('/api/upload', authenticated, uploadRoutes());

  const frontendPath = path.join(__dirname, '../frontend/dist');
  app.use(express.static(frontendPath));
  app.use(async (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(frontendPath, 'index.html'));
    } else {
      res.status(404).json({ error: 'API route not found' });
    }
  });

  httpServer.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();








