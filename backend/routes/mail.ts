import { resolvePaging } from '../utils/paging.js';
import { selectInlineAttachments } from '../utils/mailAttachments.js';
import { Router } from 'express';
import { ImapFlow } from 'imapflow';
import nodemailer from 'nodemailer';
import { simpleParser } from 'mailparser';
import multer from 'multer';
// @ts-ignore
import MailComposer from 'nodemailer/lib/mail-composer';
import tls from 'tls';
import crypto from 'crypto';
import { encrypt, decrypt } from '../utils/cryptoUtils.js';
import { requireAuth } from '../middleware/auth.js';
import { createMailer } from '../mailer.js';

const newTrackingId = () => crypto.randomBytes(9).toString('hex') + Date.now().toString(36);

function sanitizeFolder(folder: unknown, fallback = 'INBOX'): string {
  const f = String(folder ?? fallback);
  // IMAP mailbox names can contain dots/spaces — reject only protocol metacharacters.
  if (/["\\\r\n]/.test(f) || f.length > 128 || f.length === 0) return fallback;
  return f;
}

function sanitizeUidList(uids: unknown): string | null {
  if (!Array.isArray(uids) || uids.length === 0 || uids.length > 500) return null;
  if (!uids.every((u) => /^\d{1,10}$/.test(String(u)))) return null;
  return uids.map(String).join(',');
}

function mailError(status: number, error: any, fallback: string) {
  console.error(`[mail] ${fallback}`);
  // Auth failures keep 401 so the client can prompt reconnect; never echo raw IMAP text.
  return status === 401 ? { error: 'Phiên mail hết hạn. Vui lòng kết nối lại.' } : { error: fallback };
}

export function mailRoutes(db: any) {
  const router = Router();

  const getDynamicConfig = async () => {
    const mailer = createMailer(db);
    return await mailer.getSystemConfig();
  };

  // Get active system mail config provider (to let user profiles adapt settings texts)
  router.get('/provider', requireAuth, async (req: any, res: any) => {
    try {
      let userConfig: any = {};
      const user = await db.get('SELECT mailPassword FROM users WHERE id = ?', [req.user.id]);
      if (user && user.mailPassword) {
        try {
          userConfig = JSON.parse(decrypt(user.mailPassword) || '{}');
        } catch(e) {}
      }
      const config = await getDynamicConfig();
      const host = (config.SMTP_HOST || '').toLowerCase();
      const isPoste = host.includes('tranlecorp.com.vn') || host.includes('tranlecorp.com') || host.includes('ctcdn.vn') || host.includes('localhost') || host.includes('mailserver') || host.includes('127.0.0.1');
      res.json({
        provider: userConfig.provider || (isPoste ? 'poste' : 'vnpt'),
        imapHost: userConfig.imapHost || config.IMAP_HOST,
        smtpHost: userConfig.smtpHost || config.SMTP_HOST
      });
    } catch (e: any) {
      // Never return the raw driver/SMTP message: it can carry hostnames,
      // recipient lists and config paths.
      console.error('[mail/imap-config] failed to load config:', e?.message);
      res.status(500).json({ error: 'Không thể tải cấu hình email' });
    }
  });

  // SSRF guard for user-supplied mail hosts: only the internal mail server,
  // the company mail domains, or a plain hostname/IP the admin allowlisted.
  // Private-range literals and cloud metadata endpoints are always rejected.
  const ALLOWED_CUSTOM_MAIL_HOSTS = new Set(
    (process.env.ALLOWED_MAIL_HOSTS || 'tranle_mailserver').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
  );
  const COMPANY_MAIL_SUFFIXES = ['vnptemail.vn', 'tranlecorp.com.vn', 'tranlecorp.com', 'ctcdn.vn'];

  function isBlockedMailHost(host: unknown): boolean {
    if (typeof host !== 'string') return true;
    const h = host.trim().toLowerCase();
    if (!h || h.length > 253 || /[\s@/:]/.test(h)) return true;
    if (h === 'localhost' || h === 'metadata.google.internal' || h === 'metadata.google.com') return true;
    if (h === '169.254.169.254' || h === '0.0.0.0' || h === '::' || h === '::1') return true;
    if (/^127\./.test(h) || /^10\./.test(h) || /^192\.168\./.test(h)) return true;
    const m172 = h.match(/^172\.(\d+)\./);
    if (m172 && Number(m172[1]) >= 16 && Number(m172[1]) <= 31) return true;
    if (/^\[(::1|::ffff:[0-9.]+)\]$/.test(h)) return true;
    return false;
  }

  function resolveCustomMailHost(raw: unknown, fallback: string): string | null {
    if (raw === undefined || raw === null || raw === '') return fallback;
    if (typeof raw !== 'string') return null;
    const h = raw.trim().toLowerCase();
    if (isBlockedMailHost(h)) return null;
    if (ALLOWED_CUSTOM_MAIL_HOSTS.has(h)) return h;
    // Company mail domains are always acceptable.
    if (COMPANY_MAIL_SUFFIXES.some((s) => h === s || h.endsWith('.' + s))) return h;
    return null;
  }

  function resolveMailPort(raw: unknown, fallback: number): number | null {
    if (raw === undefined || raw === null || raw === '') return fallback;
    const n = Number(raw);
    if (!Number.isInteger(n)) return null;
    if (![110, 143, 465, 587, 993, 995].includes(n)) return null;
    return n;
  }

  // 1. Connect and Save Credentials
  router.post('/connect', requireAuth, async (req: any, res: any) => {
    const { email, password, provider, customImapHost, customImapPort, customSmtpHost, customSmtpPort } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    // Reject CRLF/quote injection into the raw IMAP LOGIN command.
    if (/[\r\n"]/.test(String(email)) || /[\r\n]/.test(String(password))) {
      return res.status(400).json({ error: 'Email hoặc mật khẩu chứa ký tự không hợp lệ' });
    }

    if (process.env.NODE_ENV !== 'test') {
      console.log(`[IMAP Connect] Login request (provider: ${provider})`);
    }

    try {
      const config = await getDynamicConfig();
      let targetImapHost = config.IMAP_HOST;
      let targetImapPort = Number(config.IMAP_PORT);
      let targetSmtpHost = config.SMTP_HOST;
      let targetSmtpPort = Number(config.SMTP_PORT);

      if (provider === 'poste') {
        targetImapHost = 'tranle_mailserver';
        targetImapPort = 993;
        targetSmtpHost = 'tranle_mailserver';
        targetSmtpPort = 587;
      } else if (provider === 'custom') {
        const imapHost = resolveCustomMailHost(customImapHost, config.IMAP_HOST);
        const smtpHost = resolveCustomMailHost(customSmtpHost, config.SMTP_HOST);
        const imapPort = resolveMailPort(customImapPort, Number(config.IMAP_PORT));
        const smtpPort = resolveMailPort(customSmtpPort, Number(config.SMTP_PORT));
        if (!imapHost || !smtpHost || imapPort === null || smtpPort === null) {
          return res.status(400).json({ error: 'Máy chủ mail tùy chỉnh không được phép' });
        }
        targetImapHost = imapHost;
        targetImapPort = imapPort;
        targetSmtpHost = smtpHost;
        targetSmtpPort = smtpPort;
      }

      // TLS verify on by default; set ALLOW_INSECURE_TLS=true only for internal self-signed mailservers.
      const insecureTls = process.env.ALLOW_INSECURE_TLS === 'true';
      const authResult = await new Promise<{ success: boolean, reason?: string }>((resolve, reject) => {
        const socket = tls.connect(targetImapPort, targetImapHost, { rejectUnauthorized: !insecureTls });

        // Timeout after 15s
        const timer = setTimeout(() => {
          socket.destroy();
          resolve({ success: false, reason: 'Connection timeout' });
        }, 15000);

        let buffer = '';
        let loginAttempt = 1; // 1 = full email, 2 = username only
        let greetingReceived = false;

        socket.on('data', (data: any) => {
          buffer += data.toString();

          // Wait for greeting
          if (!greetingReceived && buffer.includes('* OK')) {
            greetingReceived = true;
            const safeEmail = String(email).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
            const safePass = String(password).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
            socket.write(`A1 LOGIN "${safeEmail}" "${safePass}"\r\n`);
          }

          if (greetingReceived) {
            if (buffer.includes('A1 OK') || buffer.includes('A2 OK')) {
              clearTimeout(timer);
              socket.write('A3 LOGOUT\r\n');
              resolve({ success: true });
            } else if (buffer.includes('A1 NO') || buffer.includes('A1 BAD')) {
              if (loginAttempt === 1) {
                // Try just the username part
                loginAttempt = 2;
                const usernameOnly = String(email).split('@')[0].replace(/\\/g, '\\\\').replace(/"/g, '\\"');
                const safePass2 = String(password).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
                socket.write(`A2 LOGIN "${usernameOnly}" "${safePass2}"\r\n`);
              }
            } else if (buffer.includes('A2 NO') || buffer.includes('A2 BAD')) {
              clearTimeout(timer);
              socket.destroy();
              resolve({ success: false, reason: buffer });
            }
          }
        });

        socket.on('error', (err: any) => {
          clearTimeout(timer);
          resolve({ success: false, reason: err.message });
        });
      });

      if (!authResult.success) {
        console.error('Raw TLS Login failed');
        throw new Error('AUTHENTICATE failed');
      }

      // If successful, encrypt and save both email and password
      const mailAuthData = JSON.stringify({
        email,
        password,
        provider,
        imapHost: targetImapHost,
        imapPort: targetImapPort,
        smtpHost: targetSmtpHost,
        smtpPort: targetSmtpPort
      });
      const encryptedData = encrypt(mailAuthData);
      await db.run('UPDATE users SET mailPassword = ? WHERE id = ?', [encryptedData, req.user.id]);

      res.json({ success: true, message: 'Connected successfully' });
    } catch (error: any) {
      console.error('Mail connect error:', error);
      let errMsg = error.message || 'Lỗi không xác định';
      if (errMsg.includes('AUTHENTICATE failed')) {
        errMsg = 'Tài khoản Email hoặc Mật khẩu không chính xác. Vui lòng kiểm tra lại!';
      }
      res.status(401).json({ error: errMsg });
    }
  });

  // 2. Helper to get IMAP client
  const getImapClient = async (userId: string, defaultEmail: string) => {
    const user = await db.get('SELECT mailPassword FROM users WHERE id = ?', [userId]);
    if (!user || !user.mailPassword) throw new Error('No mail credentials found');

    const decryptedStr = decrypt(user.mailPassword);
    if (!decryptedStr) throw new Error('Failed to decrypt password');

    let email = defaultEmail;
    let password = decryptedStr;
    let targetImapHost = null;
    let targetImapPort = null;
    try {
      const parsed = JSON.parse(decryptedStr);
      if (parsed.email && parsed.password) {
        email = parsed.email;
        password = parsed.password;
        targetImapHost = parsed.imapHost;
        targetImapPort = parsed.imapPort;
      }
    } catch (e) {
      // It's a raw password from old format
    }

    const config = await getDynamicConfig();
    const finalImapHost = targetImapHost || config.IMAP_HOST;
    const finalImapPort = Number(targetImapPort || config.IMAP_PORT);

    let client = new ImapFlow({
      host: finalImapHost,
      port: finalImapPort,
      secure: true,
      auth: { user: email, pass: password },
      logger: false as any,
      tls: {
        rejectUnauthorized: process.env.ALLOW_INSECURE_TLS !== 'true'
      }
    });

    try {
      await client.connect();
    } catch (err: any) {
      if (err.message?.includes('AUTHENTICATE failed')) {
        // Retry with just the username
        const usernameOnly = email.split('@')[0];
        client = new ImapFlow({
          host: finalImapHost,
          port: finalImapPort,
          secure: true,
          auth: { user: usernameOnly, pass: password },
          logger: false as any,
          tls: { rejectUnauthorized: process.env.ALLOW_INSECURE_TLS !== 'true' }
        });
        await client.connect();
      } else {
        throw err;
      }
    }
    return client;
  };

  // 3. Helper to get SMTP transporter (cached per user for performance)
  const smtpCache = new Map<string, any>();

  const getSmtpTransporter = async (userId: string, defaultEmail: string) => {
    // Return cached transporter if available
    if (smtpCache.has(userId)) {
      return smtpCache.get(userId);
    }

    const user = await db.get('SELECT mailPassword FROM users WHERE id = ?', [userId]);
    if (!user || !user.mailPassword) throw new Error('No mail credentials found');

    const decryptedStr = decrypt(user.mailPassword);
    if (!decryptedStr) throw new Error('Failed to decrypt password');

    let email = defaultEmail;
    let password = decryptedStr;
    let targetSmtpHost = null;
    let targetSmtpPort = null;
    try {
      const parsed = JSON.parse(decryptedStr);
      if (parsed.email && parsed.password) {
        email = parsed.email;
        password = parsed.password;
        targetSmtpHost = parsed.smtpHost;
        targetSmtpPort = parsed.smtpPort;
      }
    } catch (e) {
      // It's a raw password from old format
    }

    const config = await getDynamicConfig();
    const finalSmtpHost = targetSmtpHost || config.SMTP_HOST || 'smtp.vnptemail.vn';
    const finalSmtpPort = Number(targetSmtpPort || config.SMTP_PORT || 587);

    const makeTransporter = (user: string) => nodemailer.createTransport({
      host: finalSmtpHost,
      port: finalSmtpPort,
      secure: finalSmtpPort === 465 || config.SMTP_SECURE === 'true',
      auth: { user, pass: password },
      tls: { rejectUnauthorized: process.env.ALLOW_INSECURE_TLS !== 'true' },
      connectionTimeout: 60000,
      greetingTimeout: 60000,
      socketTimeout: 60000,
    });

    let transporter = makeTransporter(email);

    // Verify connection once; retry with username only if auth fails
    try {
      await transporter.verify();
    } catch (err: any) {
      const msg = err.message || '';
      if (msg.includes('Invalid login') || msg.includes('AuthError') || msg.includes('535')) {
        const usernameOnly = email.split('@')[0];
        transporter = makeTransporter(usernameOnly);
        await transporter.verify();
      } else {
        throw err;
      }
    }

    // Cache for future sends (invalidate after 10 minutes)
    smtpCache.set(userId, transporter);
    setTimeout(() => smtpCache.delete(userId), 10 * 60 * 1000);

    return transporter;
  };

  // Helper: detect IMAP/SMTP auth errors (ImapFlow throws 'Command failed' with authenticationFailed=true)
  const isMailAuthError = (error: any): boolean => {
    if (!error) return false;
    if (error.authenticationFailed === true) return true;
    const msg = (error.message || '').toLowerCase();
    const responseText = (error.responseText || '').toLowerCase();
    const response = (error.response || '').toLowerCase();
    return (
      msg.includes('no mail credentials') ||
      msg.includes('authenticate failed') ||
      msg.includes('authentication failed') ||
      responseText.includes('authenticate failed') ||
      response.includes('authenticate failed') ||
      msg.includes('invalid login') ||
      msg.includes('autherror')
    );
  };

  // 3a. Fetch company contacts (all users in DB + IMAP history)
  router.get('/contacts', requireAuth, async (req: any, res: any) => {
    try {
      // 1) Get all company users from DB
      const dbUsers = await db.all('SELECT id, name, email, department, avatar FROM users ORDER BY name ASC');
      
      // 2) Try to get recent IMAP contacts (best-effort)
      let imapContacts: { email: string; name: string; source: string }[] = [];
      try {
        const client = await getImapClient(req.user.id, req.user.email);
        const contactSet = new Map<string, { email: string; name: string; count: number }>();

        // Scan sent folder
        const sentCandidates = ['Sent', 'Sent Items', 'Sent Messages', 'INBOX.Sent'];
        let sentFolder = '';
        for (const name of sentCandidates) {
          try { const l = await client.getMailboxLock(name); l.release(); sentFolder = name; break; } catch (_) {}
        }

        if (sentFolder) {
          const lock = await client.getMailboxLock(sentFolder);
          try {
            const mailbox = client.mailbox;
            if (mailbox !== false && (mailbox as any).exists > 0) {
              const count = (mailbox as any).exists as number;
              const start = Math.max(1, count - 199);
              for await (const msg of client.fetch(`${start}:${count}`, { envelope: true })) {
                const toList = [...(msg.envelope?.to || []), ...(msg.envelope?.cc || [])];
                for (const addr of toList) {
                  if (!addr.address) continue;
                  const key = addr.address.toLowerCase();
                  const existing = contactSet.get(key);
                  if (existing) existing.count++;
                  else contactSet.set(key, { email: addr.address, name: addr.name || '', count: 1 });
                }
              }
            }
          } finally { lock.release(); }
        }

        // Scan inbox (From addresses)
        const inboxLock = await client.getMailboxLock('INBOX');
        try {
          const mailbox = client.mailbox;
          if (mailbox !== false && (mailbox as any).exists > 0) {
            const count = (mailbox as any).exists as number;
            const start = Math.max(1, count - 199);
            for await (const msg of client.fetch(`${start}:${count}`, { envelope: true })) {
              const fromList = msg.envelope?.from || [];
              for (const addr of fromList) {
                if (!addr.address) continue;
                const key = addr.address.toLowerCase();
                const existing = contactSet.get(key);
                if (existing) existing.count++;
                else contactSet.set(key, { email: addr.address, name: addr.name || '', count: 1 });
              }
            }
          }
        } finally { inboxLock.release(); await client.logout(); }

        imapContacts = Array.from(contactSet.values())
          .sort((a, b) => b.count - a.count)
          .map(c => ({ email: c.email, name: c.name, source: 'imap' }));
      } catch (imapErr: any) {
        console.warn('[Contacts] IMAP scan skipped:', imapErr.message);
      }

      // 3) Build response: company users first, then external IMAP contacts not already in company
      const companyEmails = new Set(dbUsers.map((u: any) => u.email?.toLowerCase()));
      
      const companyContacts = dbUsers.map((u: any) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        department: u.department || '',
        avatar: u.avatar || '',
        source: 'company',
      }));

      const externalContacts = imapContacts
        .filter(c => !companyEmails.has(c.email.toLowerCase()))
        .slice(0, 50)
        .map(c => ({ id: null, name: c.name, email: c.email, department: '', avatar: '', source: 'external' }));

      res.json({ company: companyContacts, external: externalContacts });
    } catch (error: any) {
      console.error('Contacts error');
      res.status(500).json({ error: 'Failed to fetch contacts' });
    }
  });

  // 3b. Fetch recent recipients (for autocomplete)
  router.get('/recipients', requireAuth, async (req: any, res: any) => {
    try {
      const client = await getImapClient(req.user.id, req.user.email);
      // Try to open Sent folder
      const sentCandidates = ['Sent', 'Sent Items', 'Sent Messages', 'INBOX.Sent'];
      let sentFolder = '';
      for (const name of sentCandidates) {
        try {
          const testLock = await client.getMailboxLock(name);
          testLock.release();
          sentFolder = name;
          break;
        } catch (_) { /* try next */ }
      }
      if (!sentFolder) {
        await client.logout();
        return res.json([]);
      }

      const lock = await client.getMailboxLock(sentFolder);
      try {
        const recipientSet = new Map<string, { email: string; name: string; count: number }>();
        const mailbox = client.mailbox;
        if (mailbox !== false) {
          const count = mailbox.exists || 0;
          const start = Math.max(1, count - 99); // last 100 sent
          const seq = count > 0 ? `${start}:${count}` : '1:*';
          if (count > 0) {
            for await (const msg of client.fetch(seq, { envelope: true, uid: true })) {
              const toList = msg.envelope?.to || [];
              for (const addr of toList) {
                if (!addr.address) continue;
                const key = addr.address.toLowerCase();
                if (recipientSet.has(key)) {
                  recipientSet.get(key)!.count++;
                } else {
                  recipientSet.set(key, {
                    email: addr.address,
                    name: addr.name || '',
                    count: 1
                  });
                }
              }
            }
          }
        }
        // Sort by frequency, return top 30
        const sorted = Array.from(recipientSet.values())
          .sort((a, b) => b.count - a.count)
          .slice(0, 30);
        res.json(sorted);
      } finally {
        lock.release();
        await client.logout();
      }
    } catch (error: any) {
      console.error('Fetch recipients error:', error);
      res.json([]); // Return empty on error, not 500
    }
  });

  // Disconnect mail - clear saved credentials
  router.post('/disconnect', requireAuth, async (req: any, res: any) => {
    try {
      await db.run('UPDATE users SET mailPassword = NULL WHERE id = ?', [req.user.id]);
      res.json({ success: true, message: 'Đã ngắt kết nối email.' });
    } catch (error: any) {
      console.error('mail disconnect error');
      res.status(500).json({ error: 'Failed' });
    }
  });

  // IMAP folder name resolver
  const resolveFolder = async (client: any, folderKey: string): Promise<string> => {
    // Try to list mailboxes to find real folder names
    const folderMap: Record<string, string[]> = {
      sent: ['Sent', 'Sent Items', 'Sent Messages', 'INBOX.Sent'],
      trash: ['Trash', 'Deleted Items', 'Deleted Messages', 'INBOX.Trash'],
      starred: ['Starred', 'Flagged', 'INBOX.Starred'],
      inbox: ['INBOX'],
    };
    const candidates = folderMap[folderKey] || ['INBOX'];
    for (const name of candidates) {
      try {
        const lock = await client.getMailboxLock(name);
        lock.release();
        return name;
      } catch (_) { /* try next */ }
    }
    return 'INBOX';
  };

  // 3b. Get total unread count for INBOX
  router.get('/unread-count', requireAuth, async (req: any, res: any) => {
    try {
      const client = await getImapClient(req.user.id, req.user.email);
      const folderName = await resolveFolder(client, 'inbox');
      const lock = await client.getMailboxLock(folderName);
      try {
        const uids = await client.search({ seen: false }, { uid: true });
        res.json({ count: uids ? uids.length : 0 });
      } finally {
        lock.release();
        await client.logout();
      }
    } catch (error: any) {
      res.status(isMailAuthError(error) ? 401 : 500).json(mailError(isMailAuthError(error) ? 401 : 500, error, 'Mail operation failed'));
    }
  });

  // 3c. Check for new unseen mail globally
  router.get('/check-new', requireAuth, async (req: any, res: any) => {
    try {
      const client = await getImapClient(req.user.id, req.user.email);
      const folderName = await resolveFolder(client, 'inbox');
      const lock = await client.getMailboxLock(folderName);
      try {
        const mailbox = client.mailbox;
        if (mailbox !== false && mailbox.exists > 0) {
          const count = mailbox.exists;
          for await (let msg of client.fetch(count.toString(), { envelope: true, flags: true, uid: true })) {
            const isRead = msg.flags ? msg.flags.has('\\Seen') : false;
            return res.json({ 
              uid: msg.uid, 
              subject: msg.envelope?.subject, 
              fromName: msg.envelope?.from?.[0]?.name,
              from: msg.envelope?.from?.[0]?.address,
              isRead 
            });
          }
        }
        res.json({ uid: null });
      } finally {
        lock.release();
        await client.logout();
      }
    } catch (error: any) {
      res.status(isMailAuthError(error) ? 401 : 500).json(mailError(isMailAuthError(error) ? 401 : 500, error, 'Mail operation failed'));
    }
  });

  // 4. Fetch Folder (inbox / sent / trash / starred)

  router.get('/inbox', requireAuth, async (req: any, res: any) => {
    const folderKey = (req.query.folder as string || 'inbox').toLowerCase();
    // ?limit khong clam: client gui limit lon se bi IMAP chap day hang loat, va
    // page/limit am/NaN lam seq range cua imapflow sai. Clam o day.
    const { limit, page } = resolvePaging(req.query);

    try {
      const client = await getImapClient(req.user.id, req.user.email);
      const folderName = await resolveFolder(client, folderKey);
      const lock = await client.getMailboxLock(folderName);

      try {
        const messages: any[] = [];
        const seenMessageIds = new Set<string>();
        const mailbox = client.mailbox;
        if (mailbox !== false) {
          const count = mailbox.exists || 0;
          const end = count - (page - 1) * limit;
          const start = Math.max(1, end - limit + 1);

          if (end > 0) {
            const seq = `${start}:${end}`;
            for await (let msg of client.fetch(seq, { envelope: true, flags: true, uid: true })) {
              const envelope = msg.envelope;
              const flags = msg.flags ? Array.from(msg.flags) : [];
              const isRead = msg.flags ? msg.flags.has('\\Seen') : false;
              const isStarred = msg.flags ? msg.flags.has('\\Flagged') : false;

              if (folderKey === 'starred' && !isStarred) continue;

              // Deduplicate by Message-ID to fix duplicate email display issue
              const msgId = envelope?.messageId || msg.uid.toString();
              if (seenMessageIds.has(msgId)) continue;
              seenMessageIds.add(msgId);

              const fromAddress = envelope?.from?.[0]?.address || envelope?.from?.[0]?.name || 'Unknown';
              const fromName = envelope?.from?.[0]?.name || '';
              const toAddress = envelope?.to?.[0]?.address || '';
              const toName = envelope?.to?.[0]?.name || '';

              messages.push({
                id: msg.uid,
                subject: envelope?.subject || '',
                from: fromAddress,
                fromName: fromName,
                to: toAddress,
                toName: toName,
                date: envelope?.date || new Date(),
                flags,
                isRead,
                isStarred,
                folder: folderName,
              });
            }
          }
        }
        res.json(messages.reverse());
      } finally {
        lock.release();
        await client.logout();
      }
    } catch (error: any) {
      console.error('Fetch folder error:', error);
      res.status(isMailAuthError(error) ? 401 : 500).json(mailError(isMailAuthError(error) ? 401 : 500, error, 'Failed to fetch folder'));
    }
  });

  // 4b. Star / Unstar email
  router.patch('/message/:uid/star', requireAuth, async (req: any, res: any) => {
    const { folder = 'INBOX', starred } = req.body;
    const safeFolder = sanitizeFolder(folder);
    if (!/^\d{1,10}$/.test(String(req.params.uid))) return res.status(400).json({ error: 'Invalid uid' });
    try {
      const client = await getImapClient(req.user.id, req.user.email);
      const lock = await client.getMailboxLock(safeFolder);
      try {
        const uid = String(req.params.uid);
        if (starred) {
          await client.messageFlagsAdd(uid, ['\\Flagged'], { uid: true });
        } else {
          await client.messageFlagsRemove(uid, ['\\Flagged'], { uid: true });
        }
        res.json({ success: true });
      } finally {
        lock.release();
        await client.logout();
      }
    } catch (error: any) {
      console.error('mail action error');
      res.status(500).json({ error: 'Mail action failed' });
    }
  });

  // 4b2. Mark read / unread
  router.patch('/message/:uid/read', requireAuth, async (req: any, res: any) => {
    const { folder = 'INBOX', isRead } = req.body;
    const safeFolder = sanitizeFolder(folder);
    if (!/^\d{1,10}$/.test(String(req.params.uid))) return res.status(400).json({ error: 'Invalid uid' });
    try {
      const client = await getImapClient(req.user.id, req.user.email);
      const lock = await client.getMailboxLock(safeFolder);
      try {
        const uid = String(req.params.uid);
        if (isRead) {
          await client.messageFlagsAdd(uid, ['\\Seen'], { uid: true });
        } else {
          await client.messageFlagsRemove(uid, ['\\Seen'], { uid: true });
        }
        res.json({ success: true });
      } finally {
        lock.release();
        await client.logout();
      }
    } catch (error: any) {
      console.error('mail action error');
      res.status(500).json({ error: 'Mail action failed' });
    }
  });

  // 4c. Move to Trash or Permanent Delete
  router.delete('/message/:uid', requireAuth, async (req: any, res: any) => {
    const { folder = 'INBOX' } = req.query;
    const safeFolder = sanitizeFolder(folder);
    if (!/^\d{1,10}$/.test(String(req.params.uid))) return res.status(400).json({ error: 'Invalid uid' });
    try {
      const client = await getImapClient(req.user.id, req.user.email);
      const actualTrashName = await resolveFolder(client, 'trash');
      const lock = await client.getMailboxLock(safeFolder);

      try {
        const uid = String(req.params.uid);
        
        // If the email is already in the Trash folder, delete it permanently
        if (safeFolder.toLowerCase() === actualTrashName.toLowerCase() || safeFolder.toLowerCase() === 'trash') {
          await client.messageDelete(uid, { uid: true });
        } else {
          // Otherwise, move it to the Trash folder
          await client.messageMove(uid, actualTrashName, { uid: true }).catch(() => {
            // Fallback: If MOVE command fails or isn't supported, just mark as deleted
            client.messageFlagsAdd(uid, ['\\Deleted'], { uid: true });
          });
        }
        res.json({ success: true });
      } finally {
        lock.release();
        await client.logout();
      }
    } catch (error: any) {
      console.error('mail action error');
      res.status(500).json({ error: 'Mail action failed' });
    }
  });

  // 4d. Bulk Actions (Delete / Restore)
  router.post('/bulk', requireAuth, async (req: any, res: any) => {
    const { uids, action, folder = 'INBOX', allInFolder = false } = req.body;
    const safeFolder = sanitizeFolder(folder);
    if (!['delete', 'restore'].includes(String(action))) return res.status(400).json({ error: 'Invalid action' });
    let sequence: string;
    if (allInFolder) {
      sequence = '1:*';
    } else {
      const clean = sanitizeUidList(uids);
      if (!clean) return res.status(400).json({ error: 'uids array is required (numeric UIDs, max 500)' });
      sequence = clean;
    }

    try {
      const client = await getImapClient(req.user.id, req.user.email);
      const actualTrashName = await resolveFolder(client, 'trash');
      const lock = await client.getMailboxLock(safeFolder);

      try {
        // If allInFolder, use 1:* to target every message in the mailbox
        const useUid = !allInFolder; // 1:* is a seq range, not UID
        
        if (action === 'delete') {
          if (safeFolder.toLowerCase() === actualTrashName.toLowerCase() || safeFolder.toLowerCase() === 'trash') {
            await client.messageDelete(sequence, { uid: useUid });
          } else {
            await client.messageMove(sequence, actualTrashName, { uid: useUid }).catch(() => {
              client.messageFlagsAdd(sequence, ['\\Deleted'], { uid: useUid });
            });
          }
        } else if (action === 'restore') {
          // Restore to Inbox
          const actualInboxName = await resolveFolder(client, 'inbox');
          await client.messageMove(sequence, actualInboxName, { uid: useUid }).catch(() => {
            throw new Error('Move to Inbox failed');
          });
        } else {
          return res.status(400).json({ error: 'Invalid action' });
        }
        
        res.json({ success: true });
      } finally {
        lock.release();
        await client.logout();
      }
    } catch (error: any) {
      console.error('mail action error');
      res.status(500).json({ error: 'Mail action failed' });
    }
  });

  // 5. Read Single Email (folder-aware)
  router.get('/message/:uid', requireAuth, async (req: any, res: any) => {
    const folder = sanitizeFolder((req.query.folder as string) || 'INBOX');
    if (!/^\d{1,10}$/.test(String(req.params.uid))) return res.status(400).json({ error: 'Invalid uid' });
    try {
      const client = await getImapClient(req.user.id, req.user.email);
      const lock = await client.getMailboxLock(folder);

      try {
        const uid = parseInt(req.params.uid, 10);
        const msg = await client.fetchOne(uid.toString(), { source: true }, { uid: true });

        if (!msg || !msg.source) return res.status(404).json({ error: 'Message not found' });

        const parsed = await simpleParser(msg.source);

        // Mark as read
        await client.messageFlagsAdd(uid.toString(), ['\\Seen'], { uid: true });

        const inline = selectInlineAttachments(parsed.attachments);

        res.json({
          id: uid,
          subject: parsed.subject,
          from: parsed.from?.text,
          to: Array.isArray(parsed.to) ? parsed.to.map((a: any) => a.text).join(', ') : (parsed.to as any)?.text,
          date: parsed.date,
          html: parsed.html || parsed.textAsHtml || parsed.text,
          attachmentCount: parsed.attachments.length,
          attachmentsOmitted: inline.omitted,
          attachments: inline.attachments,
        });
      } finally {
        lock.release();
        await client.logout();
      }
    } catch (error: any) {
      console.error('Fetch message error:', error);
      res.status(isMailAuthError(error) ? 401 : 500).json(mailError(isMailAuthError(error) ? 401 : 500, error, 'Failed to fetch message'));
    }
  });

  // Setup multer for file uploads in memory — hard limits BEFORE buffering to RAM (OOM-DoS guard).
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024, files: 10, fieldSize: 2 * 1024 * 1024 },
  });

  // Email address validation (header-injection guard): single line, valid shape, bounded count.
  const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
  function parseAddressList(raw: unknown, field: string, max = 50): string[] | null {
    if (raw === undefined || raw === null || raw === '') return [];
    const list = Array.isArray(raw) ? raw : String(raw).split(',');
    const out: string[] = [];
    for (const item of list) {
      const addr = String(item).trim();
      if (!addr) continue;
      if (addr.length > 254 || /[\r\n]/.test(addr) || !EMAIL_RE.test(addr)) return null;
      out.push(addr);
      if (out.length > max) return null;
    }
    return out;
  }

  // 6. Send Email + Save to Sent folder
  router.post('/send', requireAuth, upload.array('attachments', 10), async (req: any, res: any) => {
    const { to, subject, body, cc, bcc } = req.body;
    if (!to || !subject) return res.status(400).json({ error: 'To and Subject are required' });
    const toList = parseAddressList(to, 'to');
    const ccList = parseAddressList(cc, 'cc');
    const bccList = parseAddressList(bcc, 'bcc');
    if (!toList || toList.length === 0 || !ccList || !bccList) {
      return res.status(400).json({ error: 'Địa chỉ email người nhận không hợp lệ' });
    }
    if (String(subject).length > 255) return res.status(400).json({ error: 'Tiêu đề quá dài (tối đa 255 ký tự)' });
    if (body && String(body).length > 200000) return res.status(400).json({ error: 'Nội dung quá dài' });

    try {
      // Fetch full user from DB (name for display) + VNPT email from mailPassword
      const dbUser = await db.get('SELECT id, name, mailPassword FROM users WHERE id = ?', [req.user.id]);
      if (!dbUser || !dbUser.mailPassword) return res.status(400).json({ error: 'Chưa cấu hình tài khoản mail. Vui lòng vào Cài đặt → Mail để kết nối.' });

      // Extract VNPT email from encrypted mailPassword JSON
      let mailEmail = req.user.email;
      try {
        const decrypted = decrypt(dbUser.mailPassword);
        if (decrypted) {
          const parsed = JSON.parse(decrypted);
          if (parsed.email) mailEmail = parsed.email;
        }
      } catch (_) { }

      const transporter = await getSmtpTransporter(req.user.id, mailEmail);

      const safeName = String(dbUser.name || '').replace(/[\r\n"]/g, '').slice(0, 100);
      const fromLabel = safeName
        ? `"${safeName}" <${mailEmail}>`
        : mailEmail;

      // Also pass mailEmail to IMAP appender later
      const senderEmail = mailEmail;

      console.log(`[SMTP] Sending email from: ${fromLabel} → to: ${to}`);

      // Map multer files to nodemailer attachments
      let totalSize = 0;
      console.log(`[SMTP] Received files: ${req.files ? (req.files as any[]).length : 0}`);
      const mailAttachments = req.files ? (req.files as any[]).map(f => {
        totalSize += f.size;
        const decodedName = Buffer.from(f.originalname, 'latin1').toString('utf8');
        console.log(`[SMTP] Attachment: ${decodedName} (${f.size} bytes)`);
        return {
          filename: decodedName,
          content: f.buffer,
          contentType: f.mimetype
        };
      }) : [];

      if (totalSize > 25 * 1024 * 1024) {
        return res.status(400).json({ error: 'Tổng dung lượng đính kèm không được vượt quá 25MB.' });
      }

      let finalHtml = body || '';
      let trackingId = null;
      if (req.body.track === 'true' || req.body.track === true) {
        trackingId = newTrackingId();
        // Never build absolute URLs from the Host header (poisonable behind trust-proxy).
        const base = (process.env.APP_BASE_URL || '').replace(/\/+$/, '');
        const trackingUrl = base
          ? `${base}/api/mail/track/${trackingId}.gif`
          : `/api/mail/track/${trackingId}.gif`;
        finalHtml += `<img src="${trackingUrl}" width="1" height="1" style="display:none;" alt="" />`;

        await db.run(
          'INSERT INTO mail_tracking (id, userId, messageId, subject, "to", opens, createdAt) VALUES (?, ?, ?, ?, ?, 0, ?)',
          [trackingId, req.user.id, '', subject, toList.join(','), new Date().toISOString()]
        );
      }

      const mailOptions: any = {
        from: fromLabel,
        to: toList,
        subject: String(subject).slice(0, 255),
        html: finalHtml,
        text: body ? body.replace(/<[^>]*>/g, '') : '',
        attachments: mailAttachments
      };
      if (ccList.length > 0) mailOptions.cc = ccList;
      if (bccList.length > 0) mailOptions.bcc = bccList;

      // Return response immediately for instant UI feedback
      res.json({
        success: true,
        message: `Đang gửi email...`,
      });

      // Run SMTP send and IMAP append in background
      transporter.sendMail(mailOptions).then(async (info: any) => {
        if (trackingId && info.messageId) {
          await db.run('UPDATE mail_tracking SET messageId = ? WHERE id = ?', [info.messageId, trackingId]);
        }

        console.log(`[SMTP] Response: ${info.response}`);
        console.log(`[SMTP] Accepted: ${JSON.stringify(info.accepted)}`);
        console.log(`[SMTP] Rejected: ${JSON.stringify(info.rejected)}`);
        console.log(`[SMTP] MessageId: ${info.messageId}`);

        if (info.rejected && info.rejected.length > 0) {
          console.warn(`[SMTP] Partially rejected by server: ${info.rejected.join(', ')}`);
        }

        // Try to append to Sent folder via IMAP
        try {
          const client = await getImapClient(req.user.id, senderEmail);
          const sentFolderCandidates = ['Sent', 'Sent Items', 'Sent Messages', 'INBOX.Sent'];
          let sentFolder = 'Sent';
          for (const name of sentFolderCandidates) {
            try {
              const lock = await client.getMailboxLock(name);
              lock.release();
              sentFolder = name;
              break;
            } catch (_) { /* try next */ }
          }

          const composer = new (MailComposer as any)(mailOptions);
          const rawMessageBuffer = await composer.compile().build();

          const lock = await client.getMailboxLock(sentFolder);
          try {
            await client.append(sentFolder, rawMessageBuffer, ['\\Seen']);
            console.log('[IMAP] Background appended to Sent folder');
          } finally {
            lock.release();
            await client.logout();
          }
        } catch (imapErr: any) {
          console.error('[IMAP] Background append failed:', imapErr.message);
        }
      }).catch((err: any) => {
        console.error(`[SMTP] Background send failed:`, err.message);
      });

    } catch (error: any) {
      console.error('Send email error');
      res.status(500).json({ error: 'Failed to send email' });
    }
  });

  // 7. Schedule Email
  router.post('/schedule', requireAuth, upload.array('attachments', 10), async (req: any, res: any) => {
    const { to, subject, body, cc, bcc, scheduledAt } = req.body;
    if (!to || !subject || !scheduledAt) return res.status(400).json({ error: 'To, Subject and ScheduledAt are required' });
    const toList = parseAddressList(to, 'to');
    const ccList = parseAddressList(cc, 'cc');
    const bccList = parseAddressList(bcc, 'bcc');
    if (!toList || toList.length === 0 || !ccList || !bccList) {
      return res.status(400).json({ error: 'Địa chỉ email người nhận không hợp lệ' });
    }
    if (String(subject).length > 255) return res.status(400).json({ error: 'Tiêu đề quá dài (tối đa 255 ký tự)' });
    if (body && String(body).length > 200000) return res.status(400).json({ error: 'Nội dung quá dài' });

    try {
      const dbUser = await db.get('SELECT id, mailPassword FROM users WHERE id = ?', [req.user.id]);
      if (!dbUser || !dbUser.mailPassword) return res.status(400).json({ error: 'Chưa cấu hình tài khoản mail.' });

      let senderEmail = '';
      let password = '';
      try {
        const parsed = JSON.parse(decrypt(dbUser.mailPassword) || '{}');
        senderEmail = parsed.email || '';
        password = parsed.password || '';
      } catch (e) {
        return res.status(400).json({ error: 'Vui lòng kết nối lại tài khoản Mail.' });
      }

      const config = await getDynamicConfig();
      // 1. Configure Nodemailer
      const transporter = nodemailer.createTransport({
        host: config.SMTP_HOST || 'smtp.vnptemail.vn',
        port: Number(config.SMTP_PORT || 587),
        secure: config.SMTP_SECURE === 'true',
        auth: { user: senderEmail, pass: password },
        tls: { rejectUnauthorized: process.env.ALLOW_INSECURE_TLS !== 'true' }
      });

      const mailAttachments = req.files ? (req.files as any[]).map(f => ({
        filename: Buffer.from(f.originalname, 'latin1').toString('utf8'),
        content: f.buffer.toString('base64'),
        contentType: f.mimetype
      })) : [];

      const id = crypto.randomUUID();
      await db.run(
        'INSERT INTO scheduled_emails (id, userId, "to", cc, bcc, subject, body, attachments, scheduledAt, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [id, req.user.id, toList.join(','), ccList.join(',') || null, bccList.join(',') || null, String(subject).slice(0, 255), body || '', JSON.stringify(mailAttachments), scheduledAt, 'pending', new Date().toISOString()]
      );

      res.json({ success: true, message: 'Đã lên lịch gửi email.' });
    } catch (error: any) {
      console.error('Schedule email error');
      res.status(500).json({ error: 'Failed to schedule email' });
    }
  });

  // 8. Tracking Pixel Route (public by design — signed opaque ID, no enumeration value).
  router.get('/track/:trackingId.gif', async (req: any, res: any) => {
    const { trackingId } = req.params;
    if (!/^[a-zA-Z0-9]{8,64}$/.test(String(trackingId || ''))) {
      const img = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
      res.writeHead(200, { 'Content-Type': 'image/gif', 'Content-Length': img.length });
      return res.end(img);
    }
    try {
      await db.run(
        'UPDATE mail_tracking SET opens = opens + 1, lastOpen = ? WHERE id = ?',
        [new Date().toISOString(), trackingId]
      );
    } catch (err) {
      console.error('Tracking error');
    }
    // 1x1 transparent GIF
    const img = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
    res.writeHead(200, {
      'Content-Type': 'image/gif',
      'Content-Length': img.length,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    res.end(img);
  });

  // 9. Get Tracking Stats
  router.get('/tracking-stats', requireAuth, async (req: any, res: any) => {
    try {
      const stats = await db.all(
        'SELECT id, subject, "to", opens, lastOpen, createdAt FROM mail_tracking WHERE userId = ? ORDER BY createdAt DESC',
        [req.user.id]
      );
      res.json(stats);
    } catch (error: any) {
      console.error('tracking-stats error');
      res.status(500).json({ error: 'Failed' });
    }
  });

  return router;
}
