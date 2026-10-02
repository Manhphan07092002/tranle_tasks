import { describe, expect, it } from 'vitest';
import {
  DEFAULT_DEPT_SECTION,
  DEPT_SECTIONS,
  DEPT_SUBMENU,
  SECTION_TO_TAB,
  TAB_TO_SECTION,
  buildDeptSectionPath,
  isDeptSection,
} from '../pages/DepartmentWorkspace/deptSections';

describe('deptSections — bảng ánh xạ tab <-> section', () => {
  it('có đúng 12 section theo yêu cầu', () => {
    expect(DEPT_SECTIONS).toHaveLength(12);
    expect(DEPT_SECTIONS).toEqual([
      'overview', 'tasks', 'requests', 'domain', 'workflow',
      'calendar', 'documents', 'approvals', 'reports', 'kpi', 'history', 'workload',
    ]);
  });

  it('ánh xạ 2 chiều TAB <-> SECTION nhất quán', () => {
    for (const section of DEPT_SECTIONS) {
      const tab = SECTION_TO_TAB[section];
      expect(tab).toBeDefined();
      expect(TAB_TO_SECTION[tab]).toBe(section);
    }
    // Bao phủ toàn bộ tab nội bộ cũ + workload mới
    expect(Object.keys(TAB_TO_SECTION)).toHaveLength(12);
  });

  it('ánh xạ đúng các trường hợp đặc biệt (dashboard/overview, queue/tasks, docs/documents, audit/history)', () => {
    expect(TAB_TO_SECTION.dashboard).toBe('overview');
    expect(TAB_TO_SECTION.queue).toBe('tasks');
    expect(TAB_TO_SECTION.docs).toBe('documents');
    expect(TAB_TO_SECTION.audit).toBe('history');
    expect(SECTION_TO_TAB.overview).toBe('dashboard');
    expect(SECTION_TO_TAB.tasks).toBe('queue');
  });

  it('section mặc định là overview', () => {
    expect(DEFAULT_DEPT_SECTION).toBe('overview');
    expect(DEPT_SECTIONS).toContain(DEFAULT_DEPT_SECTION);
  });
});

describe('deptSections — submenu sidebar', () => {
  it('có đúng 12 mục theo đúng thứ tự yêu cầu', () => {
    expect(DEPT_SUBMENU.map((m) => m.label)).toEqual([
      'Tổng quan', 'Công việc', 'Yêu cầu', 'Nghiệp vụ', 'Quy trình',
      'Lịch biểu', 'Tài liệu', 'Phê duyệt', 'Báo cáo', 'KPI', 'Lịch sử', 'Tải công việc',
    ]);
    expect(DEPT_SUBMENU.map((m) => m.section)).toEqual(DEPT_SECTIONS);
  });

  it('mỗi mục đều có icon component', () => {
    for (const item of DEPT_SUBMENU) {
      expect(item.icon).toBeDefined();
    }
  });
});

describe('deptSections — helpers URL', () => {
  it('buildDeptSectionPath tạo đúng cấu trúc /department-workspace/:departmentId/:section', () => {
    expect(buildDeptSectionPath('dept-legal', 'overview')).toBe(
      '/department-workspace/dept-legal/overview',
    );
    expect(buildDeptSectionPath('dept-legal', 'kpi')).toBe(
      '/department-workspace/dept-legal/kpi',
    );
  });

  it('isDeptSection nhận diện đúng section hợp lệ', () => {
    for (const s of DEPT_SECTIONS) expect(isDeptSection(s)).toBe(true);
    expect(isDeptSection('dashboard')).toBe(false);
    expect(isDeptSection('queue')).toBe(false);
    expect(isDeptSection('')).toBe(false);
    expect(isDeptSection(undefined)).toBe(false);
    expect(isDeptSection('random')).toBe(false);
  });

  it('ví dụ trong yêu cầu: Legal/KPI và Sales/KPI chỉ khác departmentId', () => {
    const legalKpi = buildDeptSectionPath('dept-legal', 'kpi');
    const salesKpi = buildDeptSectionPath('dept-sales', 'kpi');
    expect(legalKpi).toBe('/department-workspace/dept-legal/kpi');
    expect(salesKpi).toBe('/department-workspace/dept-sales/kpi');
    expect(legalKpi.split('/').pop()).toBe(salesKpi.split('/').pop());
  });
});
