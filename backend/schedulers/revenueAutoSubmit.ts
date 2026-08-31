import { sendNotification } from '../utils/notify.js';
import crypto from 'crypto';

// ===== REVENUE REPORT AUTOMATIC SUBMISSION SCHEDULER =====
// Triggers at 16:00 on Fridays to submit draft automatic reports for manager (TP) approval:
// - Every Friday: Submits Weekly reports
// - Last Friday of the month: Submits Monthly reports
// - Last Friday of the year: Submits Year-end/December reports
export function scheduleRevenueAutoSubmit(db: any) {
  const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

  const checkAndSubmit = async () => {
    const nowVN = new Date(Date.now() + VN_OFFSET_MS);
    const dayOfWeek = nowVN.getUTCDay(); // 5 = Friday
    const hours = nowVN.getUTCHours();
    const minutes = nowVN.getUTCMinutes();

    // Check if it is exactly Friday at 16:00
    if (dayOfWeek !== 5 || hours !== 16 || minutes !== 0) return;

    try {
      const now = new Date().toISOString();
      const nextWeek = new Date(nowVN.getTime() + 7 * 24 * 60 * 60 * 1000);
      const isLastFridayOfMonth = nextWeek.getUTCMonth() !== nowVN.getUTCMonth();
      const isLastFridayOfYear = nextWeek.getUTCFullYear() !== nowVN.getUTCFullYear();

      console.log(`[RevenueScheduler] 16:00 Friday check. Last Friday of Month: ${isLastFridayOfMonth}, Last Friday of Year: ${isLastFridayOfYear}`);

      // 1. Submit Weekly Reports (Every Friday)
      const weeklyDrafts = await db.all(
        "SELECT * FROM revenue_reports WHERE generationMode = 'automatic' AND reportType = 'weekly' AND status = 'Draft' AND (isDeleted IS NULL OR isDeleted = 0)"
      );

      for (const r of weeklyDrafts) {
        await db.run(
          "UPDATE revenue_reports SET status = 'Pending Manager', submittedAt = ? WHERE id = ?",
          [now, r.id]
        );

        // Log activity
        await db.run(
          "INSERT INTO activity_logs (id, userId, action, entityId, entityType, createdAt) VALUES (?, ?, ?, ?, ?, ?)",
          [crypto.randomUUID(), r.authorId || 'system', 'revenue_report.submitted', r.id, 'revenue_report', now]
        );

        // Notify department manager
        const dept = await db.get("SELECT managerId FROM departments WHERE name = ? OR id = ?", [r.department, r.department]);
        if (dept?.managerId) {
          await sendNotification(
            db,
            dept.managerId,
            'revenue_submitted',
            'Báo cáo doanh thu tuần tự động mới',
            `Hệ thống tự động nộp báo cáo doanh thu tuần: "${r.title}" để chờ TP phê duyệt.`,
            r.id
          );
        }
      }

      if (weeklyDrafts.length > 0) {
        console.log(`[RevenueScheduler] Automatically submitted ${weeklyDrafts.length} weekly draft reports.`);
      }

      // 2. Submit Monthly Reports (Last Friday of the Month)
      if (isLastFridayOfMonth) {
        const monthlyDrafts = await db.all(
          "SELECT * FROM revenue_reports WHERE generationMode = 'automatic' AND reportType = 'monthly' AND status = 'Draft' AND (isDeleted IS NULL OR isDeleted = 0)"
        );

        for (const r of monthlyDrafts) {
          await db.run(
            "UPDATE revenue_reports SET status = 'Pending Manager', submittedAt = ? WHERE id = ?",
            [now, r.id]
          );

          // Log activity
          await db.run(
            "INSERT INTO activity_logs (id, userId, action, entityId, entityType, createdAt) VALUES (?, ?, ?, ?, ?, ?)",
            [crypto.randomUUID(), r.authorId || 'system', 'revenue_report.submitted', r.id, 'revenue_report', now]
          );

          // Notify department manager
          const dept = await db.get("SELECT managerId FROM departments WHERE name = ? OR id = ?", [r.department, r.department]);
          if (dept?.managerId) {
            await sendNotification(
              db,
              dept.managerId,
              'revenue_submitted',
              'Báo cáo doanh thu tháng tự động mới',
              `Hệ thống tự động nộp báo cáo doanh thu tháng: "${r.title}" để chờ TP phê duyệt.`,
              r.id
            );
          }
        }

        if (monthlyDrafts.length > 0) {
          console.log(`[RevenueScheduler] Automatically submitted ${monthlyDrafts.length} monthly draft reports.`);
        }
      }

      // 3. Submit Year-End reports (Last Friday of the Year)
      if (isLastFridayOfYear) {
        console.log(`[RevenueScheduler] Year-end automatic report submission triggered.`);
        // Note: Dec monthly report is already submitted by the isLastFridayOfMonth check above.
        // We log it here for comprehensive logging and yearly record audit events.
        await db.run(
          "INSERT INTO activity_logs (id, userId, action, entityId, entityType, createdAt) VALUES (?, ?, ?, ?, ?, ?)",
          [crypto.randomUUID(), 'system', 'revenue_report.year_end_triggered', 'system', 'revenue_report', now]
        );
      }

    } catch (err) {
      console.error('[RevenueScheduler] Error during automatic revenue report submission:', err);
    }
  };

  setInterval(checkAndSubmit, 60_000);
  console.log('[RevenueScheduler] Weekly, Monthly, and Yearly automatic revenue submission scheduler started.');
}
