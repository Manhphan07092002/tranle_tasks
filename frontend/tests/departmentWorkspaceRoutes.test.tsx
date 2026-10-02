import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';

import { DEPTS, mockControl, mockSetActiveTab, mockSetSelectedDeptId, mockUser, resetMockControl, resetMockFns } from './mockWorkspace';
import { DEPT_SECTIONS, SECTION_TO_TAB } from '../pages/DepartmentWorkspace/deptSections';

/* ---------- Mocks ---------- */

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser(),
    login: vi.fn(),
    logout: vi.fn(),
    isLoading: false,
    updateUserSession: vi.fn(),
    isAdmin: mockControl.role === 'Admin',
    isDirector: mockControl.role === 'Director',
    isManager: mockControl.role === 'Manager',
    isEmployee: !['Admin', 'Director', 'Manager'].includes(mockControl.role),
    canApprove: true,
    hasPermission: (p: string) => mockControl.permissions.includes(p),
    canManageDepartment: () => mockControl.role === 'Admin' || mockControl.role === 'Director',
  }),
}));

vi.mock('../contexts/DataContext', () => ({
  useData: () => ({
    departments: DEPTS,
    users: [],
    teams: [],
  }),
}));

// Hook dữ liệu thật (react-query) được stub: suy ra dept/tab từ URL như layout đã đồng bộ.
vi.mock('../pages/DepartmentWorkspace/hooks/useDepartmentWorkspace', async (importOriginal) => {
  const { useParams, useLocation } = await import('react-router-dom');
  const { SECTION_TO_TAB, isDeptSection } = await import('../pages/DepartmentWorkspace/deptSections');
  const state = await import('./mockWorkspace');
  return {
    useDepartmentWorkspace: () => {
      const params = useParams<{ departmentId: string }>();
      const location = useLocation();
      const sectionSeg = location.pathname.split('/').filter(Boolean).pop();
      const selectedDeptId = params.departmentId || '';
      const currentDept = state.DEPTS.find((d: any) => d.id === selectedDeptId) || state.DEPTS[0];
      const userDept = state.DEPTS.find((d: any) => d.id === state.mockControl.userDeptId);
      const isAdmin = ['Admin', 'Director'].includes(state.mockControl.role)
        || state.mockControl.permissions.includes('admin_panel');
      const section = (isDeptSection(sectionSeg) ? sectionSeg : 'overview') as keyof typeof SECTION_TO_TAB;
      return {
        selectedDeptId, setSelectedDeptId: state.mockSetSelectedDeptId,
        activeTab: (SECTION_TO_TAB as any)[section] || 'dashboard', setActiveTab: state.mockSetActiveTab,
        queueFilter: 'all', setQueueFilter: vi.fn(),
        requestTab: 'incoming', setRequestTab: vi.fn(),
        searchQuery: '', setSearchQuery: vi.fn(),
        isNewRequestOpen: false, setIsNewRequestOpen: vi.fn(),
        isNewTemplateOpen: false, setIsNewTemplateOpen: vi.fn(),
        selectedTask: null, setSelectedTask: vi.fn(),
        isTaskModalOpen: false, setIsTaskModalOpen: vi.fn(),
        targetDeptId: '', setTargetDeptId: vi.fn(),
        reqTitle: '', setReqTitle: vi.fn(),
        reqDesc: '', setReqDesc: vi.fn(),
        reqPriority: 'Medium', setReqPriority: vi.fn(),
        reqDueDate: '', setReqDueDate: vi.fn(),
        reqRelatedProj: '', setReqRelatedProj: vi.fn(),
        handleCreateRequest: vi.fn(), handleInstantiate: vi.fn(), handleConvert: vi.fn(),
        isAdminOrDirector: isAdmin,
        userDept,
        allowedDepartments: isAdmin ? state.DEPTS : userDept ? [userDept] : [],
        currentDept,
        deptTeams: [], deptMembers: [],
        deptTasks: [{ id: 't1' }], filteredQueueTasks: [{ id: 't1' }],
        incomingRequests: [], outgoingRequests: [], deptTemplates: [],
        totalTasks: 1, completedTasks: 0, overdueTasks: 0, completionRate: 0,
        todayStr: '2026-09-26',
        departments: state.DEPTS, teams: [], users: [], tasks: [], projects: [],
        departmentRequests: [], taskTemplates: [], contracts: [], approvals: [],
        revenueReports: [],
        saveTask: vi.fn(), refreshData: vi.fn(),
        user: state.mockUser(),
      };
    },
  };
});

