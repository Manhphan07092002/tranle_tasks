import crypto from 'crypto';

// ===== SLA ESCALATION SCHEDULER (chạy mỗi 15 phút) =====
// Chính sách response/resolve theo (ticketType, priority) nằm trong bảng
// sla_policies (MySQL) — tắt/sửa không cần deploy. Chống spam bằng cơ chế
// đã-gửi-hôm-nay trên bảng notifications (giống chainReminders).

export interface SlaPolicy {
  id: string;
  ticketType: 'cs' | 'om' | 'it';
  priority: string;
  responseHours: number;
  resolveHours: number;
}

const DEFAULT_POLICIES: Array<Omit<SlaPolicy, 'id'>> = [
  { ticketType: 'cs', priority: 'critical', responseHours: 4, resolveHours: 24 },
  { ticketType: 'cs', priority: 'high', responseHours: 8, resolveHours: 72 },
  { ticketType: 'cs', priority: 'medium', responseHours: 24, resolveHours: 120 },
  { ticketType: 'cs', priority: 'low', responseHours: 72, resolveHours: 336 },
  { ticketType: 'om', priority: 'critical', responseHours: 4, resolveHours: 24 },
  { ticketType: 'om', priority: 'high', responseHours: 8, resolveHours: 72 },
  { ticketType: 'om', priority: 'medium', responseHours: 24, resolveHours: 120 },
  { ticketType: 'om', priority: 'low', responseHours: 72, resolveHours: 336 },
  { ticketType: 'it', priority: 'critical', responseHours: 4, resolveHours: 24 },
  { ticketType: 'it', priority: 'high', responseHours: 8, resolveHours: 72 },
  { ticketType: 'it', priority: 'medium', responseHours: 24, resolveHours: 120 },
  { ticketType: 'it', priority: 'low', responseHours: 72, resolveHours: 336 },
];

const TABLE_BY_TYPE: Record<string, string> = {
  cs: 'customer_tickets',
  om: 'om_alarms',
  it: 'it_tickets',
};

const DEPT_KEYWORDS: Record<string, string[]> = {
  cs: ['chăm sóc', 'cskh', 'cs'],
  om: ['o&m', 'bảo hành', 'vận hành', 'saj'],
  it: ['công nghệ', 'chuyển đổi số', 'it'],
};

const CLOSED_STATUSES = ['closed', 'resolved', 'done', 'completed', 'cancelled', 'rejected'];

function isClosedStatus(status: unknown): boolean {
  return CLOSED_STATUSES.includes(String(status || '').toLowerCase());
}

/** Chuẩn hóa priority/severity đa dạng của 3 bảng về 4 mức. */
export function normalizePriority(raw: unknown): string {
  const v = String(raw || '').toLowerCase().trim();
  if (v === 'critical' || v === 'urgent' || v === 'khẩn cấp') return 'critical';
  if (v === 'high' || v === 'major' || v === 'cao') return 'high';
  if (v === 'low' || v === 'minor' || v === 'thấp') return 'low';
  return 'medium';
}

function priorityOf(type: string, row: any): string {
  if (type === 'om') return normalizePriority(row.severity);
  return normalizePriority(row.priority);
}

function titleOf(type: string, row: any): string {
  if (type === 'cs') return String(row.title || 'Ticket CSKH');
  if (type === 'om') return `${row.site || ''} — ${row.fault || 'Cảnh báo O&M'}`.trim();
  return String(row.issue || 'Ticket IT').slice(0, 120);
}

export async function ensureDefaultPolicies(db: any): Promise<SlaPolicy[]> {
  const existing = (await db.all('SELECT * FROM sla_policies')) || [];
  if (existing.length > 0) return existing;
  const now = new Date().toISOString();
  for (const p of DEFAULT_POLICIES) {
    await db.run(
      'INSERT INTO sla_policies (id, ticketType, priority, responseHours, resolveHours, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
      [`sla-${p.ticketType}-${p.priority}`, p.ticketType, p.priority, p.responseHours, p.resolveHours, now],
    );
  }
  return (await db.all('SELECT * FROM sla_policies')) || [];
}

async function alreadySentToday(db: any, relatedId: string, todayIso: string): Promise<boolean> {
  const row = await db.get(
    'SELECT id FROM notifications WHERE type = ? AND relatedId = ? AND createdAt >= ?',
    ['sla_escalation', relatedId, `${todayIso}T00:00:00.000Z`],
  );
  return !!row;
}

