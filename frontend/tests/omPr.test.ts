import { describe, expect, it } from 'vitest';
import { expectedKwh, hasPvsyst, prPercent } from '../pages/DepartmentWorkspace/departments/omPr';

describe('omPr — kỳ vọng sản lượng trạm', () => {
  it('ưu tiên PVsyst nhập tay, fallback công suất × giờ nắng', () => {
    expect(expectedKwh({ capacityKwp: 100, sunHours: 4.5, pvsystExpectedKwh: 480 })).toBe(480);
    expect(expectedKwh({ capacityKwp: 100, sunHours: 4.5 })).toBe(450);
    expect(expectedKwh({ capacityKwp: 100 })).toBe(450);
    expect(expectedKwh({})).toBe(0);
    expect(expectedKwh({ capacityKwp: 100, sunHours: 4.5, pvsystExpectedKwh: 0 })).toBe(450);
  });

  it('hasPvsyst chỉ true khi có số dương', () => {
    expect(hasPvsyst({ pvsystExpectedKwh: 480 })).toBe(true);
    expect(hasPvsyst({})).toBe(false);
    expect(hasPvsyst({ pvsystExpectedKwh: 0 })).toBe(false);
  });

  it('prPercent làm tròn 1 chữ số, null khi thiếu dữ liệu', () => {
    expect(prPercent(450, 450)).toBe(100);
    expect(prPercent(300, 450)).toBe(66.7);
    expect(prPercent(100, 0)).toBeNull();
    expect(prPercent(NaN, 450)).toBeNull();
  });
});
