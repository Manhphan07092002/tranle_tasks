import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

// ─── SQL normalizer ──────────────────────────────────────────────────────────
// Converts the SQLite-flavoured SQL used throughout the routes to MySQL,
// so route files need no changes. mysql2 already uses `?` placeholders and
// backtick identifiers natively, so the work here is limited to the handful of
// SQLite-specific constructs the codebase actually emits.

function normalizeSql(sql: string): string {
  let s = sql;

  // SQLite `BEGIN TRANSACTION` → MySQL `START TRANSACTION`
  s = s.replace(/\bBEGIN\s+TRANSACTION\b/gi, 'START TRANSACTION');

  // SQLite `INSERT OR IGNORE INTO` → MySQL `INSERT IGNORE INTO`
  s = s.replace(/INSERT\s+OR\s+IGNORE\s+INTO/gi, 'INSERT IGNORE INTO');

  // SQLite/PG upsert `ON CONFLICT(col) DO UPDATE SET x=excluded.x`
  //   → MySQL `ON DUPLICATE KEY UPDATE x=VALUES(x)`
  // Used by system_config / mail_quotas upserts in routes/admin.ts.
  s = s.replace(
    /ON\s+CONFLICT\s*\([^)]*\)\s+DO\s+UPDATE\s+SET\s+(.+?)$/gi,
    (_m, assignments: string) => {
      const converted = assignments.replace(/\bexcluded\.(\w+)/gi, 'VALUES($1)');
      return `ON DUPLICATE KEY UPDATE ${converted}`;
    },
  );

  // Double-quoted reserved-word identifiers ("to", "from") → backticks.
  // These appear in db.ts DDL and routes/mail.ts. MySQL (default mode) treats
  // double quotes as string literals, so they must become backticks.
  s = s.replace(/"(to|from|key|value)"/gi, '`$1`');

  // SQLite catalog access → MySQL information_schema.
  // routes/admin.ts lists tables for the Admin panel.
  s = s.replace(
    /SELECT\s+name\s+FROM\s+sqlite_master\s+WHERE\s+type\s*=\s*'table'\s+AND\s+name\s+NOT\s+LIKE\s+'sqlite_%'\s+ORDER\s+BY\s+name\s+ASC/gi,
    "SELECT table_name AS name FROM information_schema.tables WHERE table_schema = DATABASE() ORDER BY table_name ASC",
  );

  // Reserved-word `key` in system_config queries.
  s = s.replace(/\bFROM\s+system_config\s+WHERE\s+key\b/gi, 'FROM system_config WHERE `key`');
  s = s.replace(/\bSELECT\s+key\s*,\s*value\s+FROM\s+system_config\b/gi, 'SELECT `key`, `value` FROM system_config');
  s = s.replace(/\bINSERT\s+INTO\s+system_config\s*\(\s*key\s*,\s*value\s*\)/gi, 'INSERT INTO system_config (`key`, `value`)');

  return s;
}

// ─── Row wrapper ─────────────────────────────────────────────────────────────
// mysql2 can return BIGINT/DECIMAL (e.g. from COUNT(*)) as BigInt or string
// depending on server/driver config. Coerce those to Number so routes that read
// `row.count` keep working. Property access is case-insensitive as a safety net
// for any identifier case differences, matching the PostgreSQL adapter.

function wrapRow(row: Record<string, any>): any {
  const normalized: Record<string, any> = {};
  for (const [k, v] of Object.entries(row)) {
    normalized[k] = typeof v === 'bigint' ? Number(v) : v;
  }

  return new Proxy(normalized, {
    get(target, prop: string | symbol) {
      if (typeof prop !== 'string') return (target as any)[prop];
      if (prop in target) return (target as any)[prop];
      const lower = prop.toLowerCase();
      for (const k of Object.keys(target)) {
        if (k.toLowerCase() === lower) return (target as any)[k];
      }
      return undefined;
    },
    has(target, prop) {
      if (prop in target) return true;
      if (typeof prop === 'string') {
        const lower = prop.toLowerCase();
        for (const k of Object.keys(target)) {
          if (k.toLowerCase() === lower) return true;
        }
      }
      return false;
    },
  });
}

// ─── MysqlDb class ───────────────────────────────────────────────────────────
// Drop-in replacement for the sqlite `db` object used throughout the codebase.
// IMPORTANT: uses a single long-lived connection (not a pool). Routes run
// transactions as separate db.run('BEGIN TRANSACTION') / db.run(...) / COMMIT
// calls; a pool would hand each call a different connection and break atomicity.
// A single connection preserves the SQLite single-writer semantics the routes
// were written against.