async function tierUsers(db: any, level: number, deptKeywords: string[]): Promise<any[]> {
  const allUsers = (await db.all('SELECT id, role, department, departmentId FROM users')) || [];
  if (level >= 2) {
    return allUsers.filter((u: any) => {
      const role = String(u.role || '').toLowerCase();
      return role === 'admin' || role === 'director' || role === 'giám đốc';
    });
  }
  return allUsers.filter((u: any) => {
    const role = String(u.role || '').toLowerCase();
    if (role === 'admin' || role === 'director' || role === 'giám đốc') return true;
    if (role !== 'manager' && role !== 'trưởng phòng' && role !== 'phó phòng') return false;
    const dept = String(u.department || '').toLowerCase();
    return deptKeywords.some((kw) => dept.includes(kw));
  });
}

/**
 * Một lượt kiểm tra leo thang. Trả về số ticket đã leo thang (để test).
 * Idempotent trong ngày nhờ dedupe notifications + cột escalatedLevel.
 */
export async function runSlaEscalationCheck(db: any, nowIso: string, todayIso: string): Promise<number> {
  const policies = await ensureDefaultPolicies(db);
  let escalated = 0;

  for (const p of policies) {
    const table = TABLE_BY_TYPE[p.ticketType];
    if (!table || !['customer_tickets', 'om_alarms', 'it_tickets'].includes(table)) continue;
    const placeholders = CLOSED_STATUSES.map(() => '?').join(', ');
    const breaching = (await db.all(
      `SELECT * FROM ${table} WHERE status NOT IN (${placeholders})
        AND createdAt IS NOT NULL AND createdAt != ''
        AND createdAt < DATE_SUB(UTC_TIMESTAMP(), INTERVAL ? HOUR)
        AND (escalatedLevel IS NULL OR escalatedLevel < 2)`,
      [...CLOSED_STATUSES, p.responseHours],
    )) || [];

    for (const t of breaching) {
      if (isClosedStatus(t.status)) continue;
      if (priorityOf(p.ticketType, t) !== p.priority) continue;
      const resolveBreached = await db.get(
        `SELECT id FROM ${table} WHERE id = ? AND createdAt < DATE_SUB(UTC_TIMESTAMP(), INTERVAL ? HOUR)`,
        [t.id, p.resolveHours],
      );
      const needLevel = resolveBreached ? 2 : 1;
      if (Number(t.escalatedLevel || 0) >= needLevel) continue;
      const dedupeKey = `${t.id}:L${needLevel}`;
      if (await alreadySentToday(db, dedupeKey, todayIso)) continue;

      const slaDue = new Date(new Date(t.createdAt).getTime() + p.responseHours * 3600 * 1000).toISOString();
      await db.run(
        `UPDATE ${table} SET escalatedLevel = ?, escalatedAt = ?, slaDueAt = ?, updatedAt = ? WHERE id = ?`,
        [needLevel, nowIso, isNaN(Date.parse(slaDue)) ? null : slaDue, nowIso, t.id],
      );

      const users = await tierUsers(db, needLevel, DEPT_KEYWORDS[p.ticketType] || []);
      const label = needLevel === 1 ? 'Trưởng phòng ban' : 'Ban Giám đốc';
      for (const u of users) {
        await db.run(
          `INSERT INTO notifications (id, userId, type, title, message, relatedId, isRead, createdAt) VALUES (?, ?, 'sla_escalation', ?, ?, ?, 0, ?)`,
          [
            crypto.randomUUID(),
            u.id,
            `SLA quá hạn — leo thang cấp ${needLevel} (${label})`,
            `"${titleOf(p.ticketType, t)}" chưa xử lý trong ${p.responseHours}h (mức ${p.priority}). Vui lòng can thiệp.`,
            dedupeKey,
            nowIso,
          ],
        );
      }
      escalated++;
    }
  }
  return escalated;
}

export function scheduleSlaEscalation(db: any) {
  const tick = async () => {
    try {
      const now = new Date();
      if (now.getMinutes() % 15 !== 0) return;
      const todayIso = now.toISOString().slice(0, 10);
      await runSlaEscalationCheck(db, now.toISOString(), todayIso);
    } catch (err) {
      console.error('[SLA] escalation tick failed:', (err as Error).message);
    }
  };
  setInterval(tick, 60 * 1000);
  console.log('[Scheduler] SLA escalation scheduler started (fires every 15 min).');
}
