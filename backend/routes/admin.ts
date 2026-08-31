import os from 'os';
import fs from 'fs';
import path from 'path';
import { Router } from 'express';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { invalidateAiKeyCache } from './ai.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function adminRoutes(db: any, mailer: any) {
  const router = Router();
  const upload = multer({ dest: path.join(__dirname, '../../tmp') });

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

  // --- Database Management ---
  router.get('/database/tables', async (_req, res) => {
    try {
      const tables = await db.all(`SELECT table_name AS name FROM information_schema.tables WHERE table_schema = DATABASE() ORDER BY table_name ASC`);
      const data = [] as { name: string; count: number | null }[];
      for (const table of tables) {
        try {
          const row = await db.get(`SELECT COUNT(*) as count FROM ${table.name}`);
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

      const limit = Math.min(Math.max(Number(req.query.limit || 20), 1), 100);
      const offset = Math.max(Number(req.query.offset || 0), 0);
      const totalRow = await db.get(`SELECT COUNT(*) as count FROM ${table}`);
      const rows = await db.all(`SELECT * FROM ${table} LIMIT ? OFFSET ?`, [limit, offset]);
      res.json({ table, total: totalRow?.count ?? 0, rows });
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
  });

  router.delete('/database/table/:table/row/:id', async (req, res) => {
    try {
      const { table } = req.params;
      if (!/^[a-zA-Z0-9_]+$/.test(table)) return res.status(400).json({ error: 'Tên bảng không hợp lệ' });

      await db.run(`DELETE FROM ${table} WHERE id = ?`, [req.params.id]);
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
      // MySQL: xuất dữ liệu dạng JSON (không hỗ trợ file export như SQLite)
      const tables = await db.all(`SELECT table_name AS name FROM information_schema.tables WHERE table_schema = DATABASE() ORDER BY table_name ASC`);
      const exportData: Record<string, any[]> = {};
      for (const t of tables) {
        exportData[t.name] = await db.all(`SELECT * FROM \`${t.name}\``);
      }

      appendHistory({
        id: Math.random().toString(36).slice(2) + Date.now().toString(36),
        action: 'export',
        filename: 'database-export.json',
        performedBy: req.user?.id || 'admin',
        note: 'Xuất toàn bộ database (MySQL JSON)',
        createdAt: new Date().toISOString(),
      });

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="database-export.json"');
      res.json(exportData);
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
  });

  router.post('/database/import', upload.single('file'), async (req: any, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'Thiếu file import' });
      const originalName = req.file ? Buffer.from((req.file as any).originalname, 'latin1').toString('utf8') : 'unknown.json';

      // Read uploaded JSON
      const rawData = fs.readFileSync(req.file.path, 'utf8');
      const importData = JSON.parse(rawData);

      appendHistory({
        id: Math.random().toString(36).slice(2) + Date.now().toString(36),
        action: 'import',
        filename: originalName,
        performedBy: req.user?.id || 'admin',
        note: 'Nhập database từ file ' + originalName,
        createdAt: new Date().toISOString(),
      });

      // Import data table by table
      for (const [tableName, rows] of Object.entries(importData)) {
        if (!Array.isArray(rows) || rows.length === 0) continue;
        if (!/^[a-zA-Z0-9_]+$/.test(tableName)) continue;
        // Clear existing data
        await db.run(`DELETE FROM \`${tableName}\``);
        // Insert rows
        for (const row of rows) {
          const cols = Object.keys(row);
          const placeholders = cols.map(() => '?').join(', ');
          const values = cols.map(c => row[c]);
          await db.run(`INSERT INTO \`${tableName}\` (${cols.map(c => '\`' + c + '\`').join(', ')}) VALUES (${placeholders})`, values);
        }
      }

      await fs.promises.unlink(req.file.path).catch(() => { });
      res.json({ success: true, message: 'Import thành công.' });
    } catch (e: any) {
      res.status(500).json({ error: 'Import thất bại: ' + e.message });
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
      if (SMTP_PASS && SMTP_PASS !== '********') entries.push(['SMTP_PASS', SMTP_PASS]);
      for (const [key, value] of entries) {
        await db.run('INSERT INTO system_config (`key`, `value`) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value', [key, value]);
      }
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
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message || 'Lỗi gửi mail' }); }
  });

  // --- AI Config ---
  router.get('/system-config/ai-keys', async (_req, res) => {
    try {
      const providers = ['gemini', 'groq', 'deepseek', 'openrouter', 'openai'];
      const keysMap: Record<string, string[]> = {};
      
      for (const p of providers) {
        const config = await db.get(`SELECT \`value\` FROM system_config WHERE \`key\` = ?`, [`${p}_api_keys`]);
        keysMap[p] = config && config.value ? JSON.parse(config.value) : [];
      }

      const providerConfig = await db.get(`SELECT \`value\` FROM system_config WHERE \`key\` = 'ai_provider'`);
      const provider = providerConfig && providerConfig.value ? providerConfig.value : 'gemini';
      
      res.json({ keysMap, provider });
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
  });

  router.post('/system-config/ai-keys', async (req, res) => {
    try {
      const { keysMap, provider } = req.body;
      
      if (keysMap && typeof keysMap === 'object') {
         for (const [p, keys] of Object.entries(keysMap)) {
           if (Array.isArray(keys)) {
             await db.run('INSERT INTO system_config (`key`, `value`) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value', [`${p}_api_keys`, JSON.stringify(keys)]);
           }
         }
      }
      
      if (provider) {
        await db.run('INSERT INTO system_config (`key`, `value`) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value', ['ai_provider', provider]);
      }
      invalidateAiKeyCache(); // Force reload next AI request
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
      const entries: [string, string][] = [
        ['POSTE_API_URL', POSTE_API_URL || ''],
        ['POSTE_API_USER', POSTE_API_USER || '']
      ];
      if (POSTE_API_PASS && POSTE_API_PASS !== '********') entries.push(['POSTE_API_PASS', POSTE_API_PASS]);
      for (const [key, value] of entries) {
        await db.run('INSERT INTO system_config (`key`, `value`) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value', [key, value]);
      }
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
  });

  const getPosteAuth = async () => {
    const urlConfig = await db.get(`SELECT \`value\` FROM system_config WHERE \`key\` = 'POSTE_API_URL'`);
    const userConfig = await db.get(`SELECT \`value\` FROM system_config WHERE \`key\` = 'POSTE_API_USER'`);
    const passConfig = await db.get(`SELECT \`value\` FROM system_config WHERE \`key\` = 'POSTE_API_PASS'`);
    if (!urlConfig?.value || !userConfig?.value || !passConfig?.value) return null;
    return {
      url: urlConfig.value.replace(/\/$/, ''),
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${userConfig.value}:${passConfig.value}`).toString('base64'),
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
        fetch(`${auth.url}/boxes`, { headers: auth.headers }),
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
        console.error('Lỗi GET /domains:', e);
        res.status(500).json({ error: e.message || 'Lỗi kết nối Poste.io' }); 
    }
  });

  router.post('/mail-server/boxes', async (req, res) => {
    try {
      const auth = await getPosteAuth();
      if (!auth) return res.status(400).json({ error: 'Poste.io API chưa được cấu hình' });
      const { name, email, passwordPlaintext, quota } = req.body;
      const formattedName = name ? `${name} <${email}>` : email;
      const bodyParams: any = { name: formattedName, passwordPlaintext };
      
      const response = await fetch(`${auth.url}/boxes`, {
        method: 'POST',
        headers: auth.headers,
        body: JSON.stringify(bodyParams)
      });
      if (!response.ok) throw new Error(await response.text());
      if (quota !== undefined) {
         try { await db.run('INSERT INTO mail_quotas (email, quota) VALUES (?, ?) ON CONFLICT(email) DO UPDATE SET quota=excluded.quota', [email, Number(quota) || 0]); } catch (e) { console.error('POST quota error:', e); }
      }
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message || 'Lỗi tạo hộp thư' }); }
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
        const response = await fetch(`${auth.url}/boxes/${encodeURIComponent(req.params.email)}`, {
          method: 'PATCH',
          headers: auth.headers,
          body: JSON.stringify(updates)
        });
        if (!response.ok) throw new Error(await response.text());
      }
      if (quota !== undefined) {
         try { await db.run('INSERT INTO mail_quotas (email, quota) VALUES (?, ?) ON CONFLICT(email) DO UPDATE SET quota=excluded.quota', [req.params.email, Number(quota) || 0]); } catch (e) { console.error('PATCH quota error:', e); }
      }
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message || 'Lỗi cập nhật hộp thư' }); }
  });

  router.delete('/mail-server/boxes/:email', async (req, res) => {
    try {
      const auth = await getPosteAuth();
      if (!auth) return res.status(400).json({ error: 'Poste.io API chưa được cấu hình' });
      const response = await fetch(`${auth.url}/boxes/${encodeURIComponent(req.params.email)}`, {
        method: 'DELETE',
        headers: auth.headers
      });
      if (!response.ok) throw new Error(await response.text());
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message || 'Lỗi xóa hộp thư' }); }
  });

  // --- Poste.io Aliases ---
  router.get('/mail-server/aliases', async (req, res) => {
    try {
      const auth = await getPosteAuth();
      if (!auth) return res.status(400).json({ error: 'Poste.io API chưa được cấu hình' });
      const response = await fetch(`${auth.url}/boxes`, { headers: auth.headers });
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
        console.error('Lỗi GET /aliases:', e);
        res.status(500).json({ error: e.message || 'Lỗi kết nối Poste.io' }); 
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
      const response = await fetch(`${auth.url}/boxes`, {
        method: 'POST',
        headers: { ...auth.headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error(await response.text());
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message || 'Lỗi tạo alias' }); }
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
      await fetch(`${auth.url}/boxes/${encodeURIComponent(emailToEdit)}`, {
        method: 'DELETE',
        headers: auth.headers
      });

      const payload = {
        name: emailToEdit.split('@')[0],
        email: emailToEdit,
        passwordPlaintext: '',
        redirectTo: redirectTo
      };
      const response = await fetch(`${auth.url}/boxes`, {
        method: 'POST',
        headers: { ...auth.headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error(await response.text());
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message || 'Lỗi cập nhật alias' }); }
  });

  router.delete('/mail-server/aliases/:email', async (req, res) => {
    try {
      const auth = await getPosteAuth();
      if (!auth) return res.status(400).json({ error: 'Poste.io API chưa được cấu hình' });
      const response = await fetch(`${auth.url}/boxes/${encodeURIComponent(req.params.email)}`, { method: 'DELETE', headers: auth.headers });
      if (!response.ok) throw new Error(await response.text());
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message || 'Lỗi xóa alias' }); }
  });

  // --- Poste.io Domains ---
  router.get('/mail-server/domains', async (_req, res) => {
    try {
      const auth = await getPosteAuth();
      if (!auth) return res.status(400).json({ error: 'Poste.io API chưa được cấu hình' });
      const response = await fetch(`${auth.url}/domains`, { headers: auth.headers });
      if (!response.ok) throw new Error(await response.text());
      const data = await response.json();
      res.json(data.results || data);
    } catch (e: any) { res.status(500).json({ error: e.message || 'Lỗi lấy danh sách Domain' }); }
  });

  router.post('/mail-server/domains', async (req, res) => {
    try {
      const auth = await getPosteAuth();
      if (!auth) return res.status(400).json({ error: 'Poste.io API chưa được cấu hình' });
      const { name } = req.body;
      const response = await fetch(`${auth.url}/domains`, {
        method: 'POST',
        headers: auth.headers,
        body: JSON.stringify({ name })
      });
      if (!response.ok) throw new Error(await response.text());
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message || 'Lỗi tạo Domain' }); }
  });

  router.delete('/mail-server/domains/:name', async (req, res) => {
    try {
      const auth = await getPosteAuth();
      if (!auth) return res.status(400).json({ error: 'Poste.io API chưa được cấu hình' });
      const response = await fetch(`${auth.url}/domains/${encodeURIComponent(req.params.name)}`, { method: 'DELETE', headers: auth.headers });
      if (!response.ok) throw new Error(await response.text());
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message || 'Lỗi xóa Domain' }); }
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
        nodeVersion: process.version,
        platform: os.platform(),
        memoryUsage: process.memoryUsage().rss,
        uptime: process.uptime(),
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