class MysqlDb {
  constructor(private conn: mysql.Connection, private connectionConfig: mysql.ConnectionOptions) {}

  private async query(sql: string, params?: any[]): Promise<any> {
    try {
      const [rows] = await this.conn.query(normalizeSql(sql), params ?? []);
      return rows;
    } catch (err: any) {
      // Reconnect once on a dropped connection, then retry.
      if (err && (err.code === 'PROTOCOL_CONNECTION_LOST' || err.fatal)) {
        console.warn('[MySQL] Connection lost, reconnecting...');
        this.conn = await mysql.createConnection(this.connectionConfig);
        const [rows] = await this.conn.query(normalizeSql(sql), params ?? []);
        return rows;
      }
      throw err;
    }
  }

  async get(sql: string, params?: any[]): Promise<any> {
    const rows = await this.query(sql, params);
    if (Array.isArray(rows) && rows.length > 0) return wrapRow(rows[0]);
    return undefined;
  }

  async all(sql: string, params?: any[]): Promise<any[]> {
    const rows = await this.query(sql, params);
    return Array.isArray(rows) ? rows.map(wrapRow) : [];
  }

  /** Returns { changes } so routes relying on affected-row counts keep working. */
  async run(sql: string, params?: any[]): Promise<{ changes: number }> {
    const result = await this.query(sql, params);
    const affected = result && typeof result.affectedRows === 'number' ? result.affectedRows : 0;
    return { changes: affected };
  }

  /** Executes multi-statement DDL (e.g. CREATE TABLE blocks). */
  async exec(sql: string): Promise<void> {
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    for (const stmt of statements) {
      await this.query(stmt);
    }
  }

  async close(): Promise<void> {
    await this.conn.end();
  }
}

// ─── Schema (MySQL) ──────────────────────────────────────────────────────────
// Derived from the FINAL SQLite schema in db.ts (base DDL + all 30 migrations
// flattened). Type mapping:
//   TEXT PRIMARY KEY / TEXT UNIQUE → VARCHAR (MySQL cannot index bare TEXT)
//   REAL → DOUBLE
//   INTEGER-as-boolean → TINYINT
//   date columns stay VARCHAR (ISO strings, compared as strings by routes)
//   JSON columns stay TEXT (app does JSON.parse/stringify)
// Reserved-word identifiers use backticks. All tables utf8mb4 for Vietnamese.

