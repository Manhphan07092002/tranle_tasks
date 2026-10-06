import 'dotenv/config'; // Trigger restart
import express from 'express';
import crypto from 'crypto';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
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
import { aiRoutes, invalidateAiKeyCache } from './routes/ai.js';

import { initSocket, setSocketDb } from './socket.js';
import { requireAuth, requireAdmin, setAuthDb, cookiesMiddleware } from './middleware/auth.js';
import { ensureBody } from './middleware/ensureBody.js';

import { scheduleFridayReminder } from './schedulers/fridayReminder.js';
import { scheduleNoteReminders } from './schedulers/noteReminder.js';
import { scheduleDailyTaskReminder } from './schedulers/dailyTaskReminder.js';
import { initMailScheduler } from './schedulers/mailScheduler.js';
import { scheduleRevenueAutoSubmit } from './schedulers/revenueAutoSubmit.js';
import { resolveTrustProxy, describeTrustProxy } from './utils/trustProxy.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Resolve `app.set('trust proxy', ...)` from the environment.
 *
 * X-Forwarded-For chỉ được tin khi app không thể bị gọi trực tiếp, ngoài proxy.
 * Nếu không, mỗi client tự chọn IP trong header và mọi rate limiter đều bị vô
 * hiệu — khoá đăng nhập ngừng hoạt động.
 *
 * TRUST_PROXY_CIDRS  danh sách IP/CIDR của proxy (ưu tiên, chính xác nhất)
 * TRUST_PROXY_HOPS   số lớp proxy; yếu hơn vì vẫn giả được nếu proxy gộp sẵn
 *                    X-Forwarded-For do client gửi lên
 * TRUST_PROXY=none   không có proxy, bỏ qua header
 *
 * Mặc định giữ 1 hop để không phá rate limit đang chạy. KHÔNG đổi mặc định sang
 * "none": loginLimiter chỉ cho 10 lần / 15 phút, nên khi đó mọi nhân viên sẽ
 * dùng chung một bucket theo IP của proxy và 10 lần đăng nhập sai sẽ khoá cả
 * công ty. Muốn fail-closed thì phải set TRUST_PROXY_CIDRS cho đúng địa chỉ
 * proxy trước.
 */
async function startServer() {
  const app = express();
  app.disable('x-powered-by');

  const trustProxy = resolveTrustProxy();
  app.set('trust proxy', trustProxy);
  console.log(`[security] trust proxy = ${JSON.stringify(trustProxy)}${describeTrustProxy(trustProxy)}`);

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

  // CORS allowlist — never '*' with credentials. Comma-separated ALLOWED_ORIGIN in prod.
  const allowedOrigins = (process.env.ALLOWED_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean);
  app.use(cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // same-origin / curl / mobile
      if (allowedOrigins.length === 0) {
        // Dev default: allow localhost only.
        if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return cb(null, true);
        return cb(new Error('CORS blocked'));
      }
      if (allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error('CORS blocked'));
    },
    credentials: true,
  }));

  // Baseline security headers (helmet-equivalent, no extra dep).
  // Content-Security-Policy: the app has no inline scripts/styles by design;
  // any injected markup (e.g. via a future sink) cannot execute.
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; " +
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; " +
      "img-src 'self' data: https:; connect-src 'self'"
    );
    if (process.env.NODE_ENV === 'production') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    next();
  });

  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ limit: '5mb', extended: true }));

  // req.body defaults (shared helper — see middleware/ensureBody.ts).
  app.use(ensureBody);

  // Minimal cookie parser (shared helper — populates req.cookies for httpOnly auth cookies).
  app.use(cookiesMiddleware);

  const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5000,
    message: { error: 'Too many requests from this IP' },
  });
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { error: 'Too many login attempts from this IP' },
  });
  const forgotPasswordLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { error: 'Too many password reset attempts from this IP' },
  });
  const refreshLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    message: { error: 'Too many session refresh attempts from this IP' },
  });
  // Costly/abusable endpoints get their own tighter budgets (per IP).
  const aiLimiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 60, message: { error: 'Too many AI requests' } });
  const mailSendLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 50, message: { error: 'Too many emails sent' } });
  const adminWriteLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200, message: { error: 'Too many admin requests' } });

  app.use('/api', globalLimiter);
  app.use('/api/auth/login', loginLimiter);
  app.use('/api/auth/refresh', refreshLimiter);
  app.use('/api/auth/forgot-password', forgotPasswordLimiter);
  app.use('/api/auth/reset-password', forgotPasswordLimiter);
  app.use('/api/ai', aiLimiter);
  app.use('/api/mail/send', mailSendLimiter);
  app.use('/api/mail/schedule', mailSendLimiter);
  app.use('/api/mail/bulk', mailSendLimiter);
  app.use('/api/admin/database/import', adminWriteLimiter);

  // Database: MySQL (duy nhất)
  const db = await initDbMysql();
  setAuthDb(db);
  setSocketDb(db);

  const mailer = createMailer(db);

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date() });
  });

  app.use('/api/auth', authRoutes(db));
  app.use('/api/auth', forgotPasswordRoutes(db, mailer));
  app.use('/api/users', requireAuth, userRoutes(db, mailer));
  app.use('/api/tasks', requireAuth, taskRoutes(db));
  app.use('/api/notes', requireAuth, noteRoutes(db));
  app.use('/api/meetings', requireAuth, meetingRoutes(db));
  app.use('/api/reports', requireAuth, reportRoutes(db));
  app.use('/api/roles', requireAuth, roleRoutes(db));
  app.use('/api/departments', requireAuth, departmentRoutes(db));
  app.use('/api/notifications', requireAuth, notificationRoutes(db));

  app.use('/api/ai', requireAuth, aiRoutes(db));
  app.use('/api/admin', requireAuth, requireAdmin, adminRoutes(db, mailer));
  app.use('/api/events', requireAuth, eventRoutes(db));
  app.use('/api/activity', requireAuth, activityRoutes(db));
  app.use('/api/mail', requireAuth, mailRoutes(db));
  app.use('/api/contracts', requireAuth, contractRoutes(db));
  app.use('/api/contract-links', requireAuth, contractLinkRoutes(db));
  app.use('/api/revenue-reports', requireAuth, revenueRoutes(db));
  app.use('/api/clients', requireAuth, clientRoutes(db));
  app.use('/api/products', requireAuth, productRoutes(db));
  app.use('/api/projects', requireAuth, projectRoutes(db));
  app.use('/api/documents', requireAuth, documentRoutes(db));

  scheduleFridayReminder(db);
  scheduleNoteReminders(db);
  scheduleDailyTaskReminder(db);
  initMailScheduler(db);
  scheduleRevenueAutoSubmit(db);

  app.use('/api/upload', requireAuth, uploadRoutes());

  // Serve uploaded files — authenticated, never public. Attachments force download
  // so a stored .bin/.pdf can't execute as the app origin; nosniff blocks MIME sniffing.
  const uploadsPath = path.join(__dirname, '../uploads');
  app.use('/uploads', requireAuth, express.static(uploadsPath, {
    setHeaders: (res, filePath) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
      if (/\.(html|svg|xml|xhtml)$/i.test(filePath)) {
        res.setHeader('Content-Disposition', 'attachment');
      }
    },
  }));

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








