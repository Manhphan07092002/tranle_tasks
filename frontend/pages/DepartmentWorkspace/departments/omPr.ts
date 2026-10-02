/**
 * Tính kỳ vọng sản lượng ngày của trạm (kWh/ngày).
 * Ưu tiên số liệu PVsyst nhập tay (pvsystExpectedKwh); fallback công thức
 * công suất × giờ nắng chuẩn. Trả 0 khi không đủ dữ liệu.
 */
export function expectedKwh(site: any): number {
  const pvsyst = Number(site?.pvsystExpectedKwh);
  if (Number.isFinite(pvsyst) && pvsyst > 0) return pvsyst;
  const cap = Number(site?.capacityKwp) || 0;
  const sunH = Number(site?.sunHours) || 4.5;
  return cap > 0 ? cap * sunH : 0;
}

/** true khi trạm có kỳ vọng PVsyst nhập tay (hiển thị dòng riêng trên card). */
export function hasPvsyst(site: any): boolean {
  const pvsyst = Number(site?.pvsystExpectedKwh);
  return Number.isFinite(pvsyst) && pvsyst > 0;
}

/** PR% = sản lượng thực / kỳ vọng. null khi thiếu dữ liệu. */
export function prPercent(latestKwh: number, expected: number): number | null {
  if (!Number.isFinite(latestKwh) || !(expected > 0)) return null;
  return Math.round((latestKwh / expected) * 1000) / 10;
}
