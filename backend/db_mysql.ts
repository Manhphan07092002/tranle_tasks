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

export class MysqlDb {
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

CREATE TABLE IF NOT EXISTS teams (
  id VARCHAR(191) PRIMARY KEY, departmentId VARCHAR(191) NOT NULL, code VARCHAR(64),
  name VARCHAR(191) NOT NULL, description TEXT, managerId VARCHAR(191),
  color VARCHAR(64) DEFAULT '#16a34a', isActive TINYINT NOT NULL DEFAULT 1,
  createdAt TEXT NOT NULL, updatedAt TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS positions (
  id VARCHAR(191) PRIMARY KEY, departmentId VARCHAR(191), teamId VARCHAR(191), code VARCHAR(64),
  name VARCHAR(191) NOT NULL, description TEXT, level INT DEFAULT 1,
  isManager TINYINT NOT NULL DEFAULT 0, isActive TINYINT NOT NULL DEFAULT 1,
  createdAt TEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS project_departments (
  projectId VARCHAR(191) NOT NULL, departmentId VARCHAR(191) NOT NULL,
  role VARCHAR(64) DEFAULT 'member',
  PRIMARY KEY (projectId, departmentId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS project_members (
  projectId VARCHAR(191) NOT NULL, userId VARCHAR(191) NOT NULL,
  role VARCHAR(64) DEFAULT 'member',
  PRIMARY KEY (projectId, userId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS department_requests (
  id VARCHAR(191) PRIMARY KEY,
  requestNumber VARCHAR(64) UNIQUE,
  sourceDepartmentId VARCHAR(191) NOT NULL,
  targetDepartmentId VARCHAR(191) NOT NULL,
  requesterId VARCHAR(191) NOT NULL,
  assigneeId VARCHAR(191),
  title TEXT NOT NULL,
  description TEXT,
  priority VARCHAR(64) DEFAULT 'Medium',
  status VARCHAR(64) DEFAULT 'pending',
  relatedEntityType VARCHAR(64),
  relatedEntityId VARCHAR(191),
  dueDate TEXT,
  attachments TEXT,
  outputData TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS approvals (
  id VARCHAR(191) PRIMARY KEY,
  approvalCode VARCHAR(64) UNIQUE,
  entityType VARCHAR(64) NOT NULL,
  entityId VARCHAR(191) NOT NULL,
  title TEXT NOT NULL,
  amount DOUBLE DEFAULT 0,
  requestedBy VARCHAR(191) NOT NULL,
  departmentId VARCHAR(191),
  approverId VARCHAR(191) NOT NULL,
  status VARCHAR(64) DEFAULT 'pending',
  comment TEXT,
  requestedAt TEXT NOT NULL,
  respondedAt TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS task_templates (
  id VARCHAR(191) PRIMARY KEY,
  departmentId VARCHAR(191) NOT NULL,
  code VARCHAR(64) UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  estimatedHours DOUBLE DEFAULT 0,
  priority VARCHAR(64) DEFAULT 'Medium',
  taskType VARCHAR(64) NOT NULL,
  checklist TEXT,
  defaultTags TEXT,
  requiresApproval TINYINT DEFAULT 0,
  createdAt TEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS customer_tickets (
  id VARCHAR(191) PRIMARY KEY,
  customer TEXT NOT NULL,
  channel VARCHAR(64) NOT NULL,
  title TEXT NOT NULL,
  status VARCHAR(64) NOT NULL,
  time TEXT,
  agent VARCHAR(191),
  avatar TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS contract_renewals (
  id VARCHAR(191) PRIMARY KEY,
  customer TEXT NOT NULL,
  expiry TEXT NOT NULL,
  value VARCHAR(191) NOT NULL,
  status VARCHAR(64) NOT NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS engineering_requests (
  id VARCHAR(191) PRIMARY KEY,
  type VARCHAR(64) NOT NULL,
  project TEXT NOT NULL,
  date TEXT,
  status VARCHAR(64) NOT NULL,
  priority VARCHAR(64),
  createdAt TEXT NOT NULL,
  updatedAt TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS engineering_designs (
  id VARCHAR(191) PRIMARY KEY,
  name TEXT NOT NULL,
  capacity VARCHAR(64),
  stage VARCHAR(64),
  progress INT DEFAULT 0,
  tasks TEXT,
  status VARCHAR(64) NOT NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS epc_subcontractors (
  id VARCHAR(191) PRIMARY KEY,
  name TEXT NOT NULL,
  task TEXT NOT NULL,
  rating DECIMAL(3, 1),
  status VARCHAR(64) NOT NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS executive_metrics (
  id VARCHAR(191) PRIMARY KEY,
  month VARCHAR(64) NOT NULL,
  revenue INT NOT NULL,
  cost INT NOT NULL,
  profit INT NOT NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS company_okrs (
  id VARCHAR(191) PRIMARY KEY,
  objective TEXT NOT NULL,
  progress INT NOT NULL,
  dept VARCHAR(64) NOT NULL,
  status VARCHAR(64) NOT NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS executive_meetings (
  id VARCHAR(191) PRIMARY KEY,
  title TEXT NOT NULL,
  date TEXT NOT NULL,
  actions INT NOT NULL,
  pending INT NOT NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS finance_ap (
  id VARCHAR(191) PRIMARY KEY,
  dept TEXT NOT NULL,
  desc_text TEXT NOT NULL,
  amount VARCHAR(64) NOT NULL,
  vendor TEXT NOT NULL,
  date TEXT NOT NULL,
  status VARCHAR(64) NOT NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS finance_ar (
  id VARCHAR(191) PRIMARY KEY,
  project TEXT NOT NULL,
  desc_text TEXT NOT NULL,
  amount VARCHAR(64) NOT NULL,
  customer TEXT NOT NULL,
  dueDate TEXT NOT NULL,
  status VARCHAR(64) NOT NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS hr_recruitment (
  id VARCHAR(191) PRIMARY KEY,
  title TEXT NOT NULL,
  dept TEXT NOT NULL,
  slots INT NOT NULL,
  applied INT NOT NULL,
  status VARCHAR(64) NOT NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS hr_employees (
  id VARCHAR(191) PRIMARY KEY,
  name TEXT NOT NULL,
  position TEXT NOT NULL,
  dept TEXT NOT NULL,
  status VARCHAR(64) NOT NULL,
  pto INT NOT NULL,
  timesheet TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS it_tickets (
  id VARCHAR(191) PRIMARY KEY,
  issue TEXT NOT NULL,
  requester TEXT NOT NULL,
  priority VARCHAR(64) NOT NULL,
  status VARCHAR(64) NOT NULL,
  time TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS it_assets (
  id VARCHAR(191) PRIMARY KEY,
  name TEXT NOT NULL,
  assignee TEXT NOT NULL,
  type VARCHAR(64) NOT NULL,
  status VARCHAR(64) NOT NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS it_systems (
  id VARCHAR(191) PRIMARY KEY,
  name TEXT NOT NULL,
  status VARCHAR(64) NOT NULL,
  uptime VARCHAR(64) NOT NULL,
  load_pct VARCHAR(64) NOT NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS legal_contracts (
  id VARCHAR(191) PRIMARY KEY,
  title TEXT NOT NULL,
  partner TEXT NOT NULL,
  type VARCHAR(64) NOT NULL,
  value VARCHAR(64) NOT NULL,
  status VARCHAR(64) NOT NULL,
  expiry TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS legal_approvals (
  id VARCHAR(191) PRIMARY KEY,
  title TEXT NOT NULL,
  entity TEXT NOT NULL,
  requester TEXT NOT NULL,
  step VARCHAR(64) NOT NULL,
  urgency VARCHAR(64) NOT NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS legal_library (
  id VARCHAR(191) PRIMARY KEY,
  title TEXT NOT NULL,
  category VARCHAR(64) NOT NULL,
  date TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS marketing_campaigns (
  id VARCHAR(191) PRIMARY KEY,
  title TEXT NOT NULL,
  channels TEXT NOT NULL,
  status VARCHAR(64) NOT NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS marketing_leads (
  id VARCHAR(191) PRIMARY KEY,
  source TEXT NOT NULL,
  percentage VARCHAR(64) NOT NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS om_alarms (
  id VARCHAR(191) PRIMARY KEY,
  site TEXT NOT NULL,
  inverter TEXT NOT NULL,
  fault TEXT NOT NULL,
  time TEXT NOT NULL,
  severity VARCHAR(64) NOT NULL,
  status VARCHAR(64) NOT NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS om_schedules (
  id VARCHAR(191) PRIMARY KEY,
  site TEXT NOT NULL,
  task TEXT NOT NULL,
  date TEXT NOT NULL,
  team TEXT NOT NULL,
  status VARCHAR(64) NOT NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS procurement_prs (
  id VARCHAR(191) PRIMARY KEY,
  project TEXT NOT NULL,
  items TEXT NOT NULL,
  date TEXT NOT NULL,
  status VARCHAR(64) NOT NULL,
  priority VARCHAR(64) NOT NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS procurement_pos (
  id VARCHAR(191) PRIMARY KEY,
  supplier TEXT NOT NULL,
  value DOUBLE NOT NULL,
  items TEXT NOT NULL,
  stage VARCHAR(64) NOT NULL,
  progress INTEGER NOT NULL,
  eta TEXT NOT NULL,
  status VARCHAR(64) NOT NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS warehouse_inventory (
  id VARCHAR(191) PRIMARY KEY,
  sku TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  stock INTEGER NOT NULL,
  minStock INTEGER NOT NULL,
  unit TEXT NOT NULL,
  image TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS warehouse_inbound (
  id VARCHAR(191) PRIMARY KEY,
  source TEXT NOT NULL,
  items TEXT NOT NULL,
  date TEXT NOT NULL,
  status VARCHAR(64) NOT NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS warehouse_outbound (
  id VARCHAR(191) PRIMARY KEY,
  project TEXT NOT NULL,
  items TEXT NOT NULL,
  date TEXT NOT NULL,
  status VARCHAR(64) NOT NULL,
  requestedBy TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sales_leads (
  id VARCHAR(191) PRIMARY KEY,
  name TEXT NOT NULL,
  value DOUBLE NOT NULL,
  capacity TEXT NOT NULL,
  contact TEXT NOT NULL,
  stage VARCHAR(64) NOT NULL,
  sent BOOLEAN DEFAULT false,
  createdAt TEXT NOT NULL,
  updatedAt TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sales_performance (
  id VARCHAR(191) PRIMARY KEY,
  name TEXT NOT NULL,
  sales INTEGER NOT NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

async function ensureColumnExists(db: MysqlDb, tableName: string, columnName: string, columnDef: string) {
  try {
    const row = await db.get(
      `SELECT column_name FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?`,
      [tableName, columnName]
    );
    if (!row) {
      await db.exec(`ALTER TABLE \`${tableName}\` ADD COLUMN \`${columnName}\` ${columnDef}`);
    }
  } catch (err: any) {
    console.warn(`[Migration] Notice ensuring column ${tableName}.${columnName}:`, err.message);
  }
}

export async function initDbMysql(): Promise<MysqlDb> {
  let host = process.env.MYSQL_HOST || '';
  let port = parseInt(process.env.MYSQL_PORT || '3306', 10);
  let user = process.env.MYSQL_USER || 'root';
  let password = process.env.MYSQL_PASSWORD || '';
  let dbName = process.env.MYSQL_DATABASE || 'tranletask';

  if (process.env.DATABASE_URL) {
    try {
      const parsed = new URL(process.env.DATABASE_URL);
      dbName = parsed.pathname.replace(/^\//, '') || dbName;
      if (!host && parsed.hostname) {
        host = parsed.hostname;
      }
      if (parsed.port) {
        port = parseInt(parsed.port, 10);
      }
      if (parsed.username && user === 'root') {
        user = decodeURIComponent(parsed.username);
      }
      if (parsed.password && !password) {
        password = decodeURIComponent(parsed.password);
      }
    } catch {
      // ignore URL parsing error
    }
  }

  if (!host) {
    host = '127.0.0.1';
  }

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

  // Ensure relational columns exist on existing tables
  await ensureColumnExists(db, 'departments', 'code', 'VARCHAR(64)');
  await ensureColumnExists(db, 'departments', 'icon', 'VARCHAR(64)');
  await ensureColumnExists(db, 'departments', 'parentId', 'VARCHAR(191)');
  await ensureColumnExists(db, 'departments', 'sortOrder', 'INT DEFAULT 0');
  await ensureColumnExists(db, 'departments', 'isActive', 'TINYINT NOT NULL DEFAULT 1');
  await ensureColumnExists(db, 'departments', 'createdAt', 'TEXT');
  await ensureColumnExists(db, 'departments', 'updatedAt', 'TEXT');

  await ensureColumnExists(db, 'users', 'departmentId', 'VARCHAR(191)');
  await ensureColumnExists(db, 'users', 'teamId', 'VARCHAR(191)');
  await ensureColumnExists(db, 'users', 'positionId', 'VARCHAR(191)');
  await ensureColumnExists(db, 'users', 'managerId', 'VARCHAR(191)');
  await ensureColumnExists(db, 'users', 'roleId', 'VARCHAR(191)');
  await ensureColumnExists(db, 'users', 'status', "VARCHAR(64) DEFAULT 'active'");
  await ensureColumnExists(db, 'users', 'employmentStatus', "VARCHAR(64) DEFAULT 'full_time'");

  await ensureColumnExists(db, 'tasks', 'departmentId', 'VARCHAR(191)');
  await ensureColumnExists(db, 'tasks', 'teamId', 'VARCHAR(191)');
  await ensureColumnExists(db, 'tasks', 'assigneeId', 'VARCHAR(191)');
  await ensureColumnExists(db, 'tasks', 'milestoneId', 'VARCHAR(191)');
  await ensureColumnExists(db, 'tasks', 'customerId', 'VARCHAR(191)');
  await ensureColumnExists(db, 'tasks', 'taskType', "VARCHAR(64) DEFAULT 'general'");
  await ensureColumnExists(db, 'tasks', 'estimatedHours', 'DOUBLE DEFAULT 0');
  await ensureColumnExists(db, 'tasks', 'actualHours', 'DOUBLE DEFAULT 0');
  await ensureColumnExists(db, 'tasks', 'parentTaskId', 'VARCHAR(191)');
  await ensureColumnExists(db, 'tasks', 'requiresApproval', 'TINYINT DEFAULT 0');
  await ensureColumnExists(db, 'tasks', 'approvalStatus', "VARCHAR(64) DEFAULT 'none'");
  await ensureColumnExists(db, 'tasks', 'approvedBy', 'VARCHAR(191)');
  await ensureColumnExists(db, 'tasks', 'completedAt', 'TEXT');

  await ensureColumnExists(db, 'projects', 'primaryDepartmentId', 'VARCHAR(191)');
  await ensureColumnExists(db, 'projects', 'departmentId', 'VARCHAR(191)');
  await ensureColumnExists(db, 'contracts', 'departmentId', 'VARCHAR(191)');
  await ensureColumnExists(db, 'revenue_reports', 'departmentId', 'VARCHAR(191)');
  await ensureColumnExists(db, 'reports', 'departmentId', 'VARCHAR(191)');

  // ─── Seeds (only when empty or updating) ──────────────────────────────────
  await seedIfEmpty(db);

  return db;
}


async function seedIfEmpty(db: MysqlDb) {
  const now = new Date().toISOString();
  const todayStr = now.split('T')[0];

  // ── 1. System Config (Company Profile & Design Tokens) ─────────────────────
  const COMPANY_CONFIGS: [string, string][] = [
    ['company_name', 'Công ty Cổ phần Tư vấn xây dựng Điện Trần Lê'],
    ['brand_name', 'Tran Le Electricity'],
    ['company_website', 'https://tranlecorp.com/'],
    ['company_email', 'info@tranlecorp.com.vn'],
    ['company_hotline', '0939 792 428'],
    ['company_founded', '2015'],
    ['company_anniversary', '25/11/2015 – 25/11/2025 (Kỷ niệm 10 năm thành lập)'],
    ['company_industry', 'Năng lượng tái tạo, điện mặt trời và các giải pháp năng lượng'],
    ['company_mission', 'Mang năng lượng sạch đến mọi nhà.'],
    ['company_vision', 'Dẫn đầu thị trường năng lượng tái tạo.'],
    ['company_core_values', 'Uy tín – Chất lượng – Bền vững.'],
    ['company_headquarter', '275-277-279 Diên Hồng, phường Hoà Xuân, Quận Cẩm Lệ, TP. Đà Nẵng, Việt Nam'],
    ['company_southern_office', 'Số 2 Đường số 27, Khu Dân Cư Vạn Phúc, Phường Hiệp Bình, TP.HCM'],
    ['company_warehouse_hanoi', 'Kho Cầu Nhật Tân, Xã Vân Nội, Huyện Đông Anh, TP. Hà Nội'],
    ['company_warehouse_danang_1', 'Kho 1: 275–279 Diên Hồng, Phường Hoà Xuân, Quận Cẩm Lệ, TP. Đà Nẵng'],
    ['company_warehouse_danang_2', 'Kho 2: Đường Võ An Ninh – Phan Triêm, Phường Hoà Xuân, Quận Cẩm Lệ, TP. Đà Nẵng'],
    ['company_warehouse_hcm', 'Kho 1: 02 Nguyễn Ảnh Thủ, Phường Trung Mỹ Tây, Quận 12, TP.HCM'],
    ['company_warehouse_vungtau', 'Kho 2: Phú Mỹ, Thị xã Phú Mỹ, Tỉnh Bà Rịa – Vũng Tàu'],
    ['saj_partnership_date', '08/03/2026'],
    ['saj_service_center', 'Trung Tâm Dịch Vụ & Bảo Hành Ủy Quyền SAJ tại Việt Nam'],
    ['brand_primary_color', '#16A34A'],
    ['brand_secondary_color', '#F59E0B'],
    ['brand_dark_color', '#0F172A'],
  ];

  for (const [key, value] of COMPANY_CONFIGS) {
    await db.run(
      'INSERT INTO system_config (`key`, `value`) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',
      [key, value]
    );
  }

  // ── 2. Roles (Design System Color Tokens) ──────────────────────────────────
  const INITIAL_ROLES = [
    {
      id: 'role-admin',
      name: 'Admin',
      description: 'Toàn quyền quản trị hệ thống Tran Le Electricity.',
      color: '#ef4444',
      permissions: JSON.stringify([
        'admin_panel', 'manage_users', 'manage_meetings', 'view_all_tasks',
        'manage_dept_tasks', 'view_own_tasks', 'view_all_reports', 'approve_dept_reports',
        'director_feedback', 'create_report', 'view_dept_users', 'join_meetings',
        'create_revenue_report', 'approve_dept_revenue', 'approve_all_revenue', 'manage_warehouse'
      ]),
      isSystem: 1
    },
    {
      id: 'role-director',
      name: 'Director',
      description: 'Ban Giám đốc — Phê duyệt dự án điện mặt trời, kế hoạch tài chính và chiến lược phát triển.',
      color: '#0f172a', // Design System Dark / Navy
      permissions: JSON.stringify([
        'view_all_reports', 'director_feedback', 'view_all_tasks', 'manage_meetings',
        'join_meetings', 'approve_all_revenue', 'manage_warehouse'
      ]),
      isSystem: 1
    },
    {
      id: 'role-manager',
      name: 'Manager',
      description: 'Quản lý khối kỹ thuật/phòng ban, điều phối dự án EPC/O&M, phân công nhiệm vụ và duyệt báo cáo.',
      color: '#16a34a', // Design System Primary Energy Green
      permissions: JSON.stringify([
        'manage_dept_tasks', 'approve_dept_reports', 'view_dept_users', 'manage_meetings',
        'join_meetings', 'create_report', 'create_revenue_report', 'approve_dept_revenue', 'manage_warehouse'
      ]),
      isSystem: 1
    },
    {
      id: 'role-deputy-manager',
      name: 'Phó Phòng',
      description: 'Phó Trưởng phòng phụ trách chuyên môn, hỗ trợ điều hành công việc và giám sát tiến độ dự án.',
      color: '#0284c7', // Sky blue
      permissions: JSON.stringify([
        'manage_dept_tasks', 'approve_dept_reports', 'view_dept_users', 'manage_meetings',
        'join_meetings', 'create_report', 'create_revenue_report', 'approve_dept_revenue', 'manage_warehouse'
      ]),
      isSystem: 1
    },
    {
      id: 'role-employee',
      name: 'Employee',
      description: 'Kỹ sư & nhân viên thực thi dự án, tư vấn thiết kế, thi công lắp đặt, O&M và báo cáo tiến độ.',
      color: '#f59e0b', // Design System Solar Gold
      permissions: JSON.stringify([
        'view_own_tasks', 'create_report', 'join_meetings', 'create_revenue_report'
      ]),
      isSystem: 1
    },
  ];

  for (const r of INITIAL_ROLES) {
    const existing = await db.get('SELECT id FROM roles WHERE name = ?', [r.name]);
    if (!existing) {
      await db.run(
        'INSERT INTO roles (id, name, description, color, permissions, isSystem) VALUES (?, ?, ?, ?, ?, ?)',
        [r.id, r.name, r.description, r.color, r.permissions, r.isSystem]
      );
    } else {
      await db.run(
        'UPDATE roles SET description = ?, color = ?, permissions = ? WHERE name = ?',
        [r.description, r.color, r.permissions, r.name]
      );
    }
  }

  // ── 3. Departments (13 Core Tran Le Departments from Specification) ───────
  const TRANLE_DEPTS = [
    { id: 'dept-exec', code: 'EXEC', name: 'Ban Giám Đốc', description: 'Hội đồng quản trị & Ban Tổng Giám đốc định hướng chiến lược năng lượng tái tạo.', color: '#0f172a', icon: 'Crown', sortOrder: 1 },
    { id: 'dept-sales', code: 'SALES', name: 'Phòng Kinh Doanh', description: 'Kinh doanh giải pháp điện mặt trời (B2B, Phân phối thiết bị, Dân dụng).', color: '#f59e0b', icon: 'TrendingUp', sortOrder: 2 },
    { id: 'dept-eng', code: 'ENG', name: 'Phòng Kỹ Thuật Solar', description: 'Khảo sát hiện trạng, mô phỏng PVSyst/AutoCAD, bóc tách BOM và tối ưu hóa giải pháp kỹ thuật.', color: '#8b5cf6', icon: 'Cpu', sortOrder: 3 },
    { id: 'dept-epc', code: 'EPC', name: 'Khối Tổng Thầu EPC & Thi Công', description: 'Quản lý dự án, mua sắm vật tư, thi công xây lắp và đóng điện nghiệm thu các dự án MWp.', color: '#16a34a', icon: 'Wrench', sortOrder: 4 },
    { id: 'dept-om', code: 'OM', name: 'Trung Tâm Dịch Vụ & Bảo Hành O&M (SAJ Center)', description: 'Vận hành, bảo trì O&M 24/7 và Trung tâm Dịch vụ Bảo hành ủy quyền SAJ tại Việt Nam.', color: '#0ea5e9', icon: 'ShieldCheck', sortOrder: 5 },
    { id: 'dept-proc', code: 'PROC', name: 'Phòng Mua Hàng & Cung Ứng', description: 'Đàm phán nhà cung cấp quốc tế (AIKO, SAJ, Huawei...), RFQ, hợp đồng PO và theo dõi tiến độ nhập khẩu.', color: '#d97706', icon: 'ShoppingCart', sortOrder: 6 },
    { id: 'dept-wh', code: 'WH', name: 'Phòng Kho & Logistics', description: 'Quản lý hệ thống 5 kho bãi 3 miền (Hà Nội, Đà Nẵng, TP.HCM, Vũng Tàu), tồn kho SKU và giao nhận.', color: '#10b981', icon: 'Package', sortOrder: 7 },
    { id: 'dept-mkt', code: 'MKT', name: 'Phòng Marketing & Truyền Thông', description: 'Phát triển thương hiệu Tran Le Electricity, sự kiện năng lượng xanh, SEO và chiến dịch marketing.', color: '#ec4899', icon: 'Megaphone', sortOrder: 8 },
    { id: 'dept-cs', code: 'CS', name: 'Phòng Chăm Sóc Khách Hàng', description: 'Tiếp nhận yêu cầu, hỗ trợ khách hàng sau bán hàng và điều phối hỗ trợ kỹ thuật.', color: '#06b6d4', icon: 'Headphones', sortOrder: 9 },
    { id: 'dept-fin', code: 'FIN', name: 'Phòng Tài Chính – Kế Toán', description: 'Quản trị dòng tiền, kế toán hợp đồng EPC, thanh quyết toán và báo cáo doanh thu tài chính.', color: '#14b8a6', icon: 'DollarSign', sortOrder: 10 },
    { id: 'dept-hr', code: 'HR', name: 'Phòng Hành Chính – Nhân Sự', description: 'Quản trị nguồn nhân lực, tuyển dụng kỹ sư, đào tạo nội bộ và văn hóa doanh nghiệp xanh.', color: '#f43f5e', icon: 'Users', sortOrder: 11 },
    { id: 'dept-it', code: 'IT', name: 'Phòng IT & Chuyển Đổi Số', description: 'Hạ tầng số, nền tảng giám sát IoT Solar eSolar/FusionSolar và hệ thống phần mềm nội bộ.', color: '#6366f1', icon: 'Server', sortOrder: 12 },
    { id: 'dept-legal', code: 'LEGAL', name: 'Phòng Pháp Chế & Hợp Đồng', description: 'Thẩm định pháp lý, hợp đồng EPC, thỏa thuận đấu nối điện lực và hồ sơ thầu.', color: '#64748b', icon: 'Scale', sortOrder: 13 },
  ];

  for (const d of TRANLE_DEPTS) {
    const existing = await db.get('SELECT id FROM departments WHERE id = ? OR name = ? OR code = ?', [d.id, d.name, d.code]);
    if (!existing) {
      await db.run(
        'INSERT INTO departments (id, code, name, description, color, icon, sortOrder, isActive, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)',
        [d.id, d.code, d.name, d.description, d.color, d.icon, d.sortOrder, now]
      );
    } else {
      await db.run(
        'UPDATE departments SET code = ?, description = ?, color = ?, icon = ?, sortOrder = ?, isActive = 1, updatedAt = ? WHERE id = ?',
        [d.code, d.description, d.color, d.icon, d.sortOrder, now, existing.id]
      );
    }
  }

  // ── 4. Teams (Specialized Teams per Department) ───────────────────────────
  const TRANLE_TEAMS = [
    { id: 'team-sales-b2b', departmentId: 'dept-sales', code: 'B2B', name: 'Nhóm Kinh Doanh B2B & Công Nghiệp', description: 'Tư vấn giải pháp điện mặt trời áp mái nhà máy, KCN và dự án thương mại.', color: '#f59e0b' },
    { id: 'team-sales-dist', departmentId: 'dept-sales', code: 'DIST', name: 'Nhóm Phân Phối Thiết Bị & Đại Lý', description: 'Phân phối chính hãng tấm pin AIKO, biến tần SAJ/Huawei và pin Dyness cho mạng lưới đại lý.', color: '#f97316' },
    { id: 'team-sales-resi', departmentId: 'dept-sales', code: 'RESI', name: 'Nhóm Điện Mặt Trời Dân Dụng', description: 'Tư vấn hệ thống On-grid & Hybrid cho hộ gia đình và biệt thự.', color: '#fbbf24' },
    { id: 'team-eng-solar', departmentId: 'dept-eng', code: 'SOLAR', name: 'Nhóm Thiết Kế Solar & PVSyst', description: 'Mô phỏng 3D, tính toán sản lượng điện PVSyst và lập báo cáo kỹ thuật khả thi.', color: '#8b5cf6' },
    { id: 'team-eng-elec', departmentId: 'dept-eng', code: 'ELEC', name: 'Nhóm Thiết Kế Điện AC/DC & TBA', description: 'Thiết kế tủ điện phân phối, tuyến cáp, trạm biến áp và hệ thống tiếp địa chống sét.', color: '#a855f7' },
    { id: 'team-eng-support', departmentId: 'dept-eng', code: 'SUPPORT', name: 'Nhóm Hỗ Trợ Kỹ Thuật Dự Án', description: 'Giải đáp vướng mắc kỹ thuật hiện trường và đào tạo kỹ thuật đối tác.', color: '#c084fc' },
    { id: 'team-epc-pm', departmentId: 'dept-epc', code: 'PM', name: 'Ban Chỉ Huy & Quản Lý Dự Án', description: 'Điều phối tiến độ tổng thể, quản trị rủi ro và quản lý ngân sách dự án EPC.', color: '#16a34a' },
    { id: 'team-epc-const', departmentId: 'dept-epc', code: 'CONST', name: 'Đội Thi Công Xây Lắp Công Trình', description: 'Trực tiếp lắp đặt khung giàn, tấm pin, đấu nối tủ điện và inverter tại công trường.', color: '#22c55e' },
    { id: 'team-epc-qaqc', departmentId: 'dept-epc', code: 'QAQC', name: 'Nhóm Kiểm Soát Chất Lượng & Nghiệm Thu', description: 'Thử nghiệm cách điện, quét nhiệt hồng ngoại, đo kiểm IV Curve và đóng điện nghiệm thu.', color: '#4ade80' },
    { id: 'team-epc-hse', departmentId: 'dept-epc', code: 'HSE', name: 'Nhóm An Toàn Lao Động & Môi Trường', description: 'Đảm bảo tuyệt đối an toàn thi công trên cao và quy chuẩn PCCC.', color: '#86efac' },
    { id: 'team-om-solar', departmentId: 'dept-om', code: 'OM', name: 'Đội Vận Hành & Bảo Trì 24/7', description: 'Giám sát sản lượng từ xa qua cloud, vệ sinh tấm pin định kỳ và xử lý sự cố.', color: '#0ea5e9' },
    { id: 'team-om-saj', departmentId: 'dept-om', code: 'SAJ_CENTER', name: 'Trung Tâm Bảo Hành Ủy Quyền SAJ', description: 'Tiếp nhận, chẩn đoán lỗi, thay thế linh kiện bo mạch chính hãng SAJ tại Việt Nam.', color: '#38bdf8' },
    { id: 'team-wh-central', departmentId: 'dept-wh', code: 'STOCK', name: 'Bộ Phận Quản Lý Kho 3 Miền', description: 'Kiểm kê xuất nhập tồn, quản lý mã SKU và serial number thiết bị.', color: '#10b981' },
    { id: 'team-wh-logistics', departmentId: 'dept-wh', code: 'LOG', name: 'Bộ Phận Giao Nhận & Vận Chuyển', description: 'Điều phối xe vận tải hàng hóa đến các công trình trên toàn quốc an toàn, đúng hạn.', color: '#34d399' },
    { id: 'team-proc-intl', departmentId: 'dept-proc', code: 'PROC_INTL', name: 'Nhóm Mua Hàng Quốc Tế (AIKO/SAJ)', description: 'Phụ trách đàm phán hợp đồng cung ứng và nhập khẩu thiết bị năng lượng.', color: '#d97706' },
    { id: 'team-mkt-digital', departmentId: 'dept-mkt', code: 'MKT_DIGITAL', name: 'Nhóm Digital Marketing & Media', description: 'Sáng tạo nội dung truyền thông, SEO và phát triển nhận diện thương hiệu xanh.', color: '#ec4899' },
    { id: 'team-cs-service', departmentId: 'dept-cs', code: 'CS_SERVICE', name: 'Nhóm Dịch Vụ Khách Hàng 24/7', description: 'Tiếp nhận yêu cầu, hotline kỹ thuật và khảo sát mức độ hài lòng khách hàng.', color: '#06b6d4' },
    { id: 'team-fin-acc', departmentId: 'dept-fin', code: 'FIN_ACC', name: 'Nhóm Kế Toán Quản Trị & Thuế', description: 'Kế toán dự án EPC, thanh quyết toán và quản lý dòng tiền doanh nghiệp.', color: '#059669' },
    { id: 'team-hr-talent', departmentId: 'dept-hr', code: 'HR_TALENT', name: 'Nhóm Tuyển Dụng & Phát Triển Nhân Tài', description: 'Tuyển dụng kỹ sư, đào tạo chuyên môn và chăm lo chế độ phúc lợi.', color: '#f43f5e' },
    { id: 'team-it-digital', departmentId: 'dept-it', code: 'IT_DIGITAL', name: 'Nhóm Chuyển Đổi Số & Ứng Dụng', description: 'Phát triển nền tảng TranLe Tasks, quản trị hệ thống IoT và máy chủ.', color: '#6366f1' },
    { id: 'team-legal-corp', departmentId: 'dept-legal', code: 'LEGAL_CORP', name: 'Nhóm Pháp Lý & Quản Trị Hợp Đồng', description: 'Rà soát hợp đồng EPC trọn gói, thủ tục đấu nối EVN và thẩm định pháp lý.', color: '#64748b' },
  ];

  for (const t of TRANLE_TEAMS) {
    const existing = await db.get('SELECT id FROM teams WHERE id = ? OR code = ?', [t.id, t.code]);
    if (!existing) {
      await db.run(
        'INSERT INTO teams (id, departmentId, code, name, description, color, isActive, createdAt) VALUES (?, ?, ?, ?, ?, ?, 1, ?)',
        [t.id, t.departmentId, t.code, t.name, t.description, t.color, now]
      );
    } else {
      await db.run(
        'UPDATE teams SET departmentId = ?, name = ?, description = ?, color = ?, isActive = 1, updatedAt = ? WHERE id = ?',
        [t.departmentId, t.name, t.description, t.color, now, existing.id]
      );
    }
  }

  // ── 5. Positions (Standard Organizational Job Titles) ──────────────────────
  const TRANLE_POSITIONS = [
    { id: 'pos-general-deputy', departmentId: null, teamId: null, code: 'PHO_PHONG', name: 'Phó Phòng', description: 'Phó Trưởng phòng phụ trách chuyên môn, hỗ trợ điều hành và quản lý hoạt động phòng ban.', level: 3, isManager: 1 },
    { id: 'pos-exec-dir', departmentId: 'dept-exec', teamId: null, code: 'DIR', name: 'Tổng Giám Đốc / Thành Viên HĐQT', description: 'Lãnh đạo toàn diện hoạt động sản xuất kinh doanh công ty.', level: 5, isManager: 1 },
    { id: 'pos-exec-deputy', departmentId: 'dept-exec', teamId: null, code: 'DEP_DIR', name: 'Phó Tổng Giám Đốc', description: 'Hỗ trợ Tổng Giám Đốc chỉ đạo chuyên môn kỹ thuật hoặc kinh doanh.', level: 5, isManager: 1 },
    { id: 'pos-sales-mgr', departmentId: 'dept-sales', teamId: null, code: 'SALES_MGR', name: 'Trưởng Phòng Kinh Doanh', description: 'Quản trị mục tiêu doanh số và phát triển thị trường năng lượng tái tạo.', level: 4, isManager: 1 },
    { id: 'pos-sales-deputy', departmentId: 'dept-sales', teamId: 'team-sales-dist', code: 'SALES_DEP', name: 'Phó Phòng Kinh Doanh & Phân Phối', description: 'Phụ trách kênh phân phối đại lý thiết bị solar AIKO/SAJ.', level: 3, isManager: 1 },
    { id: 'pos-sales-lead', departmentId: 'dept-sales', teamId: 'team-sales-b2b', code: 'SALES_LEAD', name: 'Trưởng Nhóm Kinh Doanh B2B', description: 'Chỉ đạo nhóm B2B phát triển dự án công nghiệp.', level: 3, isManager: 1 },
    { id: 'pos-sales-exec', departmentId: 'dept-sales', teamId: 'team-sales-b2b', code: 'SALES_EXEC', name: 'Chuyên Viên Kinh Doanh Năng Lượng', description: 'Tìm kiếm khách hàng, tư vấn giải pháp và xúc tiến hợp đồng.', level: 2, isManager: 0 },
    { id: 'pos-eng-mgr', departmentId: 'dept-eng', teamId: null, code: 'ENG_MGR', name: 'Trưởng Phòng Kỹ Thuật Solar', description: 'Chịu trách nhiệm toàn diện về giải pháp kỹ thuật, thiết kế và tối ưu hệ thống.', level: 4, isManager: 1 },
    { id: 'pos-eng-deputy', departmentId: 'dept-eng', teamId: 'team-eng-elec', code: 'ENG_DEP', name: 'Phó Phòng Kỹ Thuật & Thiết Kế Điện', description: 'Phụ trách thiết kế điện AC/DC, trạm biến áp và bảo vệ relay.', level: 3, isManager: 1 },
    { id: 'pos-eng-solar', departmentId: 'dept-eng', teamId: 'team-eng-solar', code: 'ENG_SOLAR', name: 'Kỹ Sư Thiết Kế Hệ Thống Solar & PVSyst', description: 'Thiết kế bố trí tấm pin, chuỗi string, inverter và mô phỏng sản lượng.', level: 2, isManager: 0 },
    { id: 'pos-eng-elec', departmentId: 'dept-eng', teamId: 'team-eng-elec', code: 'ENG_ELEC', name: 'Kỹ Sư Điện AC/DC & Trạm Biến Áp', description: 'Thiết kế sơ đồ nguyên lý 1 sợi, tủ điện AC/DC và trạm biến áp.', level: 2, isManager: 0 },
    { id: 'pos-epc-mgr', departmentId: 'dept-epc', teamId: null, code: 'EPC_MGR', name: 'Giám Đốc Khối Tổng Thầu EPC', description: 'Quản lý toàn bộ quá trình thi công xây lắp các công trình điện mặt trời.', level: 4, isManager: 1 },
    { id: 'pos-epc-deputy', departmentId: 'dept-epc', teamId: 'team-epc-pm', code: 'EPC_DEP', name: 'Phó Khối EPC / Chỉ Huy Phó Hiện Trường', description: 'Điều hành thi công hiện trường và an toàn thi công.', level: 3, isManager: 1 },
    { id: 'pos-epc-pm', departmentId: 'dept-epc', teamId: 'team-epc-pm', code: 'EPC_PM', name: 'Chỉ Huy Trưởng Công Trình / Quản Lý Dự Án', description: 'Chỉ huy công trường, điều phối nhà thầu phụ và quản lý tiến độ thi công.', level: 3, isManager: 1 },
    { id: 'pos-epc-qaqc', departmentId: 'dept-epc', teamId: 'team-epc-qaqc', code: 'EPC_QAQC', name: 'Kỹ Sư Giám Sát & QA/QC', description: 'Kiểm soát chất lượng vật tư, lắp đặt và lập hồ sơ nghiệm thu.', level: 2, isManager: 0 },
    { id: 'pos-epc-hse', departmentId: 'dept-epc', teamId: 'team-epc-hse', code: 'EPC_HSE', name: 'Cán Bộ An Toàn Lao Động & Môi Trường HSE', description: 'Đảm bảo quy chuẩn an toàn lao động và PCCC công trình.', level: 2, isManager: 0 },
    { id: 'pos-om-mgr', departmentId: 'dept-om', teamId: null, code: 'OM_MGR', name: 'Trưởng Trung Tâm Dịch Vụ & Bảo Hành SAJ', description: 'Điều hành trung tâm dịch vụ O&M và Trung tâm Bảo hành SAJ tại Việt Nam.', level: 4, isManager: 1 },
    { id: 'pos-om-deputy', departmentId: 'dept-om', teamId: 'team-om-solar', code: 'OM_DEP', name: 'Phó Phòng Vận Hành & Bảo Dưỡng O&M', description: 'Lên lịch bảo trì định kỳ, điều phối kỹ sư quét nhiệt và vệ sinh tấm pin.', level: 3, isManager: 1 },
    { id: 'pos-om-saj', departmentId: 'dept-om', teamId: 'team-om-saj', code: 'OM_SAJ', name: 'Kỹ Sư Trưởng Ủy Quyền SAJ Service Center', description: 'Chẩn đoán lỗi biến tần, thay thế bo mạch chính hãng SAJ.', level: 2, isManager: 0 },
    { id: 'pos-proc-mgr', departmentId: 'dept-proc', teamId: null, code: 'PROC_MGR', name: 'Trưởng Phòng Mua Hàng & Cung Ứng', description: 'Quản lý chuỗi cung ứng thiết bị solar và hợp đồng xuất nhập khẩu.', level: 4, isManager: 1 },
    { id: 'pos-proc-deputy', departmentId: 'dept-proc', teamId: 'team-proc-intl', code: 'PROC_DEP', name: 'Phó Phòng Mua Hàng Quốc Tế', description: 'Phụ trách thương thảo giá và đàm phán hợp đồng cung ứng quốc tế.', level: 3, isManager: 1 },
    { id: 'pos-wh-mgr', departmentId: 'dept-wh', teamId: null, code: 'WH_MGR', name: 'Trưởng Phòng Kho & Logistics', description: 'Chịu trách nhiệm an toàn kho hàng, kiểm kê và giao nhận thiết bị.', level: 4, isManager: 1 },
    { id: 'pos-wh-deputy', departmentId: 'dept-wh', teamId: 'team-wh-logistics', code: 'WH_DEP', name: 'Phó Phòng Điều Phối Giao Nhận & Vận Tải', description: 'Quản lý lịch trình xe tải và logistics 3 miền.', level: 3, isManager: 1 },
    { id: 'pos-mkt-mgr', departmentId: 'dept-mkt', teamId: null, code: 'MKT_MGR', name: 'Trưởng Phòng Marketing & Truyền Thông', description: 'Hoạch định chiến lược thương hiệu và phát triển kênh số.', level: 4, isManager: 1 },
    { id: 'pos-mkt-deputy', departmentId: 'dept-mkt', teamId: 'team-mkt-digital', code: 'MKT_DEP', name: 'Phó Phòng Digital Marketing', description: 'Quản lý nội dung số, SEO website và sự kiện năng lượng.', level: 3, isManager: 1 },
    { id: 'pos-cs-mgr', departmentId: 'dept-cs', teamId: null, code: 'CS_MGR', name: 'Trưởng Phòng Chăm Sóc Khách Hàng', description: 'Quản trị trải nghiệm khách hàng và dịch vụ sau bán hàng.', level: 4, isManager: 1 },
    { id: 'pos-cs-deputy', departmentId: 'dept-cs', teamId: 'team-cs-service', code: 'CS_DEP', name: 'Phó Phòng Dịch Vụ Khách Hàng', description: 'Giám sát xử lý ticket, khiếu nại và tổng đài CSKH.', level: 3, isManager: 1 },
    { id: 'pos-fin-cfo', departmentId: 'dept-fin', teamId: null, code: 'FIN_CFO', name: 'Kế Toán Trưởng / Giám Đốc Tài Chính', description: 'Quản trị tài chính công ty, kế toán thuế và dòng tiền dự án.', level: 4, isManager: 1 },
    { id: 'pos-fin-deputy', departmentId: 'dept-fin', teamId: 'team-fin-acc', code: 'FIN_DEP', name: 'Phó Phòng Kế Toán Tổng Hợp', description: 'Kiểm soát sổ sách kế toán, hóa đơn và báo cáo tài chính định kỳ.', level: 3, isManager: 1 },
    { id: 'pos-hr-mgr', departmentId: 'dept-hr', teamId: null, code: 'HR_MGR', name: 'Trưởng Phòng Hành Chính – Nhân Sự', description: 'Hoạch định nhân lực, tuyển dụng, đào tạo và quản trị hành chính.', level: 4, isManager: 1 },
    { id: 'pos-hr-deputy', departmentId: 'dept-hr', teamId: 'team-hr-talent', code: 'HR_DEP', name: 'Phó Phòng Tuyển Dụng & Đào Tạo', description: 'Tuyển dụng nhân sự chuyên môn và đào tạo văn hóa doanh nghiệp.', level: 3, isManager: 1 },
    { id: 'pos-it-mgr', departmentId: 'dept-it', teamId: null, code: 'IT_MGR', name: 'Trưởng Phòng IT & Chuyển Đổi Số', description: 'Quản trị hệ thống máy chủ, ứng dụng web và hạ tầng công nghệ thông tin.', level: 4, isManager: 1 },
    { id: 'pos-it-deputy', departmentId: 'dept-it', teamId: 'team-it-digital', code: 'IT_DEP', name: 'Phó Phòng Hệ Thống & Hạ Tầng Mạng', description: 'Quản trị hệ thống mạng nội bộ, máy chủ và an toàn thông tin.', level: 3, isManager: 1 },
    { id: 'pos-legal-mgr', departmentId: 'dept-legal', teamId: null, code: 'LEGAL_MGR', name: 'Trưởng Phòng Pháp Chế & Hợp Đồng', description: 'Rà soát tính pháp lý hợp đồng EPC, thỏa thuận đối tác và thủ tục đấu nối.', level: 4, isManager: 1 },
    { id: 'pos-legal-deputy', departmentId: 'dept-legal', teamId: 'team-legal-corp', code: 'LEGAL_DEP', name: 'Phó Phòng Quản Trị Hợp Đồng EPC', description: 'Thẩm định hồ sơ thầu và hợp đồng mua sắm thiết bị.', level: 3, isManager: 1 },
  ];

  for (const p of TRANLE_POSITIONS) {
    const existing = await db.get('SELECT id FROM positions WHERE id = ? OR code = ?', [p.id, p.code]);
    if (!existing) {
      await db.run(
        'INSERT INTO positions (id, departmentId, teamId, code, name, description, level, isManager, isActive, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)',
        [p.id, p.departmentId, p.teamId, p.code, p.name, p.description, p.level, p.isManager, now]
      );
    } else {
      await db.run(
        'UPDATE positions SET departmentId = ?, teamId = ?, name = ?, description = ?, level = ?, isManager = ?, isActive = 1 WHERE id = ?',
        [p.departmentId, p.teamId, p.name, p.description, p.level, p.isManager, existing.id]
      );
    }
  }

  // ── 6. Users: 5-7 Personnel per Department (13 Departments) ─────────────────
  const adminPwd = process.env.ADMIN_DEFAULT_PASSWORD || 'TranLe@dmin2026!';
  const hashedPassword = await bcrypt.hash(adminPwd, 10);

  const INITIAL_USERS = [
    // 1. BAN GIÁM ĐỐC (dept-exec)
    { id: 'u4', name: 'Nguyễn Văn Duy', email: 'vanduy@tranlecorp.com.vn', role: 'Director', department: 'Ban Giám Đốc', departmentId: 'dept-exec', teamId: null, positionId: 'pos-exec-dir', managerId: null, avatar: 'https://i.pravatar.cc/150?u=u4', phone: '0939792428', dob: '1980-02-20', hometown: 'Đà Nẵng', bio: 'Tổng Giám Đốc Công ty Cổ phần Tư vấn xây dựng Điện Trần Lê.' },
    { id: 'u-exec-01', name: 'Trần Đình Khôi', email: 'dinhkhoi@tranlecorp.com.vn', role: 'Director', department: 'Ban Giám Đốc', departmentId: 'dept-exec', teamId: null, positionId: 'pos-exec-deputy', managerId: 'u4', avatar: 'https://i.pravatar.cc/150?u=exec1', phone: '0912345601', dob: '1982-05-12', hometown: 'Hà Nội', bio: 'Phó Tổng Giám Đốc Kỹ Thuật & Giải Pháp Công Nghệ Solar.' },
    { id: 'u-exec-02', name: 'Lê Thị Mai Hương', email: 'maihuong@tranlecorp.com.vn', role: 'Director', department: 'Ban Giám Đốc', departmentId: 'dept-exec', teamId: null, positionId: 'pos-exec-deputy', managerId: 'u4', avatar: 'https://i.pravatar.cc/150?u=exec2', phone: '0912345602', dob: '1984-08-25', hometown: 'TP.HCM', bio: 'Phó Tổng Giám Đốc Kinh Doanh & Quan Hệ Đối Tác Chiến Lược.' },
    { id: 'u1', name: 'Admin Tran Le', email: 'admin@tranlecorp.com.vn', role: 'Admin', department: 'Ban Giám Đốc', departmentId: 'dept-exec', teamId: null, positionId: 'pos-exec-dir', managerId: 'u4', avatar: 'https://i.pravatar.cc/150?u=u1', phone: '0939792428', dob: '1990-01-01', hometown: 'Đà Nẵng', bio: 'Quản trị viên cấp cao hệ thống Tran Le Electricity.' },
    { id: 'u-exec-03', name: 'Đỗ Hoàng Nam', email: 'hoangnam@tranlecorp.com.vn', role: 'Employee', department: 'Ban Giám Đốc', departmentId: 'dept-exec', teamId: null, positionId: 'pos-exec-dir', managerId: 'u4', avatar: 'https://i.pravatar.cc/150?u=exec3', phone: '0912345603', dob: '1992-11-18', hometown: 'Đà Nẵng', bio: 'Thư ký Hội đồng Quản trị & Điều phối Ban Điều hành.' },
    { id: 'u-exec-04', name: 'Vũ Bích Ngọc', email: 'bichngoc@tranlecorp.com.vn', role: 'Employee', department: 'Ban Giám Đốc', departmentId: 'dept-exec', teamId: null, positionId: 'pos-exec-dir', managerId: 'u4', avatar: 'https://i.pravatar.cc/150?u=exec4', phone: '0912345604', dob: '1995-03-30', hometown: 'Quảng Nam', bio: 'Chuyên viên Quản trị Chiến lược & Rủi ro Doanh nghiệp.' },

    // 2. PHÒNG KINH DOANH (dept-sales)
    { id: 'u-sales-01', name: 'Trịnh Văn Hùng', email: 'vanhung.sales@tranlecorp.com.vn', role: 'Manager', department: 'Phòng Kinh Doanh', departmentId: 'dept-sales', teamId: 'team-sales-b2b', positionId: 'pos-sales-mgr', managerId: 'u-exec-02', avatar: 'https://i.pravatar.cc/150?u=sales1', phone: '0913456701', dob: '1986-04-10', hometown: 'Nghệ An', bio: 'Trưởng Phòng Kinh Doanh - Quản lý mục tiêu doanh số toàn quốc.' },
    { id: 'u-sales-02', name: 'Đặng Quốc Bảo', email: 'quocbao.sales@tranlecorp.com.vn', role: 'Manager', department: 'Phòng Kinh Doanh', departmentId: 'dept-sales', teamId: 'team-sales-dist', positionId: 'pos-sales-deputy', managerId: 'u-sales-01', avatar: 'https://i.pravatar.cc/150?u=sales2', phone: '0913456702', dob: '1988-09-14', hometown: 'Đà Nẵng', bio: 'Phó Phòng Kinh Doanh phụ trách Kênh Phân phối thiết bị AIKO & SAJ.' },
    { id: 'u-sales-03', name: 'Hoàng Minh Tuấn', email: 'minhtuan.sales@tranlecorp.com.vn', role: 'Employee', department: 'Phòng Kinh Doanh', departmentId: 'dept-sales', teamId: 'team-sales-b2b', positionId: 'pos-sales-exec', managerId: 'u-sales-01', avatar: 'https://i.pravatar.cc/150?u=sales3', phone: '0913456703', dob: '1993-01-22', hometown: 'Hà Tĩnh', bio: 'Chuyên viên Kinh doanh B2B phụ trách Dự án Điện mặt trời Nhà xưởng KCN.' },
    { id: 'u-sales-04', name: 'Nguyễn Thùy Linh', email: 'thuylinh.sales@tranlecorp.com.vn', role: 'Employee', department: 'Phòng Kinh Doanh', departmentId: 'dept-sales', teamId: 'team-sales-dist', positionId: 'pos-sales-exec', managerId: 'u-sales-02', avatar: 'https://i.pravatar.cc/150?u=sales4', phone: '0913456704', dob: '1996-07-08', hometown: 'TP.HCM', bio: 'Chuyên viên Phát triển mạng lưới đại lý Inverter SAJ & Pin AIKO Miền Nam.' },
    { id: 'u-sales-05', name: 'Phạm Quang Huy', email: 'quanghuy.sales@tranlecorp.com.vn', role: 'Employee', department: 'Phòng Kinh Doanh', departmentId: 'dept-sales', teamId: 'team-sales-resi', positionId: 'pos-sales-exec', managerId: 'u-sales-01', avatar: 'https://i.pravatar.cc/150?u=sales5', phone: '0913456705', dob: '1997-12-05', hometown: 'Quảng Ngãi', bio: 'Chuyên viên Tư vấn Hệ thống Điện mặt trời Dân dụng & Hybrid Biệt thự.' },
    { id: 'u-sales-06', name: 'Bùi Thu Hà', email: 'thuha.sales@tranlecorp.com.vn', role: 'Employee', department: 'Phòng Kinh Doanh', departmentId: 'dept-sales', teamId: 'team-sales-dist', positionId: 'pos-sales-exec', managerId: 'u-sales-02', avatar: 'https://i.pravatar.cc/150?u=sales6', phone: '0913456706', dob: '1998-06-19', hometown: 'Đà Nẵng', bio: 'Chuyên viên Kinh doanh Phân phối khu vực Miền Trung & Tây Nguyên.' },

    // 3. PHÒNG KỸ THUẬT SOLAR (dept-eng)
    { id: 'u-eng-01', name: 'Võ Thành Long', email: 'thanhlong@tranlecorp.com.vn', role: 'Manager', department: 'Phòng Kỹ Thuật Solar', departmentId: 'dept-eng', teamId: 'team-eng-solar', positionId: 'pos-eng-mgr', managerId: 'u-exec-01', avatar: 'https://i.pravatar.cc/150?u=eng1', phone: '0914567801', dob: '1985-03-15', hometown: 'Thừa Thiên Huế', bio: 'Trưởng Phòng Kỹ Thuật Solar - Chuyên gia giải pháp kỹ thuật & mô phỏng PVSyst.' },
    { id: 'u-eng-02', name: 'Lâm Quốc Trọng', email: 'quoctrong@tranlecorp.com.vn', role: 'Manager', department: 'Phòng Kỹ Thuật Solar', departmentId: 'dept-eng', teamId: 'team-eng-elec', positionId: 'pos-eng-deputy', managerId: 'u-eng-01', avatar: 'https://i.pravatar.cc/150?u=eng2', phone: '0914567802', dob: '1987-10-20', hometown: 'Đà Nẵng', bio: 'Phó Phòng Kỹ Thuật phụ trách Thiết kế Tủ điện AC/DC, Trạm Biến Áp & Scada.' },
    { id: 'u3', name: 'Phan Xuân Mạnh', email: 'xuanmanh@tranlecorp.com.vn', role: 'Employee', department: 'Phòng Kỹ Thuật Solar', departmentId: 'dept-eng', teamId: 'team-eng-solar', positionId: 'pos-eng-solar', managerId: 'u-eng-01', avatar: 'https://i.pravatar.cc/150?u=u3', phone: '0123456789', dob: '2002-09-07', hometown: 'Đà Nẵng', bio: 'Kỹ sư Thiết kế PVSyst 3D & Giải pháp Năng lượng tái tạo.' },
    { id: 'u-eng-03', name: 'Trần Đức Anh', email: 'ducanh.eng@tranlecorp.com.vn', role: 'Employee', department: 'Phòng Kỹ Thuật Solar', departmentId: 'dept-eng', teamId: 'team-eng-elec', positionId: 'pos-eng-elec', managerId: 'u-eng-02', avatar: 'https://i.pravatar.cc/150?u=eng3', phone: '0914567803', dob: '1994-08-11', hometown: 'Quảng Nam', bio: 'Kỹ sư Thiết kế Hệ thống Điện AC/DC, Tiếp địa và Chống sét lan truyền.' },
    { id: 'u-eng-04', name: 'Đỗ Minh Trí', email: 'minhtri.eng@tranlecorp.com.vn', role: 'Employee', department: 'Phòng Kỹ Thuật Solar', departmentId: 'dept-eng', teamId: 'team-eng-solar', positionId: 'pos-eng-solar', managerId: 'u-eng-01', avatar: 'https://i.pravatar.cc/150?u=eng4', phone: '0914567804', dob: '1996-02-28', hometown: 'Bình Định', bio: 'Kỹ sư Bóc tách Khối lượng BOM/BOQ và Tính toán hiệu suất hệ thống.' },
    { id: 'u-eng-05', name: 'Ngô Văn Hiếu', email: 'vanhieu.eng@tranlecorp.com.vn', role: 'Employee', department: 'Phòng Kỹ Thuật Solar', departmentId: 'dept-eng', teamId: 'team-eng-solar', positionId: 'pos-eng-solar', managerId: 'u-eng-01', avatar: 'https://i.pravatar.cc/150?u=eng5', phone: '0914567805', dob: '1998-11-04', hometown: 'Đà Nẵng', bio: 'Kỹ sư Khảo sát Hiện trường, Đo đạc Kết cấu mái và Phân tích phụ tải điện.' },

    // 4. KHỐI TỔNG THẦU EPC & THI CÔNG (dept-epc)
    { id: 'u2', name: 'Nguyễn Văn Đạt', email: 'vandat@tranlecorp.com.vn', role: 'Manager', department: 'Khối Tổng Thầu EPC & Thi Công', departmentId: 'dept-epc', teamId: 'team-epc-pm', positionId: 'pos-epc-mgr', managerId: 'u-exec-01', avatar: 'https://i.pravatar.cc/150?u=u2', phone: '0987654321', dob: '1985-06-15', hometown: 'Đà Nẵng', bio: 'Giám Đốc Khối Tổng Thầu EPC - Chỉ huy trưởng các đại dự án Solar.' },
    { id: 'u-epc-01', name: 'Lê Hoàng Sơn', email: 'hoangson.epc@tranlecorp.com.vn', role: 'Manager', department: 'Khối Tổng Thầu EPC & Thi Công', departmentId: 'dept-epc', teamId: 'team-epc-pm', positionId: 'pos-epc-deputy', managerId: 'u2', avatar: 'https://i.pravatar.cc/150?u=epc1', phone: '0915678901', dob: '1987-04-18', hometown: 'Quảng Trị', bio: 'Phó Khối EPC - Chỉ huy phó hiện trường thi công và điều phối nhà thầu phụ.' },
    { id: 'u-epc-02', name: 'Trương Quốc Cường', email: 'quoccuong.epc@tranlecorp.com.vn', role: 'Employee', department: 'Khối Tổng Thầu EPC & Thi Công', departmentId: 'dept-epc', teamId: 'team-epc-qaqc', positionId: 'pos-epc-qaqc', managerId: 'u2', avatar: 'https://i.pravatar.cc/150?u=epc2', phone: '0915678902', dob: '1991-09-25', hometown: 'Đà Nẵng', bio: 'Kỹ Sư Trưởng QA/QC - Kiểm soát chất lượng vật tư, đo Megger và nghiệm thu đóng điện.' },
    { id: 'u-epc-03', name: 'Đoàn Ngọc Hải', email: 'ngochai.hse@tranlecorp.com.vn', role: 'Employee', department: 'Khối Tổng Thầu EPC & Thi Công', departmentId: 'dept-epc', teamId: 'team-epc-hse', positionId: 'pos-epc-hse', managerId: 'u2', avatar: 'https://i.pravatar.cc/150?u=epc3', phone: '0915678903', dob: '1993-07-14', hometown: 'Quảng Nam', bio: 'Cán Bộ An Toàn Lao Động HSE - Đảm bảo tuyệt đối an toàn thi công trên cao và PCCC.' },
    { id: 'u-epc-04', name: 'Vũ Đình Trọng', email: 'dinhtrong.epc@tranlecorp.com.vn', role: 'Employee', department: 'Khối Tổng Thầu EPC & Thi Công', departmentId: 'dept-epc', teamId: 'team-epc-const', positionId: 'pos-epc-pm', managerId: 'u-epc-01', avatar: 'https://i.pravatar.cc/150?u=epc4', phone: '0915678904', dob: '1995-12-02', hometown: 'Hà Tĩnh', bio: 'Kỹ sư Giám sát Thi công Điện, Đấu nối chuỗi string và Tủ điện Inverter.' },
    { id: 'u-epc-05', name: 'Nguyễn Thành Nam', email: 'thanhnam.epc@tranlecorp.com.vn', role: 'Employee', department: 'Khối Tổng Thầu EPC & Thi Công', departmentId: 'dept-epc', teamId: 'team-epc-const', positionId: 'pos-epc-pm', managerId: 'u-epc-01', avatar: 'https://i.pravatar.cc/150?u=epc5', phone: '0915678905', dob: '1997-05-20', hometown: 'Đà Nẵng', bio: 'Kỹ sư Thi công Cơ khí Giàn khung nhôm & Lắp đặt Module Tấm pin Solar.' },

    // 5. TRUNG TÂM DỊCH VỤ & BẢO HÀNH O&M SAJ CENTER (dept-om)
    { id: 'u-om-01', name: 'Bùi Anh Tuấn', email: 'anhtuan.om@tranlecorp.com.vn', role: 'Manager', department: 'Trung Tâm Dịch Vụ & Bảo Hành O&M SAJ Center', departmentId: 'dept-om', teamId: 'team-om-saj', positionId: 'pos-om-mgr', managerId: 'u-exec-01', avatar: 'https://i.pravatar.cc/150?u=om1', phone: '0916789001', dob: '1986-01-20', hometown: 'TP.HCM', bio: 'Trưởng Trung Tâm O&M & Bảo Hành Ủy Quyền SAJ Center tại Việt Nam.' },
    { id: 'u-om-02', name: 'Mai Đức Thắng', email: 'ducthang.om@tranlecorp.com.vn', role: 'Manager', department: 'Trung Tâm Dịch Vụ & Bảo Hành O&M SAJ Center', departmentId: 'dept-om', teamId: 'team-om-solar', positionId: 'pos-om-deputy', managerId: 'u-om-01', avatar: 'https://i.pravatar.cc/150?u=om2', phone: '0916789002', dob: '1989-08-16', hometown: 'Đà Nẵng', bio: 'Phó Phòng Vận Hành & Bảo Dưỡng O&M - Giám sát sản lượng hệ thống điện mặt trời.' },
    { id: 'u-om-03', name: 'Đinh Quang Vinh', email: 'quangvinh.saj@tranlecorp.com.vn', role: 'Employee', department: 'Trung Tâm Dịch Vụ & Bảo Hành O&M SAJ Center', departmentId: 'dept-om', teamId: 'team-om-saj', positionId: 'pos-om-saj', managerId: 'u-om-01', avatar: 'https://i.pravatar.cc/150?u=om3', phone: '0916789003', dob: '1992-04-12', hometown: 'Bình Định', bio: 'Kỹ Sư Trưởng Ủy Quyền SAJ Center - Chuyên gia chẩn đoán và sửa chữa Inverter SAJ.' },
    { id: 'u-om-04', name: 'Nguyễn Thế Bảo', email: 'thebao.om@tranlecorp.com.vn', role: 'Employee', department: 'Trung Tâm Dịch Vụ & Bảo Hành O&M SAJ Center', departmentId: 'dept-om', teamId: 'team-om-solar', positionId: 'pos-om-saj', managerId: 'u-om-02', avatar: 'https://i.pravatar.cc/150?u=om4', phone: '0916789004', dob: '1994-10-30', hometown: 'Quảng Ngãi', bio: 'Kỹ sư O&M - Chuyên viên Quét nhiệt hồng ngoại FLIR và Vệ sinh tấm pin robot.' },
    { id: 'u-om-05', name: 'Trần Hải Đăng', email: 'haidang.saj@tranlecorp.com.vn', role: 'Employee', department: 'Trung Tâm Dịch Vụ & Bảo Hành O&M SAJ Center', departmentId: 'dept-om', teamId: 'team-om-saj', positionId: 'pos-om-saj', managerId: 'u-om-03', avatar: 'https://i.pravatar.cc/150?u=om5', phone: '0916789005', dob: '1996-03-18', hometown: 'Đà Nẵng', bio: 'Kỹ thuật viên Sửa chữa Bo mạch Công suất IGBT và Bo điều khiển CPU Inverter.' },
    { id: 'u-om-06', name: 'Dương Quốc Việt', email: 'quocviet.om@tranlecorp.com.vn', role: 'Employee', department: 'Trung Tâm Dịch Vụ & Bảo Hành O&M SAJ Center', departmentId: 'dept-om', teamId: 'team-om-solar', positionId: 'pos-om-saj', managerId: 'u-om-02', avatar: 'https://i.pravatar.cc/150?u=om6', phone: '0916789006', dob: '1998-07-24', hometown: 'Khánh Hòa', bio: 'Kỹ sư Giám sát Vận hành SCADA & Nền tảng IoT eSolar Air 24/7.' },

    // 6. PHÒNG MUA HÀNG & CUNG ỨNG (dept-proc)
    { id: 'u-proc-01', name: 'Chu Thị Thanh Tâm', email: 'thanhtam.proc@tranlecorp.com.vn', role: 'Manager', department: 'Phòng Mua Hàng & Cung Ứng', departmentId: 'dept-proc', teamId: 'team-proc-intl', positionId: 'pos-proc-mgr', managerId: 'u4', avatar: 'https://i.pravatar.cc/150?u=proc1', phone: '0917890101', dob: '1987-06-11', hometown: 'Hà Nội', bio: 'Trưởng Phòng Mua Hàng & Cung Ứng - Quản trị quan hệ chuỗi cung ứng toàn cầu.' },
    { id: 'u-proc-02', name: 'Nguyễn Đức Huy', email: 'duchuy.proc@tranlecorp.com.vn', role: 'Manager', department: 'Phòng Mua Hàng & Cung Ứng', departmentId: 'dept-proc', teamId: 'team-proc-intl', positionId: 'pos-proc-deputy', managerId: 'u-proc-01', avatar: 'https://i.pravatar.cc/150?u=proc2', phone: '0917890102', dob: '1989-11-23', hometown: 'Đà Nẵng', bio: 'Phó Phòng Mua Hàng Quốc Tế - Phụ trách nhập khẩu thiết bị AIKO & SAJ.' },
    { id: 'u-proc-03', name: 'Vũ Phương Thảo', email: 'phuongthao.proc@tranlecorp.com.vn', role: 'Employee', department: 'Phòng Mua Hàng & Cung 3', departmentId: 'dept-proc', teamId: 'team-proc-intl', positionId: 'pos-proc-mgr', managerId: 'u-proc-01', avatar: 'https://i.pravatar.cc/150?u=proc3', phone: '0917890103', dob: '1993-02-14', hometown: 'Hải Phòng', bio: 'Chuyên viên Mua hàng Tấm pin N-Type ABC và Khung giàn nhôm Solar.' },
    { id: 'u-proc-04', name: 'Tạ Quang Minh', email: 'quangminh.proc@tranlecorp.com.vn', role: 'Employee', department: 'Phòng Mua Hàng & Cung Ứng', departmentId: 'dept-proc', teamId: 'team-proc-intl', positionId: 'pos-proc-mgr', managerId: 'u-proc-02', avatar: 'https://i.pravatar.cc/150?u=proc4', phone: '0917890104', dob: '1995-09-09', hometown: 'Đà Nẵng', bio: 'Chuyên viên Mua hàng Biến tần SAJ, Pin lưu trữ Dyness & Cáp điện DC Solar.' },
    { id: 'u-proc-05', name: 'Lương Bích Trâm', email: 'bichtram.proc@tranlecorp.com.vn', role: 'Employee', department: 'Phòng Mua Hàng & Cung Ứng', departmentId: 'dept-proc', teamId: 'team-proc-intl', positionId: 'pos-proc-mgr', managerId: 'u-proc-01', avatar: 'https://i.pravatar.cc/150?u=proc5', phone: '0917890105', dob: '1997-12-19', hometown: 'Quảng Nam', bio: 'Chuyên viên Đàm phán Hợp đồng Cung ứng và Theo dõi tiến độ giao nhận ETA.' },

    // 7. PHÒNG KHO & LOGISTICS (dept-wh)
    { id: 'u-wh-01', name: 'Đặng Văn Quyền', email: 'vanquyen.wh@tranlecorp.com.vn', role: 'Manager', department: 'Phòng Kho & Logistics', departmentId: 'dept-wh', teamId: 'team-wh-central', positionId: 'pos-wh-mgr', managerId: 'u4', avatar: 'https://i.pravatar.cc/150?u=wh1', phone: '0918901201', dob: '1984-07-07', hometown: 'Thanh Hóa', bio: 'Trưởng Phòng Kho & Logistics - Quản trị hệ thống kho bãi 3 miền Bắc - Trung - Nam.' },
    { id: 'u-wh-02', name: 'Lưu Thế Tài', email: 'thetai.wh@tranlecorp.com.vn', role: 'Manager', department: 'Phòng Kho & Logistics', departmentId: 'dept-wh', teamId: 'team-wh-logistics', positionId: 'pos-wh-deputy', managerId: 'u-wh-01', avatar: 'https://i.pravatar.cc/150?u=wh2', phone: '0918901202', dob: '1988-02-18', hometown: 'Đà Nẵng', bio: 'Phó Phòng phụ trách Điều phối Giao nhận Vận tải Công trình toàn quốc.' },
    { id: 'u-wh-03', name: 'Phan Nhật Linh', email: 'nhatlinh.wh@tranlecorp.com.vn', role: 'Employee', department: 'Phòng Kho & Logistics', departmentId: 'dept-wh', teamId: 'team-wh-central', positionId: 'pos-wh-mgr', managerId: 'u-wh-01', avatar: 'https://i.pravatar.cc/150?u=wh3', phone: '0918901203', dob: '1992-05-30', hometown: 'TP.HCM', bio: 'Thủ kho Tổng TP.HCM - Quản lý nhập xuất tấm pin AIKO và Inverter SAJ.' },
    { id: 'u-wh-04', name: 'Hoàng Bá Hưng', email: 'bahung.wh@tranlecorp.com.vn', role: 'Employee', department: 'Phòng Kho & Logistics', departmentId: 'dept-wh', teamId: 'team-wh-central', positionId: 'pos-wh-mgr', managerId: 'u-wh-01', avatar: 'https://i.pravatar.cc/150?u=wh4', phone: '0918901204', dob: '1994-11-12', hometown: 'Đà Nẵng', bio: 'Thủ kho Chi nhánh Miền Trung - Đà Nẵng phụ trách cấp phát vật tư thi công.' },
    { id: 'u-wh-05', name: 'Nguyễn Cẩm Ly', email: 'camly.wh@tranlecorp.com.vn', role: 'Employee', department: 'Phòng Kho & Logistics', departmentId: 'dept-wh', teamId: 'team-wh-central', positionId: 'pos-wh-mgr', managerId: 'u-wh-01', avatar: 'https://i.pravatar.cc/150?u=wh5', phone: '0918901205', dob: '1996-08-25', hometown: 'Quảng Trị', bio: 'Chuyên viên Quản lý Serial Number, Mã vạch và Kiểm tra chất lượng QC nhập kho.' },
    { id: 'u-wh-06', name: 'Võ Văn Kiệt', email: 'vankiet.wh@tranlecorp.com.vn', role: 'Employee', department: 'Phòng Kho & Logistics', departmentId: 'dept-wh', teamId: 'team-wh-logistics', positionId: 'pos-wh-mgr', managerId: 'u-wh-02', avatar: 'https://i.pravatar.cc/150?u=wh6', phone: '0918901206', dob: '1998-01-15', hometown: 'Quảng Nam', bio: 'Chuyên viên Điều phối Vận tải đường bộ và Giao nhận hàng hóa công trường.' },

    // 8. PHÒNG MARKETING & TRUYỀN THÔNG (dept-mkt)
    { id: 'u-mkt-01', name: 'Trần Quỳnh Nga', email: 'quynhnga.mkt@tranlecorp.com.vn', role: 'Manager', department: 'Phòng Marketing & Truyền Thông', departmentId: 'dept-mkt', teamId: 'team-mkt-digital', positionId: 'pos-mkt-mgr', managerId: 'u-exec-02', avatar: 'https://i.pravatar.cc/150?u=mkt1', phone: '0919012301', dob: '1988-03-24', hometown: 'Hà Nội', bio: 'Trưởng Phòng Marketing & Truyền Thông - Định vị thương hiệu Năng Lượng Trần Lê.' },
    { id: 'u-mkt-02', name: 'Hoàng Việt Hưng', email: 'viethung.mkt@tranlecorp.com.vn', role: 'Manager', department: 'Phòng Marketing & Truyền Thông', departmentId: 'dept-mkt', teamId: 'team-mkt-digital', positionId: 'pos-mkt-deputy', managerId: 'u-mkt-01', avatar: 'https://i.pravatar.cc/150?u=mkt2', phone: '0919012302', dob: '1990-08-15', hometown: 'Đà Nẵng', bio: 'Phó Phòng Digital Marketing - Quản trị hiệu quả quảng cáo và phát triển Lead gen.' },
    { id: 'u-mkt-03', name: 'Đỗ Khánh Linh', email: 'khanhlinh.mkt@tranlecorp.com.vn', role: 'Employee', department: 'Phòng Marketing & Truyền Thông', departmentId: 'dept-mkt', teamId: 'team-mkt-digital', positionId: 'pos-mkt-mgr', managerId: 'u-mkt-01', avatar: 'https://i.pravatar.cc/150?u=mkt3', phone: '0919012303', dob: '1994-06-18', hometown: 'TP.HCM', bio: 'Chuyên viên Sáng tạo Nội dung, Viết bài PR giải pháp Solar và Quản trị SEO.' },
    { id: 'u-mkt-04', name: 'Nguyễn Đình Bảo', email: 'dinhbao.mkt@tranlecorp.com.vn', role: 'Employee', department: 'Phòng Marketing & Truyền Thông', departmentId: 'dept-mkt', teamId: 'team-mkt-digital', positionId: 'pos-mkt-mgr', managerId: 'u-mkt-02', avatar: 'https://i.pravatar.cc/150?u=mkt4', phone: '0919012304', dob: '1996-10-09', hometown: 'Đà Nẵng', bio: 'Chuyên viên Thiết kế Đồ họa, Video Media và Hồ sơ Năng lực Công ty.' },
    { id: 'u-mkt-05', name: 'Lê Thanh Huyền', email: 'thanhhuyen.mkt@tranlecorp.com.vn', role: 'Employee', department: 'Phòng Marketing & Truyền Thông', departmentId: 'dept-mkt', teamId: 'team-mkt-digital', positionId: 'pos-mkt-mgr', managerId: 'u-mkt-01', avatar: 'https://i.pravatar.cc/150?u=mkt5', phone: '0919012305', dob: '1997-04-03', hometown: 'Quảng Nam', bio: 'Chuyên viên Tổ chức Sự kiện, Triển lãm Năng lượng Tái tạo và Hội nghị Khách hàng.' },

    // 9. PHÒNG CHĂM SÓC KHÁCH HÀNG (dept-cs)
    { id: 'u-cs-01', name: 'Nguyễn Diệu Hương', email: 'dieuhuong.cs@tranlecorp.com.vn', role: 'Manager', department: 'Phòng Chăm Sóc Khách Hàng', departmentId: 'dept-cs', teamId: 'team-cs-service', positionId: 'pos-cs-mgr', managerId: 'u-exec-02', avatar: 'https://i.pravatar.cc/150?u=cs1', phone: '0920123401', dob: '1987-12-08', hometown: 'Hà Nội', bio: 'Trưởng Phòng Chăm Sóc Khách Hàng - Chuẩn hóa dịch vụ khách hàng 5 sao.' },
    { id: 'u-cs-02', name: 'Phạm Văn Chung', email: 'vanchung.cs@tranlecorp.com.vn', role: 'Manager', department: 'Phòng Chăm Sóc Khách Hàng', departmentId: 'dept-cs', teamId: 'team-cs-service', positionId: 'pos-cs-deputy', managerId: 'u-cs-01', avatar: 'https://i.pravatar.cc/150?u=cs2', phone: '0920123402', dob: '1990-05-19', hometown: 'Đà Nẵng', bio: 'Phó Phòng Hỗ Trợ Kỹ Thuật Sau Bán Hàng & Giám sát SLA Ticket.' },
    { id: 'u-cs-03', name: 'Hoàng Ngọc Ánh', email: 'ngocanh.cs@tranlecorp.com.vn', role: 'Employee', department: 'Phòng Chăm Sóc Khách Hàng', departmentId: 'dept-cs', teamId: 'team-cs-service', positionId: 'pos-cs-mgr', managerId: 'u-cs-01', avatar: 'https://i.pravatar.cc/150?u=cs3', phone: '0920123403', dob: '1994-09-14', hometown: 'Thừa Thiên Huế', bio: 'Chuyên viên Tiếp nhận Hotline 24/7 và Xử lý Ticket bảo hành Inverter SAJ.' },
    { id: 'u-cs-04', name: 'Lê Mỹ Duyên', email: 'myduyen.cs@tranlecorp.com.vn', role: 'Employee', department: 'Phòng Chăm Sóc Khách Hàng', departmentId: 'dept-cs', teamId: 'team-cs-service', positionId: 'pos-cs-mgr', managerId: 'u-cs-01', avatar: 'https://i.pravatar.cc/150?u=cs4', phone: '0920123404', dob: '1996-01-27', hometown: 'Đà Nẵng', bio: 'Chuyên viên Chăm sóc Khách hàng Dự án Doanh nghiệp và Hợp đồng Bảo trì.' },
    { id: 'u-cs-05', name: 'Vũ Hoài An', email: 'hoaian.cs@tranlecorp.com.vn', role: 'Employee', department: 'Phòng Chăm Sóc Khách Hàng', departmentId: 'dept-cs', teamId: 'team-cs-service', positionId: 'pos-cs-mgr', managerId: 'u-cs-02', avatar: 'https://i.pravatar.cc/150?u=cs5', phone: '0920123405', dob: '1998-08-31', hometown: 'Quảng Nam', bio: 'Chuyên viên Khảo sát Mức độ Hài lòng Khách hàng (CSAT) và Chăm sóc định kỳ.' },

    // 10. PHÒNG TÀI CHÍNH – KẾ TOÁN (dept-fin)
    { id: 'u-fin-01', name: 'Lê Thị Thu Thủy', email: 'thuthuy.fin@tranlecorp.com.vn', role: 'Manager', department: 'Phòng Tài Chính – Kế Toán', departmentId: 'dept-fin', teamId: 'team-fin-acc', positionId: 'pos-fin-cfo', managerId: 'u4', avatar: 'https://i.pravatar.cc/150?u=fin1', phone: '0921234501', dob: '1983-09-02', hometown: 'Hà Nội', bio: 'Kế Toán Trưởng / Giám Đốc Tài Chính - Quản trị nguồn vốn và tài chính EPC.' },
    { id: 'u-fin-02', name: 'Nguyễn Văn Thành', email: 'vanthanh.fin@tranlecorp.com.vn', role: 'Manager', department: 'Phòng Tài Chính – Kế Toán', departmentId: 'dept-fin', teamId: 'team-fin-acc', positionId: 'pos-fin-deputy', managerId: 'u-fin-01', avatar: 'https://i.pravatar.cc/150?u=fin2', phone: '0921234502', dob: '1987-11-15', hometown: 'Đà Nẵng', bio: 'Phó Phòng Kế Toán Tổng Hợp & Thuế Doanh Nghiệp.' },
    { id: 'u-fin-03', name: 'Trịnh Hoài Thu', email: 'hoaithu.fin@tranlecorp.com.vn', role: 'Employee', department: 'Phòng Tài Chính – Kế Toán', departmentId: 'dept-fin', teamId: 'team-fin-acc', positionId: 'pos-fin-cfo', managerId: 'u-fin-01', avatar: 'https://i.pravatar.cc/150?u=fin3', phone: '0921234503', dob: '1991-03-22', hometown: 'Quảng Trị', bio: 'Kế toán Quản trị Chi phí Dự án EPC Điện mặt trời và Nghiệm thu thanh toán.' },
    { id: 'u-fin-04', name: 'Phạm Thảo My', email: 'thaomy.fin@tranlecorp.com.vn', role: 'Employee', department: 'Phòng Tài Chính – Kế Toán', departmentId: 'dept-fin', teamId: 'team-fin-acc', positionId: 'pos-fin-cfo', managerId: 'u-fin-02', avatar: 'https://i.pravatar.cc/150?u=fin4', phone: '0921234504', dob: '1994-07-17', hometown: 'Đà Nẵng', bio: 'Kế toán Công nợ Phải thu (AR) và Quản lý Doanh thu Hợp đồng Phân phối.' },
    { id: 'u-fin-05', name: 'Đặng Đình Long', email: 'dinhlong.fin@tranlecorp.com.vn', role: 'Employee', department: 'Phòng Tài Chính – Kế Toán', departmentId: 'dept-fin', teamId: 'team-fin-acc', positionId: 'pos-fin-cfo', managerId: 'u-fin-02', avatar: 'https://i.pravatar.cc/150?u=fin5', phone: '0921234505', dob: '1995-10-04', hometown: 'Bình Định', bio: 'Kế toán Thanh toán (AP) và Mua hàng Thiết bị Nhập khẩu L/C & T/T.' },
    { id: 'u-fin-06', name: 'Vũ Minh Tâm', email: 'minhtam.fin@tranlecorp.com.vn', role: 'Employee', department: 'Phòng Tài Chính – Kế Toán', departmentId: 'dept-fin', teamId: 'team-fin-acc', positionId: 'pos-fin-cfo', managerId: 'u-fin-01', avatar: 'https://i.pravatar.cc/150?u=fin6', phone: '0921234506', dob: '1997-06-12', hometown: 'Quảng Nam', bio: 'Chuyên viên Kế hoạch Ngân sách, Dòng tiền và Tín dụng Ngân hàng Xanh.' },

    // 11. PHÒNG HÀNH CHÍNH – NHÂN SỰ (dept-hr)
    { id: 'u-hr-01', name: 'Ngô Thị Mai Lan', email: 'mailan.hr@tranlecorp.com.vn', role: 'Manager', department: 'Phòng Hành Chính – Nhân Sự', departmentId: 'dept-hr', teamId: 'team-hr-talent', positionId: 'pos-hr-mgr', managerId: 'u4', avatar: 'https://i.pravatar.cc/150?u=hr1', phone: '0922345601', dob: '1985-08-30', hometown: 'Hà Nội', bio: 'Trưởng Phòng Hành Chính – Nhân Sự - Hoạch định tổ chức và phát triển văn hóa xanh.' },
    { id: 'u-hr-02', name: 'Đỗ Quang Dũng', email: 'quangdung.hr@tranlecorp.com.vn', role: 'Manager', department: 'Phòng Hành Chính – Nhân Sự', departmentId: 'dept-hr', teamId: 'team-hr-talent', positionId: 'pos-hr-deputy', managerId: 'u-hr-01', avatar: 'https://i.pravatar.cc/150?u=hr2', phone: '0922345602', dob: '1988-12-05', hometown: 'Đà Nẵng', bio: 'Phó Phòng Tuyển Dụng & Đào Tạo Kỹ Sư Năng Lượng.' },
    { id: 'u-hr-03', name: 'Trần Thị Kim Oanh', email: 'kimoanh.hr@tranlecorp.com.vn', role: 'Employee', department: 'Phòng Hành Chính – Nhân Sự', departmentId: 'dept-hr', teamId: 'team-hr-talent', positionId: 'pos-hr-mgr', managerId: 'u-hr-01', avatar: 'https://i.pravatar.cc/150?u=hr3', phone: '0922345603', dob: '1992-04-26', hometown: 'Hà Tĩnh', bio: 'Chuyên viên Tiền lương, Bảo hiểm xã hội, Thuế TNCN và Chế độ Phúc lợi (C&B).' },
    { id: 'u-hr-04', name: 'Bùi Phương Linh', email: 'phuonglinh.hr@tranlecorp.com.vn', role: 'Employee', department: 'Phòng Hành Chính – Nhân Sự', departmentId: 'dept-hr', teamId: 'team-hr-talent', positionId: 'pos-hr-mgr', managerId: 'u-hr-02', avatar: 'https://i.pravatar.cc/150?u=hr4', phone: '0922345604', dob: '1995-10-15', hometown: 'Đà Nẵng', bio: 'Chuyên viên Tuyển dụng Kỹ sư Solar, Onboarding và Quản trị Hồ sơ Nhân sự.' },
    { id: 'u-hr-05', name: 'Phạm Minh Vương', email: 'minhvuong.hr@tranlecorp.com.vn', role: 'Employee', department: 'Phòng Hành Chính – Nhân Sự', departmentId: 'dept-hr', teamId: 'team-hr-talent', positionId: 'pos-hr-mgr', managerId: 'u-hr-01', avatar: 'https://i.pravatar.cc/150?u=hr5', phone: '0922345605', dob: '1997-02-18', hometown: 'Quảng Nam', bio: 'Chuyên viên Hành chính Quản trị Văn phòng, Mua sắm nội bộ và Đội xe Công ty.' },

    // 12. PHÒNG IT & CHUYỂN ĐỔI SỐ (dept-it)
    { id: 'u-it-01', name: 'Nguyễn Thành Trung', email: 'thanhtrung.it@tranlecorp.com.vn', role: 'Manager', department: 'Phòng IT & Chuyển Đổi Số', departmentId: 'dept-it', teamId: 'team-it-digital', positionId: 'pos-it-mgr', managerId: 'u4', avatar: 'https://i.pravatar.cc/150?u=it1', phone: '0923456701', dob: '1986-05-09', hometown: 'Hải Dương', bio: 'Trưởng Phòng IT & Chuyển Đổi Số - Kiến trúc sư trưởng Nền tảng TranLe Tasks.' },
    { id: 'u-it-02', name: 'Vũ Hoàng Long', email: 'hoanglong.it@tranlecorp.com.vn', role: 'Manager', department: 'Phòng IT & Chuyển Đổi Số', departmentId: 'dept-it', teamId: 'team-it-digital', positionId: 'pos-it-deputy', managerId: 'u-it-01', avatar: 'https://i.pravatar.cc/150?u=it2', phone: '0923456702', dob: '1989-01-28', hometown: 'Đà Nẵng', bio: 'Phó Phòng Hệ Thống Máy Chủ & Hạ Tầng Mạng Doanh Nghiệp.' },
    { id: 'u-it-03', name: 'Trương Minh Trí', email: 'minhtri.it@tranlecorp.com.vn', role: 'Employee', department: 'Phòng IT & Chuyển Đổi Số', departmentId: 'dept-it', teamId: 'team-it-digital', positionId: 'pos-it-mgr', managerId: 'u-it-01', avatar: 'https://i.pravatar.cc/150?u=it3', phone: '0923456703', dob: '1994-11-20', hometown: 'TP.HCM', bio: 'Kỹ sư Lập trình Fullstack Web - Phát triển các tính năng quản trị công việc & AI.' },
    { id: 'u-it-04', name: 'Lê Quốc Bảo', email: 'quocbao.it@tranlecorp.com.vn', role: 'Employee', department: 'Phòng IT & Chuyển Đổi Số', departmentId: 'dept-it', teamId: 'team-it-digital', positionId: 'pos-it-mgr', managerId: 'u-it-02', avatar: 'https://i.pravatar.cc/150?u=it4', phone: '0923456704', dob: '1996-07-12', hometown: 'Đà Nẵng', bio: 'Kỹ sư Quản trị Hệ thống Cloud, Docker, Sao lưu dữ liệu & Bảo mật An ninh mạng.' },
    { id: 'u-it-05', name: 'Đặng Văn Hiệp', email: 'vanhiep.it@tranlecorp.com.vn', role: 'Employee', department: 'Phòng IT & Chuyển Đổi Số', departmentId: 'dept-it', teamId: 'team-it-digital', positionId: 'pos-it-mgr', managerId: 'u-it-01', avatar: 'https://i.pravatar.cc/150?u=it5', phone: '0923456705', dob: '1998-03-05', hometown: 'Quảng Bình', bio: 'Chuyên viên IT Helpdesk - Hỗ trợ kỹ thuật người dùng và quản lý thiết bị văn phòng.' },

    // 13. PHÒNG PHÁP CHẾ & HỢP ĐỒNG (dept-legal)
    { id: 'u-legal-01', name: 'Luật Sư Trần Minh Tuấn', email: 'minhtuan.legal@tranlecorp.com.vn', role: 'Manager', department: 'Phòng Pháp Chế & Hợp Đồng', departmentId: 'dept-legal', teamId: 'team-legal-corp', positionId: 'pos-legal-mgr', managerId: 'u4', avatar: 'https://i.pravatar.cc/150?u=legal1', phone: '0924567801', dob: '1984-10-14', hometown: 'Hà Nội', bio: 'Trưởng Phòng Pháp Chế & Hợp Đồng - Luật sư trưởng bảo trợ pháp lý dự án năng lượng.' },
    { id: 'u-legal-02', name: 'Nguyễn Bích Phương', email: 'bichphuong.legal@tranlecorp.com.vn', role: 'Manager', department: 'Phòng Pháp Chế & Hợp Đồng', departmentId: 'dept-legal', teamId: 'team-legal-corp', positionId: 'pos-legal-deputy', managerId: 'u-legal-01', avatar: 'https://i.pravatar.cc/150?u=legal2', phone: '0924567802', dob: '1988-06-03', hometown: 'Đà Nẵng', bio: 'Phó Phòng Quản Trị Hợp Đồng EPC & Thỏa thuận Hợp tác Quốc tế.' },
    { id: 'u-legal-03', name: 'Hoàng Văn Sơn', email: 'vanson.legal@tranlecorp.com.vn', role: 'Employee', department: 'Phòng Pháp Chế & Hợp Đồng', departmentId: 'dept-legal', teamId: 'team-legal-corp', positionId: 'pos-legal-mgr', managerId: 'u-legal-01', avatar: 'https://i.pravatar.cc/150?u=legal3', phone: '0924567803', dob: '1992-08-19', hometown: 'Thừa Thiên Huế', bio: 'Chuyên viên Pháp lý Đấu thầu Năng lượng và Thỏa thuận Đấu nối Điện lực EVN.' },
    { id: 'u-legal-04', name: 'Lê Quỳnh Chi', email: 'quynhchi.legal@tranlecorp.com.vn', role: 'Employee', department: 'Phòng Pháp Chế & Hợp Đồng', departmentId: 'dept-legal', teamId: 'team-legal-corp', positionId: 'pos-legal-mgr', managerId: 'u-legal-02', avatar: 'https://i.pravatar.cc/150?u=legal4', phone: '0924567804', dob: '1995-12-30', hometown: 'Đà Nẵng', bio: 'Chuyên viên Rà soát Hợp đồng Mua bán Thiết bị và Hợp đồng Tổng thầu EPC.' },
    { id: 'u-legal-05', name: 'Đỗ Thanh Tùng', email: 'thanhtung.legal@tranlecorp.com.vn', role: 'Employee', department: 'Phòng Pháp Chế & Hợp Đồng', departmentId: 'dept-legal', teamId: 'team-legal-corp', positionId: 'pos-legal-mgr', managerId: 'u-legal-01', avatar: 'https://i.pravatar.cc/150?u=legal5', phone: '0924567805', dob: '1997-09-17', hometown: 'Quảng Nam', bio: 'Chuyên viên Pháp lý Doanh nghiệp, Giấy phép Xây dựng và Sở hữu Trí tuệ.' },
  ];

  for (const u of INITIAL_USERS) {
    const existing = await db.get('SELECT id FROM users WHERE id = ? OR email = ?', [u.id, u.email]);
    if (!existing) {
      await db.run(
        'INSERT INTO users (id, name, email, password, role, department, departmentId, teamId, positionId, managerId, avatar, phone, dob, hometown, bio, status, employmentStatus) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [u.id, u.name, u.email, hashedPassword, u.role, u.department, u.departmentId, u.teamId, u.positionId, u.managerId, u.avatar, u.phone, u.dob, u.hometown, u.bio, 'active', 'full_time']
      );
    } else {
      await db.run(
        'UPDATE users SET name = ?, role = ?, department = ?, departmentId = ?, teamId = ?, positionId = ?, managerId = ?, avatar = ?, phone = ?, dob = ?, hometown = ?, bio = ?, status = ? WHERE id = ?',
        [u.name, u.role, u.department, u.departmentId, u.teamId, u.positionId, u.managerId, u.avatar, u.phone, u.dob, u.hometown, u.bio, 'active', existing.id]
      );
    }
  }

  // Update Department Managers
  const DEPT_MANAGERS = [
    { deptId: 'dept-exec', managerId: 'u4' },
    { deptId: 'dept-sales', managerId: 'u-sales-01' },
    { deptId: 'dept-eng', managerId: 'u-eng-01' },
    { deptId: 'dept-epc', managerId: 'u2' },
    { deptId: 'dept-om', managerId: 'u-om-01' },
    { deptId: 'dept-proc', managerId: 'u-proc-01' },
    { deptId: 'dept-wh', managerId: 'u-wh-01' },
    { deptId: 'dept-mkt', managerId: 'u-mkt-01' },
    { deptId: 'dept-cs', managerId: 'u-cs-01' },
    { deptId: 'dept-fin', managerId: 'u-fin-01' },
    { deptId: 'dept-hr', managerId: 'u-hr-01' },
    { deptId: 'dept-it', managerId: 'u-it-01' },
    { deptId: 'dept-legal', managerId: 'u-legal-01' },
  ];

  for (const dm of DEPT_MANAGERS) {
    await db.run('UPDATE departments SET managerId = ? WHERE id = ?', [dm.managerId, dm.deptId]);
  }

  // Update Team Managers
  const TEAM_MANAGERS = [
    { teamId: 'team-sales-b2b', managerId: 'u-sales-01' },
    { teamId: 'team-sales-dist', managerId: 'u-sales-02' },
    { teamId: 'team-sales-resi', managerId: 'u-sales-05' },
    { teamId: 'team-eng-solar', managerId: 'u-eng-01' },
    { teamId: 'team-eng-elec', managerId: 'u-eng-02' },
    { teamId: 'team-epc-pm', managerId: 'u2' },
    { teamId: 'team-epc-const', managerId: 'u-epc-01' },
    { teamId: 'team-epc-qaqc', managerId: 'u-epc-02' },
    { teamId: 'team-epc-hse', managerId: 'u-epc-03' },
    { teamId: 'team-om-saj', managerId: 'u-om-01' },
    { teamId: 'team-om-solar', managerId: 'u-om-02' },
    { teamId: 'team-proc-intl', managerId: 'u-proc-01' },
    { teamId: 'team-wh-central', managerId: 'u-wh-01' },
    { teamId: 'team-wh-logistics', managerId: 'u-wh-02' },
    { teamId: 'team-mkt-digital', managerId: 'u-mkt-01' },
    { teamId: 'team-cs-service', managerId: 'u-cs-01' },
    { teamId: 'team-fin-acc', managerId: 'u-fin-01' },
    { teamId: 'team-hr-talent', managerId: 'u-hr-01' },
    { teamId: 'team-it-digital', managerId: 'u-it-01' },
    { teamId: 'team-legal-corp', managerId: 'u-legal-01' },
  ];

  for (const tm of TEAM_MANAGERS) {
    await db.run('UPDATE teams SET managerId = ? WHERE id = ?', [tm.managerId, tm.teamId]);
  }


}
