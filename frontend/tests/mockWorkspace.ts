import { vi } from 'vitest';

/** Trạng thái điều khiển dùng chung cho các mock context/hook trong test. */
export const DEPTS = [
  { id: 'dept-sales', code: 'SALES', name: 'Phòng Kinh doanh', color: '#10b981', icon: 'TrendingUp' },
  { id: 'dept-legal', code: 'LEGAL', name: 'Phòng Pháp chế', color: '#8b5cf6', icon: 'Scale' },
];

export const mockControl = {
  role: 'Admin',
  permissions: ['admin_panel'] as string[],
  userDeptId: 'dept-sales',
  userId: 'u1',
};

export function resetMockControl() {
  mockControl.role = 'Admin';
  mockControl.permissions = ['admin_panel'];
  mockControl.userDeptId = 'dept-sales';
  mockControl.userId = 'u1';
}

export function mockUser() {
  return {
    id: mockControl.userId,
    name: mockControl.role === 'Admin' ? 'Admin Test' : 'Nhân viên Test',
    email: 'test@tranle.test',
    role: mockControl.role,
    permissions: mockControl.permissions,
    departmentId: mockControl.userDeptId,
    department: DEPTS.find((d) => d.id === mockControl.userDeptId)?.name,
  };
}

export const mockSetSelectedDeptId = vi.fn();
export const mockSetActiveTab = vi.fn();

export function resetMockFns() {
  mockSetSelectedDeptId.mockClear();
  mockSetActiveTab.mockClear();
}
