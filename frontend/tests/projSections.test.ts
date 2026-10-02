import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PROJECT_SECTION,
  PROJECT_SECTIONS,
  PROJECT_SUBMENU,
  buildProjectWorkspacePath,
  isProjectSection,
} from '../pages/ProjectWorkspace/projSections';

describe('projSections — 6 sections Không gian dự án', () => {
  it('đúng 6 section theo thứ tự', () => {
    expect(PROJECT_SECTIONS).toEqual([
      'overview', 'chain', 'schedule', 'finance', 'docs', 'team',
    ]);
    expect(DEFAULT_PROJECT_SECTION).toBe('overview');
  });

  it('submenu khớp sections, đủ label + icon', () => {
    expect(PROJECT_SUBMENU.map((m) => m.section)).toEqual(PROJECT_SECTIONS);
    expect(PROJECT_SUBMENU.map((m) => m.label)).toEqual([
      'Tổng quan', 'Chuỗi liên phòng', 'Tiến độ', 'Tài chính', 'Tài liệu & Báo cáo', 'Đội ngũ',
    ]);
    for (const item of PROJECT_SUBMENU) expect(item.icon).toBeDefined();
  });

  it('build path đúng /projects/:id/workspace/:section', () => {
    expect(buildProjectWorkspacePath('p1', 'chain')).toBe('/projects/p1/workspace/chain');
  });

  it('isProjectSection từ chối section lạ', () => {
    for (const s of PROJECT_SECTIONS) expect(isProjectSection(s)).toBe(true);
    expect(isProjectSection('overview2')).toBe(false);
    expect(isProjectSection('tasks')).toBe(false);
    expect(isProjectSection(undefined)).toBe(false);
  });
});
