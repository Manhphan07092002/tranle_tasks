/** Logic xếp tuổi nợ AR — pure, test được. Mirror quy tắc FinanceWorkspace. */

export type ArBucket = 'current' | 'b31_60' | 'b61_90' | 'bad';

export interface AgedArRow {
  id: string;
  customer: string;
  ref: string;
  amount: number;
  bucket: ArBucket;
  age: number | null;
}

export function fmtMoney(n: number): string {
  return `${Math.round(n).toLocaleString('vi-VN')} ₫`;
}

export function ageDays(dueDate: string | undefined, todayStr: string): number | null {
  if (!dueDate) return null;
  const d = new Date(dueDate.length <= 10 ? `${dueDate}T00:00:00` : dueDate).getTime();
  if (!Number.isFinite(d)) return null;
  const t = new Date(`${todayStr}T00:00:00`).getTime();
  return Math.floor((t - d) / 86400000);
}

export function classifyBucket(age: number | null): ArBucket {
  if (age === null || age <= 30) return 'current';
  if (age <= 60) return 'b31_60';
  if (age <= 90) return 'b61_90';
  return 'bad';
}

/** Bỏ khoản đã thu/hủy — chỉ tính dư nợ mở. */
export function isOpenAr(r: any): boolean {
  return !['paid', 'cancelled'].includes(String(r?.status || '').toLowerCase());
}

export function ageArRecords(arRecords: any[], todayStr: string): AgedArRow[] {
  return (arRecords || [])
    .filter(isOpenAr)
    .map((r: any) => {
      const amount = Number(r.amount) || 0;
      const age = ageDays(r.dueDate, todayStr);
      return {
        id: String(r.id),
        customer: String(r.customer || '—'),
        ref: String(r.project || r.desc_text || ''),
        amount,
        bucket: classifyBucket(age),
        age,
      };
    })
    .sort((a, b) => b.amount - a.amount);
}

export function sumBucket(rows: AgedArRow[], b: ArBucket): number {
  return rows.filter((r) => r.bucket === b).reduce((s, r) => s + r.amount, 0);
}

export function countBucket(rows: AgedArRow[], b: ArBucket): number {
  return rows.filter((r) => r.bucket === b).length;
}
