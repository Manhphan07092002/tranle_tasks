// ===== CHAIN REMINDER SCHEDULER (08:30 daily VN) =====
// Phase 1+2 liên kết chuỗi:
//  1. PR pending quá 48h chưa có PO -> nhắc phòng Mua hàng.
//  2. Hợp đồng tái ký hết hạn trong 90 ngày & còn 'contacting' -> nhắc CSKH.
export function scheduleChainReminders(db: any) {
  const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

  const targetUsers = async (keywords: string[]) => {
    const allUsers = await db.all('SELECT id, role, department FROM users');
    return (allUsers || []).filter((u: any) => {
      const role = String(u.role || '').toLowerCase();
      if (role === 'admin' || role === 'director' || role === 'giám đốc') return true;
      const dept = String(u.department || '').toLowerCase();
      return keywords.some((kw) => dept.includes(kw));
    });
  };

  const alreadySentToday = async (type: string, relatedId: string, todayIso: string) => {
    const row = await db.get(
      `SELECT id FROM notifications WHERE type = ? AND relatedId = ? AND createdAt >= ?`,
      [type, relatedId, `${todayIso}T00:00:00.000Z`]
    );
    return !!row;
  };

  const checkAndNotify = async () => {
    const nowVN = new Date(Date.now() + VN_OFFSET_MS);
    if (nowVN.getUTCDay() === 0 || nowVN.getUTCDay() === 6) return;
    if (nowVN.getUTCHours() !== 8 || nowVN.getUTCMinutes() !== 30) return;

    const todayIso = `${nowVN.getUTCFullYear()}-${String(nowVN.getUTCMonth() + 1).padStart(2, '0')}-${String(nowVN.getUTCDate()).padStart(2, '0')}`;
    const nowIso = new Date().toISOString();

    try {
      // 1. PR kẹt: pending quá 48h và chưa có PO nào tham chiếu prId.
      const stuckPrs =
        (await db.all(
          `SELECT pr.* FROM procurement_prs pr
           LEFT JOIN procurement_pos po ON po.prId = pr.id
           WHERE pr.status = 'pending' AND po.id IS NULL
             AND pr.createdAt < DATE_SUB(UTC_TIMESTAMP(), INTERVAL 48 HOUR)`
        )) || [];
      if (stuckPrs.length > 0) {
        const users = await targetUsers(['procurement', 'scm', 'mua hàng', 'vật tư']);
        for (const pr of stuckPrs) {
          if (await alreadySentToday('pr_stuck_reminder', pr.id, todayIso)) continue;
          for (const u of users) {
            await db.run(
              `INSERT INTO notifications (id, userId, type, title, message, relatedId, isRead, createdAt) VALUES (?, ?, 'pr_stuck_reminder', ?, ?, ?, 0, ?)`,
              [
                crypto.randomUUID(),
                u.id,
                `⏳ PR chờ quá 48h chưa thành PO`,
                `PR cho "${pr.project}" vẫn ở trạng thái pending và chưa có PO. Vui lòng xử lý.`,
                pr.id,
                nowIso,
              ]
            );
          }
        }
      }

      // 2. Tái ký sắp hết hạn trong 90 ngày.
      const upcoming =
        (await db.all(
          `SELECT * FROM contract_renewals
           WHERE status = 'contacting' AND expiry IS NOT NULL AND expiry != ''
             AND expiry <= DATE_ADD(CURDATE(), INTERVAL 90 DAY)`
        )) || [];
      if (upcoming.length > 0) {
        const users = await targetUsers(['cs', 'chăm sóc', 'kinh doanh', 'sales']);
        for (const rn of upcoming) {
          if (await alreadySentToday('renewal_expiry_reminder', rn.id, todayIso)) continue;
          for (const u of users) {
            await db.run(
              `INSERT INTO notifications (id, userId, type, title, message, relatedId, isRead, createdAt) VALUES (?, ?, 'renewal_expiry_reminder', ?, ?, ?, 0, ?)`,
              [
                crypto.randomUUID(),
                u.id,
                `📅 Hợp đồng sắp hết hạn bảo trì`,
                `"${rn.customer}" hết hạn ${rn.expiry}. Chào gói O&M mở rộng ngay.`,
                rn.id,
                nowIso,
              ]
            );
          }
        }
      }
    } catch (err) {
      console.error('[Scheduler] Chain reminder error:', err);
    }
  };

  setInterval(checkAndNotify, 60_000);
  console.log('[Scheduler] Chain reminder scheduler started (fires daily 08:30 VN).');
}
