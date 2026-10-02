import {
  BarChart3, Inbox, ArrowRightLeft, Layers, Sparkles, Calendar,
  FileText, CheckCircle2, PieChart, Clock, Gauge,
  type LucideIcon,
} from 'lucide-react';

/** Tab nội bộ (state cũ) <-> section trên URL. */
export type DeptTabId =
  | 'dashboard' | 'queue' | 'requests' | 'domain' | 'workflow'
  | 'calendar' | 'docs' | 'approvals' | 'reports' | 'kpi' | 'audit' | 'workload';

export type DeptSection =
  | 'overview' | 'tasks' | 'requests' | 'domain' | 'workflow'
  | 'calendar' | 'documents' | 'approvals' | 'reports' | 'kpi' | 'history' | 'workload';

export const TAB_TO_SECTION: Record<DeptTabId, DeptSection> = {
  dashboard: 'overview',
  queue: 'tasks',
  requests: 'requests',
  domain: 'domain',
  workflow: 'workflow',
  calendar: 'calendar',
  docs: 'documents',
  approvals: 'approvals',
  reports: 'reports',
  kpi: 'kpi',
  audit: 'history',
  workload: 'workload',
};

export const SECTION_TO_TAB: Record<DeptSection, DeptTabId> = {
  overview: 'dashboard',
  tasks: 'queue',
  requests: 'requests',
  domain: 'domain',
  workflow: 'workflow',
  calendar: 'calendar',
  documents: 'docs',
  approvals: 'approvals',
  reports: 'reports',
  kpi: 'kpi',
  history: 'audit',
  workload: 'workload',
};

export const DEPT_SECTIONS: DeptSection[] = [
  'overview', 'tasks', 'requests', 'domain', 'workflow',
  'calendar', 'documents', 'approvals', 'reports', 'kpi', 'history', 'workload',
];

export function isDeptSection(v: string | undefined): v is DeptSection {
  return !!v && (DEPT_SECTIONS as string[]).includes(v);
}

export interface DeptSubmenuItem {
  section: DeptSection;
  label: string;
  icon: LucideIcon;
}

/** 12 mục submenu sidebar. */
export const DEPT_SUBMENU: DeptSubmenuItem[] = [
  { section: 'overview', label: 'Tổng quan', icon: BarChart3 },
  { section: 'tasks', label: 'Công việc', icon: Inbox },
  { section: 'requests', label: 'Yêu cầu', icon: ArrowRightLeft },
  { section: 'domain', label: 'Nghiệp vụ', icon: Layers },
  { section: 'workflow', label: 'Quy trình', icon: Sparkles },
  { section: 'calendar', label: 'Lịch biểu', icon: Calendar },
  { section: 'documents', label: 'Tài liệu', icon: FileText },
  { section: 'approvals', label: 'Phê duyệt', icon: CheckCircle2 },
  { section: 'reports', label: 'Báo cáo', icon: PieChart },
  { section: 'kpi', label: 'KPI', icon: BarChart3 },
  { section: 'history', label: 'Lịch sử', icon: Clock },
  { section: 'workload', label: 'Tải công việc', icon: Gauge },
];

export const DEFAULT_DEPT_SECTION: DeptSection = 'overview';

export function buildDeptSectionPath(departmentId: string, section: DeptSection): string {
  return `/department-workspace/${departmentId}/${section}`;
}
