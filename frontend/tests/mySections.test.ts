import { describe, expect, it } from 'vitest';
import {
  DEFAULT_MY_SECTION,
  MY_SECTIONS,
  MY_SUBMENU,
  buildMyWorkPath,
  isMySection,
} from '../pages/MyWorkspace/mySections';

describe('mySections — 6 sections Không gian cá nhân', () => {
  it('có đúng 6 section theo thứ tự yêu cầu', () => {
    expect(MY_SECTIONS).toEqual([
      'today', 'tasks', 'approvals', 'calendar', 'inbox', 'kpi',
    ]);
  });

  it('section mặc định là today', () => {
    expect(DEFAULT_MY_SECTION).toBe('today');
    expect(MY_SECTIONS).toContain(DEFAULT_MY_SECTION);
  });

  it('submenu khớp sections, đủ label + icon', () => {
    expect(MY_SUBMENU.map((m) => m.section)).toEqual(MY_SECTIONS);
    expect(MY_SUBMENU.map((m) => m.label)).toEqual([
      'Hôm nay', 'Việc của tôi', 'Chờ tôi duyệt', 'Lịch', 'Hộp thư & Thông báo', 'KPI cá nhân',
    ]);
    for (const item of MY_SUBMENU) expect(item.icon).toBeDefined();
  });

  it('buildMyWorkPath tạo đúng /my-work/:section', () => {
    expect(buildMyWorkPath('today')).toBe('/my-work/today');
    expect(buildMyWorkPath('kpi')).toBe('/my-work/kpi');
  });

  it('isMySection từ chối giá trị lạ (kể cả section của dept workspace)', () => {
    for (const s of MY_SECTIONS) expect(isMySection(s)).toBe(true);
    expect(isMySection('overview')).toBe(false);
    expect(isMySection('queue')).toBe(false);
    expect(isMySection('')).toBe(false);
    expect(isMySection(undefined)).toBe(false);
  });
});