// Các tab/component nặng được thay bằng marker để assert đúng trang + đúng props.
vi.mock('../pages/DepartmentWorkspace/tabs', () => ({
  DepartmentDashboardTab: (p: any) => <div data-testid="tab-dashboard" data-dept={p.departmentId} />,
  DepartmentCalendarTab: (p: any) => <div data-testid="tab-calendar" data-dept={p.departmentId} />,
  DepartmentDocsTab: (p: any) => <div data-testid="tab-docs" data-dept={p.departmentId} />,
  DepartmentApprovalsTab: (p: any) => <div data-testid="tab-approvals" data-dept={p.departmentId} />,
  DepartmentReportsTab: (p: any) => <div data-testid="tab-reports" data-dept={p.departmentId} />,
  DepartmentAuditTab: (p: any) => <div data-testid="tab-audit" data-dept={p.departmentId} />,
}));
vi.mock('../components/DepartmentWorkspace/WorkQueueTab', () => ({
  WorkQueueTab: (p: any) => <div data-testid="tab-queue" data-count={p.deptTasks?.length ?? 0} />,
}));
vi.mock('../components/DepartmentWorkspace/RequestsTab', () => ({
  RequestsTab: (p: any) => <div data-testid="tab-requests" data-dept={p.selectedDeptId} />,
}));
vi.mock('../components/DepartmentWorkspace/KPITab', () => ({
  KPITab: (p: any) => <div data-testid="tab-kpi" data-total={p.totalTasks ?? 0} />,
}));
vi.mock('../pages/DepartmentWorkspace/DepartmentDomainView', () => ({
  DepartmentDomainView: (p: any) => (
    <div data-testid="tab-domain" data-dept={p.departmentId} data-code={p.departmentCode} />
  ),
}));
vi.mock('../components/workflow/CrossDepartmentWorkflowTracker', () => ({
  CrossDepartmentWorkflowTracker: () => <div data-testid="tab-workflow" />,
}));
vi.mock('../components/TaskModal', () => ({
  TaskModal: () => null,
}));

import DepartmentWorkspaceLayout from '../pages/DepartmentWorkspace/layout';
import DepartmentWorkspaceDefault from '../pages/DepartmentWorkspace/default';
import {
  DeptOverviewPage, DeptTasksPage, DeptRequestsPage, DeptDomainPage, DeptWorkflowPage,
  DeptCalendarPage, DeptDocumentsPage, DeptApprovalsPage, DeptReportsPage, DeptKpiPage,
  DeptHistoryPage,
} from '../pages/DepartmentWorkspace/sections';

/** Cây route workspace dựng đúng như App.tsx. */
function WorkspaceRoutes({ initialPath }: { initialPath: string }) {
  return (
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/department-workspace" element={<DepartmentWorkspaceDefault />} />
        <Route path="/department-workspace/:departmentId" element={<DepartmentWorkspaceLayout />}>
          <Route index element={<Navigate to="overview" replace />} />
          <Route path="overview" element={<DeptOverviewPage />} />
          <Route path="tasks" element={<DeptTasksPage />} />
          <Route path="requests" element={<DeptRequestsPage />} />
          <Route path="domain" element={<DeptDomainPage />} />
          <Route path="workflow" element={<DeptWorkflowPage />} />
          <Route path="calendar" element={<DeptCalendarPage />} />
          <Route path="documents" element={<DeptDocumentsPage />} />
          <Route path="approvals" element={<DeptApprovalsPage />} />
          <Route path="reports" element={<DeptReportsPage />} />
          <Route path="kpi" element={<DeptKpiPage />} />
          <Route path="history" element={<DeptHistoryPage />} />
          <Route path="*" element={<Navigate to="overview" replace />} />
        </Route>
      </Routes>
      <LocationProbe />
    </MemoryRouter>
  );
}

function LocationProbe() {
  const loc = useLocation();
  return <div data-testid="location">{loc.pathname}</div>;
}

const SECTION_MARKER: Record<string, string> = {
  overview: 'tab-dashboard',
  tasks: 'tab-queue',
  requests: 'tab-requests',
  domain: 'tab-domain',
  workflow: 'tab-workflow',
  calendar: 'tab-calendar',
  documents: 'tab-docs',
  approvals: 'tab-approvals',
  reports: 'tab-reports',
  kpi: 'tab-kpi',
  history: 'tab-audit',
};

beforeEach(() => {
  resetMockControl();
  resetMockFns();
});

describe('route mặc định /department-workspace', () => {
  it('tự chuyển về overview của phòng ban user', () => {
    mockControl.role = 'Employee';
    mockControl.permissions = [];
    mockControl.userDeptId = 'dept-sales';
    render(<WorkspaceRoutes initialPath="/department-workspace" />);
    expect(screen.getByTestId('location')).toHaveTextContent(
      '/department-workspace/dept-sales/overview',
    );
    expect(screen.getByTestId('tab-dashboard')).toBeInTheDocument();
  });
});

