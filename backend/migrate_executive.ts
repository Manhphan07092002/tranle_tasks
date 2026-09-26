import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { randomUUID } from 'crypto';
import { initDbMysql } from './db_mysql.js';

const APPLY = process.argv.includes('--apply');

// Chỉ nhận chuỗi thuần ngày d/m/yyyy (định dạng vi-VN) → ISO. Mọi dạng khác giữ nguyên, báo cáo.
function toISODate(raw: unknown): string | null {
  const s = String(raw ?? '').trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return null; // đã ISO
  const m = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(s);
  if (!m) return null;
  const d = Number(m[1]);
  const mo = Number(m[2]);
  const y = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || y < 2000 || y > 2100) return null;
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export async function runExecutiveMigration() {
  console.log(`🚀 Executive data normalization ${APPLY ? '(APPLY — sẽ ghi DB)' : '(DRY-RUN — chỉ đọc, không ghi)'}`);
  const db = await initDbMysql();

  // ── 1. Chuẩn hóa date executive_meetings ──────────────────────────────
  const meetings: any[] = await db.all('SELECT id, title, date, createdAt FROM executive_meetings ORDER BY createdAt ASC');
  console.log(`\n📅 executive_meetings: ${meetings.length} bản ghi`);
  const planned: { id: string; title: string; from: string; to: string }[] = [];
  const skippedISO: string[] = [];
  const unparseable: { id: string; title: string; date: string }[] = [];

  for (const m of meetings) {
    const iso = toISODate(m.date);
    if (iso) {
      planned.push({ id: m.id, title: m.title, from: String(m.date), to: iso });
    } else if (/^\d{4}-\d{2}-\d{2}/.test(String(m.date ?? '').trim())) {
      skippedISO.push(m.id);
    } else {
      unparseable.push({ id: m.id, title: m.title, date: String(m.date) });
    }
  }

  console.log(`   - Đã ISO, bỏ qua: ${skippedISO.length}`);
  console.log(`   - Chuyển được sang ISO: ${planned.length}`);
  planned.forEach(p => console.log(`     • "${p.title}" : "${p.from}" → "${p.to}"`));
  console.log(`   - Không parse được (giữ nguyên): ${unparseable.length}`);
  unparseable.slice(0, 10).forEach(u => console.log(`     • "${u.title}" : "${u.date}"`));
  if (unparseable.length > 10) console.log(`     • ... và ${unparseable.length - 10} bản ghi nữa`);

  if (APPLY && planned.length > 0) {
    await db.run('START TRANSACTION');
    try {
      for (const p of planned) {
        await db.run('UPDATE executive_meetings SET date = ?, updatedAt = ? WHERE id = ?', [p.to, new Date().toISOString(), p.id]);
      }
      await db.run('COMMIT');
      console.log(`   ✅ Đã cập nhật ${planned.length} bản ghi.`);
    } catch (err) {
      await db.run('ROLLBACK');
      throw err;
    }
  }

  // ── 2. Seed metrics mẫu khi bảng trống ─────────────────────────────────
  const metricCount: any = await db.get('SELECT COUNT(*) AS cnt FROM executive_metrics');
  console.log(`\nexecutive_metrics: ${metricCount?.cnt ?? 0} bản ghi`);
  // Cột revenue/cost/profit là INT (tối đa ~2.1 tỷ) → số mẫu giữ dưới ngưỡng này.
  if ((metricCount?.cnt ?? 0) === 0) {
    const now = new Date();
    const rows = Array.from({ length: 6 }, (_, k) => {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (5 - k), 1));
      const revenue = 950_000_000 + k * 120_000_000;
      const cost = Math.round(revenue * 0.65);
      return {
        id: randomUUID(),
        month: `T${d.getUTCMonth() + 1}/${d.getUTCFullYear()}`,
        revenue,
        cost,
        profit: revenue - cost,
      };
    });
    if (APPLY) {
      const ts = new Date().toISOString();
      await db.run('START TRANSACTION');
      try {
        for (const r of rows) {
          await db.run(
            'INSERT INTO executive_metrics (id, month, revenue, cost, profit, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
            [r.id, r.month, r.revenue, r.cost, r.profit, ts]
          );
        }
        await db.run('COMMIT');
        console.log('   ✅ Đã seed 6 tháng số liệu MẪU (cần thay bằng số liệu tài chính thực tế):');
      } catch (err) {
        await db.run('ROLLBACK');
        throw err;
      }
    } else {
      console.log('   (dry-run) Sẽ seed 6 tháng số liệu MẪU:');
    }
    rows.forEach(r => console.log(`     • ${r.month}: doanh thu ${r.revenue}, chi phí ${r.cost}, lợi nhuận ${r.profit}`));
  } else {
    console.log('   - Bảng đã có dữ liệu, không seed.');
  }

  // ── 3. Báo cáo chỉ-đọc: dept OKR (để đối chiếu dropdown mới) ──────────
  const okrDepts: any[] = await db.all('SELECT DISTINCT dept FROM company_okrs');
  console.log(`\n🎯 company_okrs dept distinct (${okrDepts.length}): ${okrDepts.map(r => `"${r.dept}"`).join(', ') || '(trống)'}`);

  console.log(`\n${APPLY ? '✅' : '🔍'} Executive migration ${APPLY ? 'hoàn tất' : 'dry-run xong — chạy lại với --apply để ghi DB'}\n`);
}

runExecutiveMigration()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal migration error:', err);
    process.exit(1);
  });