const DDL = `
CREATE TABLE IF NOT EXISTS meetings (
  id VARCHAR(191) PRIMARY KEY, title TEXT NOT NULL, description TEXT,
  hostId VARCHAR(191) NOT NULL, startTime TEXT NOT NULL, endTime TEXT NOT NULL,
  meetingLink TEXT NOT NULL, status VARCHAR(64) NOT NULL, participants TEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS meeting_participants (
  meetingId VARCHAR(191) NOT NULL, userId VARCHAR(191) NOT NULL,
  PRIMARY KEY (meetingId, userId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS signals (
  id VARCHAR(191) PRIMARY KEY, meetingId VARCHAR(191) NOT NULL,
  \`from\` VARCHAR(191) NOT NULL, \`to\` VARCHAR(191) NOT NULL,
  type VARCHAR(64) NOT NULL, data TEXT NOT NULL, timestamp BIGINT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(191) PRIMARY KEY, name TEXT NOT NULL, email VARCHAR(255) NOT NULL,
  password TEXT, role VARCHAR(64) NOT NULL, department VARCHAR(191) NOT NULL, avatar TEXT NOT NULL,
  mailPassword TEXT,
  failedLogins INT NOT NULL DEFAULT 0, lockedUntil TEXT, isLocked TINYINT NOT NULL DEFAULT 0,
  phone TEXT, dob TEXT, hometown TEXT, bio TEXT, cccd TEXT, gender TEXT,
  preferences TEXT DEFAULT ('{}')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tasks (
  id VARCHAR(191) PRIMARY KEY, title TEXT NOT NULL, description TEXT,
  startDate TEXT, dueDate TEXT, estimatedEndAt TEXT, priority VARCHAR(64), status VARCHAR(64),
  createdBy VARCHAR(191), department VARCHAR(191), recurrence VARCHAR(64), contractId VARCHAR(191), projectId VARCHAR(191)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS task_assignees (
  taskId VARCHAR(191) NOT NULL, userId VARCHAR(191) NOT NULL,
  PRIMARY KEY (taskId, userId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS task_tags (
  taskId VARCHAR(191) NOT NULL, tag VARCHAR(191) NOT NULL,
  PRIMARY KEY (taskId, tag)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS task_subtasks (
  id VARCHAR(191) PRIMARY KEY, taskId VARCHAR(191) NOT NULL, title TEXT NOT NULL,
  isCompleted TINYINT NOT NULL DEFAULT 0, sortOrder INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS task_comments (
  id VARCHAR(191) PRIMARY KEY, taskId VARCHAR(191) NOT NULL, userId VARCHAR(191) NOT NULL,
  content TEXT NOT NULL, createdAt TEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notes (
  id VARCHAR(191) PRIMARY KEY, title TEXT NOT NULL, content TEXT,
  color VARCHAR(64), createdAt TEXT, reminderAt TEXT,
  userId VARCHAR(191)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS reports (
  id VARCHAR(191) PRIMARY KEY, title TEXT NOT NULL, content TEXT,
  authorId VARCHAR(191) NOT NULL, department VARCHAR(191) NOT NULL, status VARCHAR(64) NOT NULL,
  createdAt TEXT NOT NULL, submittedAt TEXT, approvedAt TEXT, approvedBy VARCHAR(191),
  directorFeedback TEXT, managerFeedback TEXT, deletedAt TEXT, isDeleted TINYINT DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS roles (
  id VARCHAR(191) PRIMARY KEY, name VARCHAR(191) NOT NULL UNIQUE, description TEXT,
  color VARCHAR(64) NOT NULL DEFAULT '#6366f1', permissions TEXT NOT NULL,
  isSystem TINYINT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS departments (
  id VARCHAR(191) PRIMARY KEY, name VARCHAR(191) NOT NULL UNIQUE, description TEXT,
  color VARCHAR(64) NOT NULL DEFAULT '#6366f1', managerId VARCHAR(191)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS password_reset_requests (
  id VARCHAR(191) PRIMARY KEY, userId VARCHAR(191) NOT NULL, email VARCHAR(255) NOT NULL,
  status VARCHAR(64) NOT NULL DEFAULT 'pending', emailStatus VARCHAR(64) NOT NULL DEFAULT 'unknown',
  emailSentAt TEXT, createdAt TEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id VARCHAR(191) PRIMARY KEY, userId VARCHAR(191) NOT NULL, email VARCHAR(255) NOT NULL,
  token VARCHAR(191) NOT NULL UNIQUE, expiresAt TEXT NOT NULL, usedAt TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS system_config (
  \`key\` VARCHAR(191) PRIMARY KEY, \`value\` TEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(191) PRIMARY KEY, userId VARCHAR(191) NOT NULL, type VARCHAR(64) NOT NULL,
  title TEXT NOT NULL, message TEXT NOT NULL, relatedId VARCHAR(191),
  isRead TINYINT NOT NULL DEFAULT 0, createdAt TEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS events (
  id VARCHAR(191) PRIMARY KEY, title TEXT NOT NULL, date TEXT NOT NULL, endDate TEXT,
  type VARCHAR(64) NOT NULL DEFAULT 'holiday', color VARCHAR(64) NOT NULL DEFAULT '#ef4444',
  description TEXT, isRecurringYearly TINYINT NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS activity_logs (
  id VARCHAR(191) PRIMARY KEY, userId VARCHAR(191) NOT NULL, action VARCHAR(191) NOT NULL,
  entityId VARCHAR(191), entityType VARCHAR(64), metadata TEXT, createdAt TEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS db_history (
  id VARCHAR(191) PRIMARY KEY, action VARCHAR(191) NOT NULL, filename TEXT,
  performedBy VARCHAR(191), note TEXT, createdAt TEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS scheduled_emails (
  id VARCHAR(191) PRIMARY KEY, userId VARCHAR(191) NOT NULL, \`to\` TEXT NOT NULL, cc TEXT, bcc TEXT,
  subject TEXT NOT NULL, body TEXT NOT NULL, attachments TEXT,
  scheduledAt TEXT NOT NULL, status VARCHAR(64) NOT NULL DEFAULT 'pending', createdAt TEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS mail_tracking (
  id VARCHAR(191) PRIMARY KEY, userId VARCHAR(191) NOT NULL, messageId VARCHAR(191) NOT NULL,
  subject TEXT NOT NULL, \`to\` TEXT NOT NULL, opens INT NOT NULL DEFAULT 0,
  lastOpen TEXT, createdAt TEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS contracts (
  id VARCHAR(191) PRIMARY KEY, contractNumber TEXT NOT NULL, clientName TEXT NOT NULL,
  contractName TEXT NOT NULL, preTaxValue DOUBLE DEFAULT 0, invoiceDate TEXT, invoiceNumber TEXT,
  department VARCHAR(191) NOT NULL, createdBy VARCHAR(191) NOT NULL,
  docSentDate TEXT, docReceivedDate TEXT, docAccountantDate TEXT, docReceiver TEXT,
  docAccountantUserId VARCHAR(191), docAccountantStatus VARCHAR(64) DEFAULT 'pending',
  approvalFeedback TEXT, createdAt TEXT NOT NULL, updatedAt TEXT, isDeleted TINYINT DEFAULT 0,
  status VARCHAR(64) DEFAULT 'draft', attachments TEXT, products TEXT,
  vatRate DOUBLE DEFAULT 10, postTaxValue DOUBLE DEFAULT 0, paidAmount DOUBLE DEFAULT 0,
  projectId VARCHAR(191), contractType VARCHAR(64) DEFAULT 'output', supplierName TEXT,
  documentChecklist TEXT, signedDate TEXT, startDate TEXT, endDate TEXT,
  warrantyMonths INT DEFAULT 0, payments TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS revenue_reports (
  id VARCHAR(191) PRIMARY KEY, title TEXT NOT NULL, reportType VARCHAR(64) NOT NULL,
  periodStart TEXT NOT NULL, periodEnd TEXT NOT NULL, content TEXT,
  totalPreTax DOUBLE DEFAULT 0, totalDelivered DOUBLE DEFAULT 0, totalCumulative DOUBLE DEFAULT 0,
  authorId VARCHAR(191) NOT NULL, department VARCHAR(191) NOT NULL, status VARCHAR(64) NOT NULL DEFAULT 'Draft',
  approvedBy VARCHAR(191), approvedAt TEXT, managerFeedback TEXT, directorFeedback TEXT,
  createdAt TEXT NOT NULL, submittedAt TEXT, isDeleted TINYINT DEFAULT 0,
  generationMode VARCHAR(64) DEFAULT 'manual'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS projects (
  id VARCHAR(191) PRIMARY KEY, projectCode TEXT NOT NULL, name TEXT NOT NULL, clientName TEXT,
  department VARCHAR(191), managerId VARCHAR(191), status VARCHAR(64) DEFAULT 'planning',
  startDate TEXT, endDate TEXT, budget DOUBLE DEFAULT 0, description TEXT,
  biddingCode TEXT, biddingDate TEXT, procurementMethod TEXT, investor TEXT,
  biddingPrice DOUBLE DEFAULT 0, winningPrice DOUBLE DEFAULT 0,
  createdAt TEXT NOT NULL, updatedAt TEXT, isDeleted TINYINT DEFAULT 0,
  priority VARCHAR(64) DEFAULT 'medium', phase VARCHAR(64) DEFAULT 'initiation'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS project_reports (
  id VARCHAR(191) PRIMARY KEY, projectId VARCHAR(191) NOT NULL, title TEXT NOT NULL, content TEXT,
  progress INT DEFAULT 0, authorId VARCHAR(191) NOT NULL, status VARCHAR(64) DEFAULT 'draft',
  createdAt TEXT NOT NULL, updatedAt TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS project_milestones (
  id VARCHAR(191) PRIMARY KEY, projectId VARCHAR(191) NOT NULL, title TEXT NOT NULL,
  dueDate TEXT, completedAt TEXT, status VARCHAR(64) DEFAULT 'pending',
  sortOrder INT DEFAULT 0, createdAt TEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS contract_links (
  id VARCHAR(191) PRIMARY KEY, outputContractId VARCHAR(191) NOT NULL, inputContractId VARCHAR(191) NOT NULL,
  linkType VARCHAR(64) DEFAULT 'related', description TEXT, createdBy VARCHAR(191), createdAt TEXT NOT NULL,
  UNIQUE(outputContractId, inputContractId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS documents (
  id VARCHAR(191) PRIMARY KEY, name TEXT NOT NULL, url TEXT NOT NULL, size INT, type VARCHAR(191),
  category VARCHAR(191) NOT NULL, linkedId VARCHAR(191), createdBy VARCHAR(191) NOT NULL,
  createdAt TEXT NOT NULL, isDeleted TINYINT DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS clients (
  id VARCHAR(191) PRIMARY KEY, name VARCHAR(191) NOT NULL UNIQUE, region TEXT, createdAt TEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS products (
  id VARCHAR(191) PRIMARY KEY, name VARCHAR(191) NOT NULL, unit TEXT, origin TEXT,
  defaultPrice DOUBLE DEFAULT 0, createdAt TEXT NOT NULL, category VARCHAR(191),
  importQuantity INT DEFAULT 0, remainingQuantity INT DEFAULT 0,
  importPrice DOUBLE DEFAULT 0, salePrice DOUBLE DEFAULT 0, importCode VARCHAR(191), invoiceDate TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS mail_quotas (
  email VARCHAR(255) PRIMARY KEY, quota INT DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

export async function initDbMysql(): Promise<MysqlDb> {
  const url = process.env.DATABASE_URL || 'mysql://root:@127.0.0.1:3306/ctctask';
  const parsed = new URL(url);
  const dbName = parsed.pathname.replace(/^\//, '') || 'ctctask';
  const host = parsed.hostname || '127.0.0.1';
  const port = parseInt(parsed.port || '3306', 10);
  const user = decodeURIComponent(parsed.username || 'root');
  const password = decodeURIComponent(parsed.password || '');

  // Step 1: Connect to server without database to ensure database exists
  try {
    const serverConn = await mysql.createConnection({
      host,
      port,
      user,
      password,
      connectTimeout: 20000,
    });
    await serverConn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await serverConn.end();
  } catch (err: any) {
    console.warn(`[MySQL] Notice while ensuring database exists:`, err.message);
  }

  // Step 2: Connect to the specific database
  const connectionConfig: mysql.ConnectionOptions = {
    host,
    port,
    user,
    password,
    database: dbName,
    connectTimeout: 20000,
    charset: 'utf8mb4',
    timezone: 'Z',
  };

  let conn = await mysql.createConnection(connectionConfig);
  const db = new MysqlDb(conn, connectionConfig);

  // Create schema (idempotent CREATE TABLE IF NOT EXISTS).
  await db.exec(DDL);
  await db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      version INT PRIMARY KEY,
      name VARCHAR(191) NOT NULL,
      appliedAt TEXT NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // ─── Seeds (only when empty) ──────────────────────────────────────────────
  await seedIfEmpty(db);

  return db;
}

async function seedIfEmpty(db: MysqlDb) {
  // Patch existing system roles to ensure all permissions are included
  const rolePatches: { name: string; permissions: string[] }[] = [
    { name: 'Admin', permissions: ['admin_panel', 'manage_users', 'manage_meetings', 'view_all_tasks', 'manage_dept_tasks', 'view_own_tasks', 'view_all_reports', 'approve_dept_reports', 'director_feedback', 'create_report', 'view_dept_users', 'join_meetings', 'create_revenue_report', 'approve_dept_revenue', 'approve_all_revenue', 'manage_warehouse'] },
    { name: 'Director', permissions: ['view_all_reports', 'director_feedback', 'view_all_tasks', 'manage_meetings', 'join_meetings', 'approve_all_revenue', 'manage_warehouse'] },
    { name: 'Manager', permissions: ['manage_dept_tasks', 'approve_dept_reports', 'view_dept_users', 'manage_meetings', 'join_meetings', 'create_report', 'create_revenue_report', 'approve_dept_revenue', 'manage_warehouse'] },
    { name: 'Employee', permissions: ['view_own_tasks', 'create_report', 'join_meetings', 'create_revenue_report'] },
  ];
  for (const patch of rolePatches) {
    const existing = await db.get('SELECT permissions FROM roles WHERE name = ? AND isSystem = 1', [patch.name]);
    if (existing) {
      let perms: string[] = [];
      try { perms = JSON.parse(existing.permissions || '[]'); } catch { perms = []; }
      let changed = false;
      for (const p of patch.permissions) {
        if (!perms.includes(p)) { perms.push(p); changed = true; }
      }
      if (changed) {
        await db.run('UPDATE roles SET permissions = ? WHERE name = ? AND isSystem = 1', [JSON.stringify(perms), patch.name]);
      }
    }
  }

  // Seed Roles
  const roleCount = await db.get('SELECT COUNT(*) as count FROM roles');
  if (roleCount && roleCount.count === 0) {
    const INITIAL_ROLES = [
      { id: 'role-admin', name: 'Admin', description: 'Toàn quyền hệ thống.', color: '#ef4444', permissions: JSON.stringify(['admin_panel', 'manage_users', 'manage_meetings', 'view_all_tasks', 'manage_dept_tasks', 'view_own_tasks', 'view_all_reports', 'approve_dept_reports', 'director_feedback', 'create_report', 'view_dept_users', 'join_meetings', 'create_revenue_report', 'approve_dept_revenue', 'approve_all_revenue', 'manage_warehouse']), isSystem: 1 },
      { id: 'role-director', name: 'Director', description: 'Xem toàn bộ báo cáo, cung cấp phản hồi Giám đốc.', color: '#8b5cf6', permissions: JSON.stringify(['view_all_reports', 'director_feedback', 'view_all_tasks', 'manage_meetings', 'join_meetings', 'approve_all_revenue', 'manage_warehouse']), isSystem: 1 },
      { id: 'role-manager', name: 'Manager', description: 'Quản lý nhân viên trong phòng ban, giao việc, duyệt báo cáo phòng ban và doanh thu.', color: '#3b82f6', permissions: JSON.stringify(['manage_dept_tasks', 'approve_dept_reports', 'view_dept_users', 'manage_meetings', 'join_meetings', 'create_report', 'create_revenue_report', 'approve_dept_revenue', 'manage_warehouse']), isSystem: 1 },
      { id: 'role-employee', name: 'Employee', description: 'Xem và thực hiện công việc được giao, tạo báo cáo tuần và doanh thu.', color: '#10b981', permissions: JSON.stringify(['view_own_tasks', 'create_report', 'join_meetings', 'create_revenue_report']), isSystem: 1 },
    ];
    for (const r of INITIAL_ROLES) {
      await db.run('INSERT INTO roles (id, name, description, color, permissions, isSystem) VALUES (?, ?, ?, ?, ?, ?)', [r.id, r.name, r.description, r.color, r.permissions, r.isSystem]);
    }
  }

  // Seed Departments
  const deptCount = await db.get('SELECT COUNT(*) as count FROM departments');
  if (deptCount && deptCount.count === 0) {
    const INITIAL_DEPTS = [
      { id: 'dept-board', name: 'Board', description: 'Hội đồng quản trị và ban lãnh đạo công ty.', color: '#ef4444' },
      { id: 'dept-product', name: 'Product', description: 'Phát triển và quản lý sản phẩm.', color: '#3b82f6' },
      { id: 'dept-marketing', name: 'Marketing', description: 'Tiếp thị và truyền thông thương hiệu.', color: '#f59e0b' },
      { id: 'dept-sales', name: 'Sales', description: 'Kiến tạo doanh thu và phát triển thị trường.', color: '#10b981' },
      { id: 'dept-it', name: 'IT', description: 'Hạ tầng công nghệ và hệ thống nội bộ.', color: '#8b5cf6' },
      { id: 'dept-hr', name: 'HR', description: 'Nhân sự, tuyển dụng và phát triển văn hoá doanh nghiệp.', color: '#ec4899' },
      { id: 'dept-finance', name: 'Finance', description: 'Kế toán, tài chính và kiểm soát ngân sách.', color: '#14b8a6' },
    ];
    for (const d of INITIAL_DEPTS) {
      await db.run('INSERT INTO departments (id, name, description, color) VALUES (?, ?, ?, ?)', [d.id, d.name, d.description, d.color]);
    }
  }

  // Seed Users
  const userCount = await db.get('SELECT COUNT(*) as count FROM users');
  if (userCount && userCount.count === 0) {
    const adminPwd = process.env.ADMIN_DEFAULT_PASSWORD || 'TranLe@dmin2026!';
    const INITIAL_USERS = [
      { id: 'u1', name: 'Admin', email: 'admin@tranlecorp.com.vn', password: await bcrypt.hash(adminPwd, 10), role: 'Admin', department: 'Board', avatar: 'https://i.pravatar.cc/150?u=u1', phone: '0939792428', dob: '1990-01-01', hometown: 'Đà Nẵng', bio: 'Quản trị viên hệ thống Tran Le Electricity.' },
      { id: 'u2', name: 'Nguyễn Văn Đạt', email: 'vandat@tranlecorp.com.vn', password: await bcrypt.hash(adminPwd, 10), role: 'Manager', department: 'Product', avatar: 'https://i.pravatar.cc/150?u=u2', phone: '0987654321', dob: '1985-06-15', hometown: 'Đà Nẵng', bio: 'Quản lý dự án & kỹ thuật điện mặt trời.' },
      { id: 'u3', name: 'Phan Xuân Mạnh', email: 'xuanmanh@tranlecorp.com.vn', password: await bcrypt.hash(adminPwd, 10), role: 'Employee', department: 'Product', avatar: 'https://i.pravatar.cc/150?u=u3', phone: '0123456789', dob: '2002-09-07', hometown: 'Đà Nẵng', bio: 'Kỹ sư giải pháp năng lượng tái tạo.' },
      { id: 'u4', name: 'Nguyễn Văn Duy', email: 'vanduy@tranlecorp.com.vn', password: await bcrypt.hash(adminPwd, 10), role: 'Director', department: 'Board', avatar: 'https://i.pravatar.cc/150?u=u4', phone: '0939792428', dob: '1980-02-20', hometown: 'Đà Nẵng', bio: 'Ban Giám đốc Tran Le Electricity.' },
    ];
    console.log(`🔑 Seed users created. Default password: ${adminPwd.slice(0, 3)}${'*'.repeat(Math.max(adminPwd.length - 3, 0))}`);
    for (const u of INITIAL_USERS) {
      await db.run('INSERT INTO users (id, name, email, password, role, department, avatar, phone, dob, hometown, bio) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [u.id, u.name, u.email, u.password, u.role, u.department, u.avatar, u.phone, u.dob, u.hometown, u.bio]);
    }
  }

  // Seed Tasks
  const taskCount = await db.get('SELECT COUNT(*) as count FROM tasks');
  if (taskCount && taskCount.count === 0) {
    const todayStr = new Date().toISOString().split('T')[0];
    await db.run(
      'INSERT INTO tasks (id, title, description, startDate, estimatedEndAt, priority, status, createdBy, department, recurrence) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      ['t1', 'Design System Review', 'Review the new color palette and component library compatibility.', todayStr, null, 'High', 'In Progress', 'u1', 'Board', 'None']
    );
    await db.run('INSERT INTO task_assignees (taskId, userId) VALUES (?, ?)', ['t1', 'u1']);
    await db.run('INSERT INTO task_assignees (taskId, userId) VALUES (?, ?)', ['t1', 'u2']);
    await db.run('INSERT INTO task_tags (taskId, tag) VALUES (?, ?)', ['t1', 'Design']);
    await db.run('INSERT INTO task_tags (taskId, tag) VALUES (?, ?)', ['t1', 'UI/UX']);
    await db.run('INSERT INTO task_subtasks (id, taskId, title, isCompleted, sortOrder) VALUES (?, ?, ?, ?, ?)', ['st1', 't1', 'Check color contrast ratios', 1, 0]);
  }

  // Seed Notes
  const noteCount = await db.get('SELECT COUNT(*) as count FROM notes');
  if (noteCount && noteCount.count === 0) {
    await db.run('INSERT INTO notes (id, title, content, color, createdAt) VALUES (?, ?, ?, ?, ?)', ['n1', 'Brainstorming Ideas', '- New UI looks great\n- Need to check contrast ratio', 'bg-yellow-100', new Date().toISOString()]);
  }

  // Seed Events (Vietnamese National Holidays)
  const eventCount = await db.get('SELECT COUNT(*) as count FROM events');
  if (eventCount && eventCount.count === 0) {
    const year = new Date().getFullYear();
    const holidays = [
      { id: 'evt-01', title: 'Tết Dương Lịch', date: `${year}-01-01`, type: 'holiday', color: '#ef4444', description: 'Ngày đầu năm mới dương lịch', isRecurringYearly: 1 },
      { id: 'evt-02', title: 'Tết Nguyên Đán', date: `${year}-01-28`, endDate: `${year}-02-02`, type: 'holiday', color: '#f97316', description: 'Tết Nguyên Đán – nghỉ 7 ngày', isRecurringYearly: 0 },
      { id: 'evt-03', title: 'Giỗ Tổ Hùng Vương', date: `${year}-04-07`, type: 'holiday', color: '#8b5cf6', description: 'Ngày Giỗ Tổ Hùng Vương (10/3 âm lịch)', isRecurringYearly: 0 },
      { id: 'evt-04', title: 'Ngày Giải phóng Miền Nam', date: `${year}-04-30`, type: 'holiday', color: '#ef4444', description: 'Ngày Giải phóng Miền Nam – thống nhất đất nước', isRecurringYearly: 1 },
      { id: 'evt-05', title: 'Ngày Quốc tế Lao động', date: `${year}-05-01`, type: 'holiday', color: '#ef4444', description: 'Ngày Quốc tế Lao động 1/5', isRecurringYearly: 1 },
      { id: 'evt-06', title: 'Ngày Quốc khánh', date: `${year}-09-02`, endDate: `${year}-09-03`, type: 'holiday', color: '#ef4444', description: 'Quốc khánh nước CHXHCN Việt Nam', isRecurringYearly: 1 },
    ];
    for (const h of holidays) {
      await db.run(
        'INSERT INTO events (id, title, date, endDate, type, color, description, isRecurringYearly) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [h.id, h.title, h.date, h.endDate || null, h.type, h.color, h.description, h.isRecurringYearly]
      );
    }
  }

  // Seed Clients
  const clientCount = await db.get('SELECT COUNT(*) as count FROM clients');
  if (clientCount && clientCount.count === 0) {
    const vnpts = [
      { id: 'client-1', name: 'VNPT Hà Nội', region: 'Hà Nội' },
      { id: 'client-2', name: 'VNPT Cao Bằng', region: 'Cao Bằng' },
      { id: 'client-3', name: 'VNPT Tuyên Quang', region: 'Tuyên Quang + Hà Giang' },
      { id: 'client-4', name: 'VNPT Lào Cai', region: 'Lào Cai + Yên Bái' },
      { id: 'client-5', name: 'VNPT Lai Châu', region: 'Lai Châu' },
      { id: 'client-6', name: 'VNPT Điện Biên', region: 'Điện Biên' },
      { id: 'client-7', name: 'VNPT Sơn La', region: 'Sơn La' },
      { id: 'client-8', name: 'VNPT Thái Nguyên', region: 'Thái Nguyên + Bắc Kạn' },
      { id: 'client-9', name: 'VNPT Lạng Sơn', region: 'Lạng Sơn' },
      { id: 'client-10', name: 'VNPT Quảng Ninh', region: 'Quảng Ninh' },
      { id: 'client-11', name: 'VNPT Phú Thọ', region: 'Phú Thọ + Vĩnh Phúc + Hòa Bình' },
      { id: 'client-12', name: 'VNPT Bắc Ninh', region: 'Bắc Ninh + Bắc Giang' },
      { id: 'client-13', name: 'VNPT Hải Phòng', region: 'Hải Phòng + Hải Dương' },
      { id: 'client-14', name: 'VNPT Hưng Yên', region: 'Hưng Yên + Thái Bình' },
      { id: 'client-15', name: 'VNPT Ninh Bình', region: 'Ninh Bình + Nam Định + Hà Nam' },
      { id: 'client-16', name: 'VNPT Thanh Hóa', region: 'Thanh Hóa' },
      { id: 'client-17', name: 'VNPT Nghệ An', region: 'Nghệ An' },
      { id: 'client-18', name: 'VNPT Hà Tĩnh', region: 'Hà Tĩnh' },
      { id: 'client-19', name: 'VNPT Quảng Trị', region: 'Quảng Trị + Quảng Bình' },
      { id: 'client-20', name: 'VNPT Huế', region: 'Thành phố Huế' },
      { id: 'client-21', name: 'VNPT Đà Nẵng', region: 'Đà Nẵng + Quảng Nam' },
      { id: 'client-22', name: 'VNPT Quảng Ngãi', region: 'Quảng Ngãi + Kon Tum' },
      { id: 'client-23', name: 'VNPT Gia Lai', region: 'Gia Lai + Bình Định' },
      { id: 'client-24', name: 'VNPT Khánh Hòa', region: 'Khánh Hòa + Ninh Thuận' },
      { id: 'client-25', name: 'VNPT Lâm Đồng', region: 'Lâm Đồng + Đắk Nông + Bình Thuận' },
      { id: 'client-26', name: 'VNPT Đắk Lắk', region: 'Đắk Lắk + Phú Yên' },
      { id: 'client-27', name: 'VNPT TP. Hồ Chí Minh', region: 'TP.HCM + Bình Dương + Bà Rịa - Vũng Tàu' },
      { id: 'client-28', name: 'VNPT Đồng Nai', region: 'Đồng Nai + Bình Phước' },
      { id: 'client-29', name: 'VNPT Tây Ninh', region: 'Tây Ninh + Long An' },
      { id: 'client-30', name: 'VNPT Cần Thơ', region: 'Cần Thơ + Hậu Giang + Sóc Trăng' },
      { id: 'client-31', name: 'VNPT Vĩnh Long', region: 'Vĩnh Long + Bến Tre + Trà Vinh' },
      { id: 'client-32', name: 'VNPT Đồng Tháp', region: 'Đồng Tháp + Tiền Giang' },
      { id: 'client-33', name: 'VNPT Cà Mau', region: 'Cà Mau + Bạc Liêu' },
      { id: 'client-34', name: 'VNPT An Giang', region: 'An Giang + Kiên Giang' },
    ];
    for (const c of vnpts) {
      await db.run('INSERT INTO clients (id, name, region, createdAt) VALUES (?, ?, ?, ?)', [c.id, c.name, c.region, new Date().toISOString()]);
    }
  }
}