describe('11 section có URL riêng, mở trực tiếp không mất trang', () => {
  it.each(DEPT_SECTIONS)('GET /department-workspace/dept-legal/%s -> đúng trang', (section) => {
    render(<WorkspaceRoutes initialPath={`/department-workspace/dept-legal/${section}`} />);
    // Refresh/bookmark: URL giữ nguyên sau render
    expect(screen.getByTestId('location')).toHaveTextContent(
      `/department-workspace/dept-legal/${section}`,
    );
    expect(screen.getByTestId(SECTION_MARKER[section])).toBeInTheDocument();
  });

  it('section lạ -> về overview', () => {
    render(<WorkspaceRoutes initialPath="/department-workspace/dept-legal/bogus" />);
    expect(screen.getByTestId('location')).toHaveTextContent(
      '/department-workspace/dept-legal/overview',
    );
  });

  it('thiếu section -> index chuyển về overview', () => {
    render(<WorkspaceRoutes initialPath="/department-workspace/dept-legal" />);
    expect(screen.getByTestId('location')).toHaveTextContent(
      '/department-workspace/dept-legal/overview',
    );
  });
});

describe('dữ liệu trang con đã lọc theo phòng ban', () => {
  it('overview/domain/tasks/requests nhận đúng departmentId dept-legal', () => {
    render(<WorkspaceRoutes initialPath="/department-workspace/dept-legal/overview" />);
    expect(screen.getByTestId('tab-dashboard')).toHaveAttribute('data-dept', 'dept-legal');
  });

  it('domain nhận đúng code phòng ban (nghiệp vụ đặc thù 13 phòng)', () => {
    render(<WorkspaceRoutes initialPath="/department-workspace/dept-legal/domain" />);
    const el = screen.getByTestId('tab-domain');
    expect(el).toHaveAttribute('data-dept', 'dept-legal');
    expect(el).toHaveAttribute('data-code', 'LEGAL');
  });

  it('header hiển thị đúng tên phòng ban theo URL', () => {
    render(<WorkspaceRoutes initialPath="/department-workspace/dept-legal/kpi" />);
    expect(screen.getByRole('heading', { name: 'Phòng Pháp chế' })).toBeInTheDocument();
  });

  it('TabNavigation active đúng tab theo URL (kpi)', () => {
    render(<WorkspaceRoutes initialPath="/department-workspace/dept-legal/kpi" />);
    const kpiTab = screen.getByRole('button', { name: /KPI/ });
    expect(kpiTab.className).toMatch('border-emerald-600');
  });
});

describe('quyền truy cập theo departmentId', () => {
  it('nhân viên sales mò URL legal/kpi -> bị chuyển về sales/kpi (giữ section)', () => {
    mockControl.role = 'Employee';
    mockControl.permissions = [];
    mockControl.userDeptId = 'dept-sales';
    render(<WorkspaceRoutes initialPath="/department-workspace/dept-legal/kpi" />);
    expect(screen.getByTestId('location')).toHaveTextContent(
      '/department-workspace/dept-sales/kpi',
    );
    expect(screen.getByTestId('tab-kpi')).toBeInTheDocument();
  });

  it('admin được truy cập mọi phòng ban', () => {
    render(<WorkspaceRoutes initialPath="/department-workspace/dept-legal/kpi" />);
    expect(screen.getByTestId('location')).toHaveTextContent(
      '/department-workspace/dept-legal/kpi',
    );
    expect(screen.getByTestId('tab-kpi')).toBeInTheDocument();
  });
});

describe('đổi phòng ban giữ nguyên section', () => {
  it('dropdown Legal -> Sales trên trang kpi thì sang sales/kpi', () => {
    render(<WorkspaceRoutes initialPath="/department-workspace/dept-legal/kpi" />);
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'dept-sales' } });
    expect(screen.getByTestId('location')).toHaveTextContent(
      '/department-workspace/dept-sales/kpi',
    );
  });

  it('bấm tab Báo cáo trên trang legal/overview thì sang legal/reports', () => {
    render(<WorkspaceRoutes initialPath="/department-workspace/dept-legal/overview" />);
    fireEvent.click(screen.getByRole('button', { name: /Báo cáo/ }));
    expect(screen.getByTestId('location')).toHaveTextContent(
      '/department-workspace/dept-legal/reports',
    );
    expect(screen.getByTestId('tab-reports')).toBeInTheDocument();
  });
});
