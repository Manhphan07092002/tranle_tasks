import fs from 'fs';
import crypto from 'crypto';
import path from 'path';
import { Router } from 'express';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { invalidateAiKeyCache } from './ai.js';
import { encrypt, decrypt } from '../utils/cryptoUtils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Tables that Admin DB browser may touch. Sensitive tables are NEVER exposed here.
const DB_BROWSER_ALLOWLIST = new Set([
  'events', 'notifications', 'activity_logs', 'departments', 'roles',
  'tasks', 'task_assignees', 'task_tags', 'task_subtasks', 'task_comments',
  'notes', 'meetings', 'meeting_participants', 'signals',
  'reports', 'revenue_reports', 'contracts', 'contract_links',
  'projects', 'project_reports', 'project_milestones',
  'documents', 'clients', 'products', 'scheduled_emails',
]);

const SENSITIVE_COLUMNS = new Set([
  'password', 'mailpassword', 'mail_password', 'smtp_pass', 'token',
  'passwordplaintext', 'pass', 'secret', 'api_key', 'apikey',
]);

function redactRow(row: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(row)) {
    const lk = k.toLowerCase();
    if (SENSITIVE_COLUMNS.has(lk) || lk.includes('api_key') || lk.endsWith('_api_keys') || lk === 'value' && false) {
      out[k] = '[REDACTED]';
    } else {
      out[k] = v;
    }
  }
  // system_config values may hold secrets (SMTP_PASS, *_api_keys, POSTE_API_PASS)
  return out;
}

function redactSystemConfigRows(rows: any[]): any[] {
  return rows.map((r: any) => {
    const key = String(r.key || r.KEY || '');
    if (/pass|secret|api_key|token/i.test(key)) return { ...r, value: '[REDACTED]' };
    return r;
  });
}

function decryptStoredSecret(value: any): any {
  if (typeof value === 'string' && value.startsWith('gcm:')) {
    try {
      const out = decrypt(value);
      return typeof out === 'string' ? out : value;
    } catch {
      return value;
    }
  }
  return value;
}

