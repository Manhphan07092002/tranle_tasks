import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';

import { DEPTS, mockControl, mockUser, resetMockControl } from './mockWorkspace';
import { DEPT_SUBMENU } from '../pages/DepartmentWorkspace/deptSections';
import { Sidebar } from '../components/layout/Sidebar';

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser(),
    logout: vi.fn(),
    isLoading: false,
  }),
}));

vi.mock('../contexts/DataContext', () => ({
  useData: () => ({ departments: DEPTS }),
}));

vi.mock('../contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k }),
}));

vi.mock('../services/api', () => ({
  apiFetch: vi.fn(async () => ({ ok: true, json: async () => ({ count: 0 }) })),
}));

function LocationProbe() {
  const loc = useLocation();
  return <div data-testid="location">{loc.pathname}</div>;
}

function deptLinks(): HTMLAnchorElement[] {
  return screen
    .getAllByRole('link')
    .map((a) => a as HTMLAnchorElement)
    .filter((a) => (a.getAttribute('href') || '').includes('/department-workspace/'));
}

function deptLinkByLabel(label: RegExp): HTMLAnchorElement {
  const found = deptLinks().find((a) => label.test(a.textContent || ''));
  if (!found) throw new Error(`Không tìm thấy submenu link: ${label}`);
  return found;
}

function renderSidebar(initialPath: string, mobileOpen = true) {
  const setIsMobileMenuOpen = vi.fn();
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Sidebar
        isMobileMenuOpen={mobileOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        openCreateModal={() => {}}
      />
      <LocationProbe />
    </MemoryRouter>,
  );
  return { setIsMobileMenuOpen };
}

beforeEach(() => {
  resetMockControl();
});

describe('sidebar submenu Không gian phòng ban', () => {
  it('ngoài workspace: submenu đóng mặc định, bấm mũi tên xổ đúng 11 mục', () => {
    mockControl.role = 'Employee';
    mockControl.permissions = [];
    renderSidebar('/');
    // Chưa xổ submenu phòng ban (link dashboard "Tổng quan" toàn hệ thống vẫn có, nhưng không có link dept nào)
    expect(deptLinks()).toHaveLength(0);
    // Bấm mũi tên mở rộng
    fireEvent.click(screen.getByRole('button', { name: 'Mở rộng' }));
    const links = deptLinks();
    expect(links).toHaveLength(11);
    // Href trỏ đúng phòng của user (dept-sales)
    const hrefs = links.map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual(DEPT_SUBMENU.map((m) => `/department-workspace/dept-sales/${m.section}`));
  });

  it('trong workspace: submenu tự mở, menu cha active, mục con active đúng route', () => {
    renderSidebar('/department-workspace/dept-legal/kpi');
    // Submenu tự mở với 11 mục của phòng đang xem
    expect(deptLinks()).toHaveLength(11);
    const kpiLink = deptLinkByLabel(/KPI/);
    expect(kpiLink.getAttribute('href')).toBe('/department-workspace/dept-legal/kpi');
    expect(kpiLink.className).toMatch('bg-brand-50');
    expect(kpiLink.className).toMatch('text-brand-700');
    // Mục khác không active
    const overviewLink = deptLinkByLabel(/Tổng quan/);
    expect(overviewLink.className).not.toMatch('text-brand-700');
  });

  it('chọn mục con trên mobile thì sidebar tự đóng', () => {
    const { setIsMobileMenuOpen } = renderSidebar('/department-workspace/dept-legal/kpi');
    fireEvent.click(deptLinkByLabel(/Báo cáo/));
    expect(setIsMobileMenuOpen).toHaveBeenCalledWith(false);
    expect(screen.getByTestId('location')).toHaveTextContent(
      '/department-workspace/dept-legal/reports',
    );
  });

  it('bấm tên menu cha -> mở trang Tổng quan mặc định', () => {
    const { setIsMobileMenuOpen } = renderSidebar('/department-workspace/dept-legal/kpi');
    fireEvent.click(screen.getByRole('button', { name: /Không gian phòng ban/ }));
    expect(screen.getByTestId('location')).toHaveTextContent(
      '/department-workspace/dept-legal/overview',
    );
    expect(setIsMobileMenuOpen).toHaveBeenCalledWith(false);
  });

  it('mũi tên chỉ đóng/mở submenu, không đổi route', () => {
    renderSidebar('/department-workspace/dept-legal/kpi');
    fireEvent.click(screen.getByRole('button', { name: 'Thu gọn' }));
    expect(deptLinks()).toHaveLength(0);
    expect(screen.getByTestId('location')).toHaveTextContent(
      '/department-workspace/dept-legal/kpi',
    );
  });
});