export function adminRoutes(db: any, mailer: any) {
  const router = Router();
  const upload = multer({
    dest: path.join(__dirname, '../../tmp'),
    limits: { fileSize: 10 * 1024 * 1024, files: 1 },
    fileFilter: (_req, file, cb) => {
      if (file.mimetype === 'application/json' || file.originalname.toLowerCase().endsWith('.json')) cb(null, true);
      else cb(null, false);
    },
  });

  // Structured audit trail for sensitive admin actions (actor + IP + time).
  // Never include secret values — only metadata (which table, which provider, filename).
  const auditAdmin = async (req: any, action: string, metadata?: Record<string, unknown>) => {
    try {
      await db.run(
        'INSERT INTO activity_logs (id, userId, action, entityId, entityType, metadata, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [crypto.randomUUID(), req.user?.id || 'admin', action, null, 'admin',
          JSON.stringify({ ip: req.ip, ...metadata }), new Date().toISOString()]
      );
    } catch { /* audit must never break the request */ }
  };

  // --- Password Reset Requests ---
  router.get('/password-reset-requests', async (req, res) => {
    try {
      const includeResolved = String(req.query.includeResolved || '') === '1';
      const requests = includeResolved
        ? await db.all('SELECT * FROM password_reset_requests ORDER BY createdAt DESC')
        : await db.all("SELECT * FROM password_reset_requests WHERE status = 'pending' ORDER BY createdAt DESC");
      res.json(requests);
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
  });

  router.delete('/password-reset-requests/:id', async (req, res) => {
    try {
      await db.run('DELETE FROM password_reset_tokens WHERE userId = (SELECT userId FROM password_reset_requests WHERE id = ?)', [req.params.id]);
      await db.run('DELETE FROM password_reset_requests WHERE id = ?', [req.params.id]);
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
  });

  // --- Database Management (allowlisted, redacted) ---
  router.get('/database/tables', async (_req, res) => {
    try {
      const tables = await db.all(`SELECT table_name AS name FROM information_schema.tables WHERE table_schema = DATABASE() ORDER BY table_name ASC`);
      const data = [] as { name: string; count: number | null }[];
      for (const table of tables) {
        if (!DB_BROWSER_ALLOWLIST.has(table.name)) continue;
        try {
          const row = await db.get(`SELECT COUNT(*) as count FROM \`${table.name}\``);
          data.push({ name: table.name, count: row?.count ?? 0 });
        } catch { data.push({ name: table.name, count: null }); }
      }
      res.json(data);
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
  });

  router.get('/database/table/:table', async (req, res) => {
    try {
      const { table } = req.params;
      if (!/^[a-zA-Z0-9_]+$/.test(table)) return res.status(400).json({ error: 'Tên bảng không hợp lệ' });
      if (!DB_BROWSER_ALLOWLIST.has(table)) return res.status(403).json({ error: 'Bảng này không được phép truy cập' });

      const limit = Math.min(Math.max(Number(req.query.limit || 20), 1), 100);
      const offset = Math.max(Number(req.query.offset || 0), 0);
      const totalRow = await db.get(`SELECT COUNT(*) as count FROM \`${table}\``);
      const rows = await db.all(`SELECT * FROM \`${table}\` LIMIT ? OFFSET ?`, [limit, offset]);
      res.json({ table, total: totalRow?.count ?? 0, rows: rows.map(redactRow) });
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
  });

  router.delete('/database/table/:table/row/:id', async (req, res) => {
    try {
      const { table } = req.params;
      if (!/^[a-zA-Z0-9_]+$/.test(table)) return res.status(400).json({ error: 'Tên bảng không hợp lệ' });
      if (!DB_BROWSER_ALLOWLIST.has(table)) return res.status(403).json({ error: 'Bảng này không được phép thao tác' });
      if (table === 'roles' || table === 'departments') return res.status(403).json({ error: 'Không được xóa trực tiếp bảng hệ thống này' });
      // activity_logs là nhật ký kiểm toán append-only: không route nào trong codebase
      // UPDATE/DELETE được nó. Cho phép xóa qua DB browser là hở lỗ hổng duy nhất,
      // và nó đúng loại việc kẻ phá dữ liệu cần che: xoá dòng log ghi "ai duyệt
      // khoản doanh thu này" rồi để lại một dòng audit không ghi id nào.
      if (table === 'activity_logs') return res.status(403).json({ error: 'Nhật ký hoạt động là append-only, không thể xóa' });

      // Ghi lại nội dung dòng bị xóa trước khi xóa, nếu không thì hành động này không
      // để lại dấu vết có thể khôi phục nào.
      const removed = await db.get(`SELECT * FROM \`${table}\` WHERE id = ?`, [req.params.id]);
      await db.run(`DELETE FROM \`${table}\` WHERE id = ?`, [req.params.id]);
      await auditAdmin(req, 'admin.db_row_deleted', { table, rowId: req.params.id, removed: removed ? redactRow(removed) : null });
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
  });

  // Helper: read/write db_history JSON file
  const HISTORY_FILE = path.join(__dirname, '../db_history.json');
  const readHistory = (): any[] => {
    try { return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8')); } catch { return []; }
  };
  const appendHistory = (entry: object) => {
    const list = readHistory();
    list.unshift(entry);
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(list.slice(0, 200), null, 2));
  };

  router.get('/database/export', async (req: any, res) => {
    try {
      // Export only allowlisted tables with secrets redacted. Never dump users/system_config wholesale.
      const exportData: Record<string, any[]> = {};
      for (const name of DB_BROWSER_ALLOWLIST) {
        try {
          const rows = await db.all(`SELECT * FROM \`${name}\``);
          exportData[name] = rows.map(redactRow);
        } catch { /* skip missing tables */ }
      }
      // Include redacted system_config (non-secret keys only, values masked for secrets).
      try {
        const cfg = await db.all('SELECT `key`, `value` FROM system_config');
        exportData['system_config'] = redactSystemConfigRows(cfg);
      } catch { /* ignore */ }

      appendHistory({
        id: crypto.randomUUID(),
        action: 'export',
        filename: 'database-export.json',
        performedBy: req.user?.id || 'admin',
        note: 'Xuất toàn bộ database (MySQL JSON)',
        createdAt: new Date().toISOString(),
      });

      await auditAdmin(req, 'admin.db_export', {});
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="database-export.json"');
      res.json(exportData);
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
  });

  router.post('/database/import', upload.single('file'), async (req: any, res) => {
    const tmpPath = req.file?.path as string | undefined;
    try {
      if (!req.file) return res.status(400).json({ error: 'Thiếu file import (chỉ chấp nhận .json ≤ 10MB)' });
      const originalName = req.file ? Buffer.from((req.file as any).originalname, 'latin1').toString('utf8') : 'unknown.json';

      // Read uploaded JSON (size already limited by multer)
      const rawData = fs.readFileSync(req.file.path, 'utf8');
      if (rawData.length > 15 * 1024 * 1024) return res.status(400).json({ error: 'File import quá lớn' });
      let importData: Record<string, unknown>;
      try {
        importData = JSON.parse(rawData);
      } catch {
        return res.status(400).json({ error: 'File import không phải JSON hợp lệ' });
      }
      if (!importData || typeof importData !== 'object' || Array.isArray(importData)) {
        return res.status(400).json({ error: 'Định dạng file import không hợp lệ' });
      }

      appendHistory({
        id: crypto.randomUUID(),
        action: 'import',
        filename: originalName,
        performedBy: req.user?.id || 'admin',
        note: 'Nhập database từ file ' + originalName,
        createdAt: new Date().toISOString(),
      });

      // Import data table by table — allowlisted only, never users/system_config/tokens.
      // Wrapped in a transaction: a half-applied import must never leave the DB inconsistent.
      const BLOCKED_IMPORT = new Set(['users', 'system_config', 'password_reset_tokens', 'password_reset_requests', 'mail_quotas', '_migrations']);
      const failImport = async (message: string) => {
        try { await db.run('ROLLBACK'); } catch { /* ignore */ }
        return res.status(400).json({ error: message });
      };
      await db.run('BEGIN TRANSACTION');
      let committed = false;
      try {
        for (const [tableName, rows] of Object.entries(importData)) {
          if (!Array.isArray(rows) || rows.length === 0) continue;
          if (!/^[a-zA-Z0-9_]+$/.test(tableName)) continue;
          if (!DB_BROWSER_ALLOWLIST.has(tableName) || BLOCKED_IMPORT.has(tableName)) continue;
          if (rows.length > 5000) { await failImport(`Bảng ${tableName} vượt quá 5000 dòng cho phép`); return; }
          // Validate shape: every row must be a plain object with sane column names.
          const valid = (rows as any[]).every(r => r && typeof r === 'object' && !Array.isArray(r)
            && Object.keys(r).every(c => /^[a-zA-Z0-9_]+$/.test(c) && c.length <= 64));
          if (!valid) { await failImport(`Dữ liệu bảng ${tableName} không hợp lệ`); return; }
          // Clear existing data
          await db.run(`DELETE FROM \`${tableName}\``);
          // Insert rows
          for (const row of rows as Record<string, any>[]) {
            const cols = Object.keys(row);
            const placeholders = cols.map(() => '?').join(', ');
            const values = cols.map(c => {
              const v = row[c];
              return typeof v === 'string' && v.length > 200000 ? String(v).slice(0, 200000) : v;
            });
            await db.run(`INSERT INTO \`${tableName}\` (${cols.map(c => '\`' + c + '\`').join(', ')}) VALUES (${placeholders})`, values);
          }
        }
        await db.run('COMMIT');
        committed = true;
      } finally {
        if (!committed) {
          try { await db.run('ROLLBACK'); } catch { /* ignore */ }
        }
      }

      await auditAdmin(req, 'admin.db_import', { filename: originalName });
      res.json({ success: true, message: 'Import thành công.' });
    } catch (e: any) {
      console.error('DB import error:', e?.message);
      res.status(500).json({ error: 'Import thất bại' });
    } finally {
      if (tmpPath) await fs.promises.unlink(tmpPath).catch(() => { });
    }
  });

  // --- DB History (stored in JSON file, survives database replacement) ---
  router.get('/database/history', async (_req, res) => {
    try {
      res.json(readHistory());
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
  });

  // --- SMTP Config ---
  router.get('/system-config/smtp', async (_req, res) => {
    try {
      const smtp = await mailer.getSystemConfig();
      res.json({ 
        IMAP_HOST: smtp.IMAP_HOST, IMAP_PORT: smtp.IMAP_PORT,
        SMTP_HOST: smtp.SMTP_HOST, SMTP_PORT: smtp.SMTP_PORT, 
        SMTP_SECURE: smtp.SMTP_SECURE, SMTP_USER: smtp.SMTP_USER, 
        SMTP_PASS: smtp.SMTP_PASS ? '********' : '', SMTP_FROM: smtp.SMTP_FROM 
      });
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
  });

  router.post('/system-config/smtp', async (req, res) => {
    try {
      const { IMAP_HOST, IMAP_PORT, SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, SMTP_FROM } = req.body;
      const entries: [string, string][] = [
        ['IMAP_HOST', IMAP_HOST || ''], ['IMAP_PORT', String(IMAP_PORT || '993')],
        ['SMTP_HOST', SMTP_HOST || ''], ['SMTP_PORT', String(SMTP_PORT || '587')],
        ['SMTP_SECURE', String(SMTP_SECURE || 'false')], ['SMTP_USER', SMTP_USER || ''], ['SMTP_FROM', SMTP_FROM || ''],
      ];
      // SMTP_PASS is encrypted at rest (AES-256-GCM). '********' means "keep existing".
      if (SMTP_PASS && SMTP_PASS !== '********') entries.push(['SMTP_PASS', encrypt(SMTP_PASS)]);
      for (const [key, value] of entries) {
        await db.run('INSERT INTO system_config (`key`, `value`) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value', [key, value]);
      }
      await auditAdmin(req, 'admin.smtp_config_updated', { passwordChanged: entries.some(([k]) => k === 'SMTP_PASS') });
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
  });

  router.post('/system-config/smtp/test', async (req, res) => {
    try {
      const { testEmail } = req.body;
      const { transporter, smtp } = await mailer.createTransporter();
      if (!transporter) return res.status(400).json({ error: 'SMTP chưa được cấu hình đầy đủ' });
      await transporter.sendMail({ from: smtp.SMTP_FROM, to: testEmail || smtp.SMTP_USER, subject: 'Tran Le Tasks - Test cấu hình SMTP', text: 'Chúc mừng, cấu hình SMTP của bạn đã hoạt động.', html: '<div style="font-family:Arial,sans-serif"><h3>Tran Le Electricity</h3><p>Chúc mừng, cấu hình SMTP của bạn đã hoạt động.</p></div>' });
      res.json({ success: true });
    } catch (e: any) { console.error('smtp test error'); res.status(500).json({ error: 'Lỗi gửi mail' }); }
  });

  // --- AI Config ---
  router.get('/system-config/ai-keys', async (_req, res) => {
    try {
      const providers = ['gemini', 'groq', 'deepseek', 'openrouter', 'openai'];
      const keysMap: Record<string, string[]> = {};
      const mask = (k: string) => (k.length <= 8 ? '****' : `${k.slice(0, 3)}****${k.slice(-4)}`);

      for (const p of providers) {
        const config = await db.get(`SELECT \`value\` FROM system_config WHERE \`key\` = ?`, [`${p}_api_keys`]);
        let keys: string[] = [];
        if (config?.value) {
          try {
            const parsed = JSON.parse(decryptStoredSecret(config.value) ?? config.value);
            keys = Array.isArray(parsed) ? parsed : [];
          } catch { keys = []; }
        }
        // Never return raw keys — only masked + count. Raw values only live in DB (encrypted).
        keysMap[p] = keys.map(mask);
      }

      const providerConfig = await db.get(`SELECT \`value\` FROM system_config WHERE \`key\` = 'ai_provider'`);
      const provider = providerConfig && providerConfig.value ? providerConfig.value : 'gemini';

      res.json({ keysMap, provider });
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
  });

  router.post('/system-config/ai-keys', async (req, res) => {
    try {
      const { keysMap, provider, addKeys, removeMasked, clearProvider } = req.body;
      const allowed = new Set(['gemini', 'groq', 'deepseek', 'openrouter', 'openai']);
      const loadKeys = async (p: string): Promise<string[]> => {
        const row = await db.get(`SELECT \`value\` FROM system_config WHERE \`key\` = ?`, [`${p}_api_keys`]);
        if (!row?.value) return [];
        try {
          const parsed = JSON.parse(decryptStoredSecret(row.value) ?? '[]');
          return Array.isArray(parsed) ? parsed.filter((k: any) => typeof k === 'string') : [];
        } catch { return []; }
      };

      // Explicit add/remove API (preferred by new Admin UI).
      if (addKeys && typeof addKeys === 'object') {
        for (const [p, keys] of Object.entries(addKeys)) {
          if (!allowed.has(p) || !Array.isArray(keys)) continue;
          const real = (keys as unknown[]).filter((k): k is string => typeof k === 'string' && k.trim().length >= 8 && k.trim().length <= 500 && !/\*{2,}/.test(k));
          if (real.length === 0) continue;
          const existing = await loadKeys(p);
          await db.run('INSERT INTO system_config (`key`, `value`) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value', [`${p}_api_keys`, encrypt(JSON.stringify([...existing, ...real.map(k => k.trim())]))]);
        }
      }
      if (typeof removeMasked === 'object' && removeMasked) {
        for (const [p, idx] of Object.entries(removeMasked)) {
          if (!allowed.has(p)) continue;
          const existing = await loadKeys(p);
          const i = Number(idx);
          if (Number.isInteger(i) && i >= 0 && i < existing.length) {
            existing.splice(i, 1);
            await db.run('INSERT INTO system_config (`key`, `value`) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value', [`${p}_api_keys`, encrypt(JSON.stringify(existing))]);
          }
        }
      }
      if (typeof clearProvider === 'string' && allowed.has(clearProvider)) {
        await db.run('INSERT INTO system_config (`key`, `value`) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value', [`${clearProvider}_api_keys`, encrypt(JSON.stringify([]))]);
      }

      if (keysMap && typeof keysMap === 'object' && !addKeys) {
         for (const [p, keys] of Object.entries(keysMap)) {
           if (!allowed.has(p)) continue;
           if (Array.isArray(keys)) {
             const list = keys as unknown[];
             const hasMasked = list.some(k => typeof k === 'string' && /\*{2,}/.test(k));
             const real = list.filter((k): k is string => typeof k === 'string' && k.length > 0 && !/\*{2,}/.test(k) && k !== '****');
             if (hasMasked) {
               // Mixed masked + new: append new keys, keep existing (safe default; deletion via removeMasked).
               if (real.length === 0) continue;
               if (real.some(k => k.length > 500 || k.length < 8)) return res.status(400).json({ error: 'API key không hợp lệ' });
               const existing = await loadKeys(p);
               await db.run('INSERT INTO system_config (`key`, `value`) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value', [`${p}_api_keys`, encrypt(JSON.stringify([...existing, ...real]))]);
             } else {
               // Legacy full-replacement (client holds raw keys).
               if (real.some(k => k.length > 500)) return res.status(400).json({ error: 'API key không hợp lệ' });
               await db.run('INSERT INTO system_config (`key`, `value`) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value', [`${p}_api_keys`, encrypt(JSON.stringify(real))]);
             }
           }
         }
      }

      if (provider) {
        if (!allowed.has(String(provider))) return res.status(400).json({ error: 'Provider không hợp lệ' });
        await db.run('INSERT INTO system_config (`key`, `value`) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value', ['ai_provider', String(provider)]);
      }
      invalidateAiKeyCache(); // Force reload next AI request
      await auditAdmin(req, 'admin.ai_keys_updated', { provider: typeof provider === 'string' ? provider : undefined });
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
  });

  // --- Poste.io Mail Server Config & Proxy ---
  router.get('/system-config/poste-api', async (_req, res) => {
    try {
      const urlConfig = await db.get(`SELECT \`value\` FROM system_config WHERE \`key\` = 'POSTE_API_URL'`);
      const userConfig = await db.get(`SELECT \`value\` FROM system_config WHERE \`key\` = 'POSTE_API_USER'`);
      const passConfig = await db.get(`SELECT \`value\` FROM system_config WHERE \`key\` = 'POSTE_API_PASS'`);
      res.json({
        POSTE_API_URL: urlConfig?.value || '',
        POSTE_API_USER: userConfig?.value || '',
        POSTE_API_PASS: passConfig?.value ? '********' : ''
      });
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
  });

  router.post('/system-config/poste-api', async (req, res) => {
    try {
      const { POSTE_API_URL, POSTE_API_USER, POSTE_API_PASS } = req.body;
      if (POSTE_API_URL && !sanitizePosteUrl(POSTE_API_URL)) {
        return res.status(400).json({ error: 'POSTE_API_URL không hợp lệ (chỉ chấp nhận http(s), không metadata)' });
      }
      const entries: [string, string][] = [
        ['POSTE_API_URL', POSTE_API_URL || ''],
        ['POSTE_API_USER', POSTE_API_USER || '']
      ];
      if (POSTE_API_PASS && POSTE_API_PASS !== '********') entries.push(['POSTE_API_PASS', encrypt(POSTE_API_PASS)]);
      for (const [key, value] of entries) {
        await db.run('INSERT INTO system_config (`key`, `value`) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value', [key, value]);
      }
      await auditAdmin(req, 'admin.poste_config_updated', { passwordChanged: entries.some(([k]) => k === 'POSTE_API_PASS') });
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
  });

  // SSRF guard for the admin-configured Poste API base URL.
  // Only http(s) without embedded credentials; cloud metadata endpoints are banned.
  // Docker-internal hostnames (e.g. tranle_mailserver) remain allowed because the
  // mail server legitimately lives inside the compose network.
  function sanitizePosteUrl(raw: unknown): string | null {
    if (typeof raw !== 'string') return null;
    const trimmed = raw.trim().replace(/\/+$/, '');
    if (!trimmed) return null;
    let parsed: URL;
    try {
      parsed = new URL(trimmed);
    } catch {
      return null;
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    if (parsed.username || parsed.password || trimmed.includes('@')) return null;
    const host = parsed.hostname.toLowerCase();
    if (host === '169.254.169.254' || host === 'metadata.google.internal' || host === 'metadata.google.com') return null;
    // Block private/loopback/link-local literals. The docker-internal mail host
    // stays allowed because the mail server legitimately lives in the compose network.
    if (host === 'tranle_mailserver') return trimmed;
    if (host === 'localhost' || host === '::1' || host === '::' || host === '0.0.0.0') return null;
    if (/^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host) || host === '169.254.169.254') return null;
    const m172 = host.match(/^172\.(\d+)\./);
    if (m172 && Number(m172[1]) >= 16 && Number(m172[1]) <= 31) return null;
    if (/^\[(::1|::ffff:[0-9.]+|fe80:)/i.test(host)) return null;
    return trimmed;
  }

  async function posteFetch(path: string, auth: { url: string; headers: Record<string, string> }, init?: RequestInit) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      return await fetch(`${auth.url}${path}`, { ...init, headers: { ...auth.headers, ...(init?.headers || {}) }, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  }

  const getPosteAuth = async () => {
    const urlConfig = await db.get(`SELECT \`value\` FROM system_config WHERE \`key\` = 'POSTE_API_URL'`);
    const userConfig = await db.get(`SELECT \`value\` FROM system_config WHERE \`key\` = 'POSTE_API_USER'`);
    const passConfig = await db.get(`SELECT \`value\` FROM system_config WHERE \`key\` = 'POSTE_API_PASS'`);
    const plainPass = decryptStoredSecret(passConfig?.value);
    const safeUrl = sanitizePosteUrl(urlConfig?.value);
    if (!safeUrl || !userConfig?.value || !plainPass) return null;
    return {
      url: safeUrl,
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${userConfig.value}:${plainPass}`).toString('base64'),
        'Content-Type': 'application/json'
      }
    };
  };

  router.get('/mail-server/boxes', async (_req, res) => {
    try {
      const auth = await getPosteAuth();
      if (!auth) return res.status(400).json({ error: 'Poste.io API chưa được cấu hình' });
      // Poste API uses /boxes path
      const [response, quotas] = await Promise.all([
        posteFetch('/boxes', auth),
        db.all('SELECT email, quota FROM mail_quotas')
      ]);
      if (!response.ok) throw new Error(await response.text());
      const data = await response.json();
      const quotaMap = new Map((quotas || []).map((q: any) => [q.email, q.quota]));
      const results = (data.results || data).map((box: any) => {
        let boxEmail = box.email || box.emailAddress || box.address || box.name || box.login || box.id || '';
        if (typeof boxEmail === 'string' && boxEmail.includes('<') && boxEmail.includes('>')) {
            const match = boxEmail.match(/<([^>]+)>/);
            if (match) boxEmail = match[1];
        }
        return {
          ...box,
          email: boxEmail,
          quota: quotaMap.get(boxEmail) || 0
        };
      });
      res.json(results);
    } catch (e: any) { 
        console.error('poste boxes error');
        res.status(500).json({ error: 'Lỗi kết nối Poste.io' }); 
    }
  });

  router.post('/mail-server/boxes', async (req, res) => {
    try {
      const auth = await getPosteAuth();
      if (!auth) return res.status(400).json({ error: 'Poste.io API chưa được cấu hình' });
      const { name, email, passwordPlaintext, quota } = req.body;
      const formattedName = name ? `${name} <${email}>` : email;
      const bodyParams: any = { name: formattedName, passwordPlaintext };
      
      const response = await posteFetch('/boxes', auth, {
        method: 'POST',
        body: JSON.stringify(bodyParams)
      });
      if (!response.ok) throw new Error(await response.text());
      if (quota !== undefined) {
         try { await db.run('INSERT INTO mail_quotas (email, quota) VALUES (?, ?) ON CONFLICT(email) DO UPDATE SET quota=excluded.quota', [email, Number(quota) || 0]); } catch (e) { console.error('POST quota error:', e); }
      }
      res.json({ success: true });
    } catch (e: any) { console.error('poste create box error'); res.status(500).json({ error: 'Loi tao hop thu' }); }
  });

  router.patch('/mail-server/boxes/:email', async (req, res) => {
    try {
      const auth = await getPosteAuth();
      if (!auth) return res.status(400).json({ error: 'Poste.io API chưa được cấu hình' });
      const { passwordPlaintext, disabled, name, quota } = req.body;
      const updates: any = {};
      if (name) updates.name = `${name} <${req.params.email}>`;
      if (passwordPlaintext) updates.passwordPlaintext = passwordPlaintext;
      if (disabled !== undefined) updates.disabled = disabled;

      if (Object.keys(updates).length > 0) {
        const response = await posteFetch(`/boxes/${encodeURIComponent(req.params.email)}`, auth, {
          method: 'PATCH',
          body: JSON.stringify(updates)
        });
        if (!response.ok) throw new Error(await response.text());
      }
      if (quota !== undefined) {
         try { await db.run('INSERT INTO mail_quotas (email, quota) VALUES (?, ?) ON CONFLICT(email) DO UPDATE SET quota=excluded.quota', [req.params.email, Number(quota) || 0]); } catch (e) { console.error('PATCH quota error:', e); }
      }
      res.json({ success: true });
    } catch (e: any) { console.error('poste update box error'); res.status(500).json({ error: 'Loi cap nhat hop thu' }); }
  });

  router.delete('/mail-server/boxes/:email', async (req, res) => {
    try {
      const auth = await getPosteAuth();
      if (!auth) return res.status(400).json({ error: 'Poste.io API chưa được cấu hình' });
      const response = await posteFetch(`/boxes/${encodeURIComponent(req.params.email)}`, auth, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error(await response.text());
      res.json({ success: true });
    } catch (e: any) { console.error('poste delete box error'); res.status(500).json({ error: 'Loi xoa hop thu' }); }
  });

  // --- Poste.io Aliases ---
  router.get('/mail-server/aliases', async (req, res) => {
    try {
      const auth = await getPosteAuth();
      if (!auth) return res.status(400).json({ error: 'Poste.io API chưa được cấu hình' });
      const response = await posteFetch('/boxes', auth);
      if (!response.ok) throw new Error(await response.text());
      const data = await response.json();
      const allBoxes = data.results || data;
      const aliases = allBoxes.filter((b: any) => b.redirect_only).map((b: any) => ({
         name: b.name,
         email: b.address || b.email || b.login,
         goto: (b.redirect_to || []).join(',')
      }));
      res.json(aliases);
    } catch (e: any) { 
        console.error('poste aliases error');
        res.status(500).json({ error: 'Lỗi kết nối Poste.io' }); 
    }
  });

  router.post('/mail-server/aliases', async (req, res) => {
    try {
      const auth = await getPosteAuth();
      if (!auth) return res.status(400).json({ error: 'Poste.io API chưa được cấu hình' });
      const { name, email, goto } = req.body;
      const redirectTo = goto.split(',').map((s: string) => s.trim()).filter(Boolean);
      const payload = {
        name: name || email.split('@')[0],
        email: email,
        passwordPlaintext: '',
        redirectTo: redirectTo
      };
      const response = await posteFetch('/boxes', auth, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error(await response.text());
      res.json({ success: true });
    } catch (e: any) { console.error('poste create alias error'); res.status(500).json({ error: 'Loi tao alias' }); }
  });

  router.patch('/mail-server/aliases/:email', async (req, res) => {
    try {
      const auth = await getPosteAuth();
      if (!auth) return res.status(400).json({ error: 'Poste.io API chưa được cấu hình' });
      const emailToEdit = req.params.email;
      const { goto } = req.body;
      const redirectTo = goto.split(',').map((s: string) => s.trim()).filter(Boolean);
      
      // Poste.io API không cho phép PATCH trường redirectTo, 
      // Do đó ta xóa Alias cũ và tạo lại Alias mới (Bởi vì redirect_only không lưu trữ data nên an toàn)
      await posteFetch(`/boxes/${encodeURIComponent(emailToEdit)}`, auth, {
        method: 'DELETE'
      });

      const payload = {
        name: emailToEdit.split('@')[0],
        email: emailToEdit,
        passwordPlaintext: '',
        redirectTo: redirectTo
      };
      const response = await posteFetch('/boxes', auth, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error(await response.text());
      res.json({ success: true });
    } catch (e: any) { console.error('poste update alias error'); res.status(500).json({ error: 'Loi cap nhat alias' }); }
  });

  router.delete('/mail-server/aliases/:email', async (req, res) => {
    try {
      const auth = await getPosteAuth();
      if (!auth) return res.status(400).json({ error: 'Poste.io API chưa được cấu hình' });
      const response = await posteFetch(`/boxes/${encodeURIComponent(req.params.email)}`, auth, { method: 'DELETE' });
      if (!response.ok) throw new Error(await response.text());
      res.json({ success: true });
    } catch (e: any) { console.error('poste delete alias error'); res.status(500).json({ error: 'Loi xoa alias' }); }
  });

  // --- Poste.io Domains ---
  router.get('/mail-server/domains', async (_req, res) => {
    try {
      const auth = await getPosteAuth();
      if (!auth) return res.status(400).json({ error: 'Poste.io API chưa được cấu hình' });
      const response = await posteFetch('/domains', auth);
      if (!response.ok) throw new Error(await response.text());
      const data = await response.json();
      res.json(data.results || data);
    } catch (e: any) { console.error('poste domains error'); res.status(500).json({ error: 'Loi lay danh sach Domain' }); }
  });

  router.post('/mail-server/domains', async (req, res) => {
    try {
      const auth = await getPosteAuth();
      if (!auth) return res.status(400).json({ error: 'Poste.io API chưa được cấu hình' });
      const { name } = req.body;
      const response = await posteFetch('/domains', auth, {
        method: 'POST',
        body: JSON.stringify({ name })
      });
      if (!response.ok) throw new Error(await response.text());
      res.json({ success: true });
    } catch (e: any) { console.error('poste create domain error'); res.status(500).json({ error: 'Loi tao Domain' }); }
  });

  router.delete('/mail-server/domains/:name', async (req, res) => {
    try {
      const auth = await getPosteAuth();
      if (!auth) return res.status(400).json({ error: 'Poste.io API chưa được cấu hình' });
      const response = await posteFetch(`/domains/${encodeURIComponent(req.params.name)}`, auth, { method: 'DELETE' });
      if (!response.ok) throw new Error(await response.text());
      res.json({ success: true });
    } catch (e: any) { console.error('poste delete domain error'); res.status(500).json({ error: 'Loi xoa Domain' }); }
  });

  // --- Stats ---
  router.get('/stats', async (_req, res) => {
    try {
      const userCountDesc = await db.get('SELECT COUNT(*) as count FROM users');
      const taskCountDesc = await db.get('SELECT COUNT(*) as count FROM tasks');
      const reportCountDesc = await db.get('SELECT COUNT(*) as count FROM reports');
      const meetingCountDesc = await db.get("SELECT COUNT(*) as count FROM meetings WHERE status != 'ended'");
      const roleBreakdown = await db.all('SELECT role, COUNT(*) as count FROM users GROUP BY role');
      const taskStatusBreakdown = await db.all('SELECT status, COUNT(*) as count FROM tasks GROUP BY status');
      const taskDeptBreakdown = await db.all('SELECT department, COUNT(*) as count FROM tasks GROUP BY department');
      const reportStatusBreakdown = await db.all('SELECT status, COUNT(*) as count FROM reports GROUP BY status');
      
      const logsCountResult = await db.get('SELECT COUNT(*) as count FROM activity_logs');
      const emailsCountResult = await db.get('SELECT COUNT(*) as count FROM scheduled_emails');
      const sentEmailsCountResult = await db.get('SELECT COUNT(*) as count FROM mail_tracking');
      const resetRequestsCountResult = await db.get("SELECT COUNT(*) as count FROM password_reset_requests WHERE status='pending'");
      let dbSize = 0;
      try {
        const sizeResult = await db.get(`SELECT SUM(data_length + index_length) AS size FROM information_schema.tables WHERE table_schema = DATABASE()`);
        dbSize = sizeResult?.size || 0;
      } catch (e) {}

      const systemInfo = {
        dbSize
      };

      res.json({ 
        totalUsers: userCountDesc.count, totalTasks: taskCountDesc.count, 
        totalReports: reportCountDesc.count, activeMeetings: meetingCountDesc.count, 
        totalLogs: logsCountResult ? logsCountResult.count : 0,
        scheduledEmails: emailsCountResult ? emailsCountResult.count : 0,
        sentEmails: sentEmailsCountResult ? sentEmailsCountResult.count : 0,
        pendingResets: resetRequestsCountResult ? resetRequestsCountResult.count : 0,
        roleBreakdown, taskStatusBreakdown, taskDeptBreakdown, reportStatusBreakdown,
        systemInfo
      });
    } catch (e) { res.status(500).json({ error: 'Failed to fetch admin stats' }); }
  });

  // --- Detailed Logs & Emails ---
  router.get('/activity-logs', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const logs = await db.all('SELECT * FROM activity_logs ORDER BY createdAt DESC LIMIT ?', [limit]);
      res.json(logs);
    } catch (e) { res.status(500).json({ error: 'Failed to fetch logs' }); }
  });

  router.get('/scheduled-emails', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const emails = await db.all('SELECT * FROM scheduled_emails ORDER BY scheduledAt ASC LIMIT ?', [limit]);
      res.json(emails);
    } catch (e) { res.status(500).json({ error: 'Failed to fetch emails' }); }
  });

  return router;
}
