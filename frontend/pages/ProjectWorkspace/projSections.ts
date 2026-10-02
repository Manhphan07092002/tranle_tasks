import {
  LayoutDashboard, Workflow, CalendarClock, Wallet, FolderOpen, Users,
  type LucideIcon,
} from 'lucide-react';

/** Sections của Không gian dự án — URL: /projects/:projectId/workspace/:section */
export type ProjectSection =
  | 'overview' | 'chain' | 'schedule' | 'finance' | 'docs' | 'team';

export const PROJECT_SECTIONS: ProjectSection[] = [
  'overview', 'chain', 'schedule', 'finance', 'docs', 'team',
];

export function isProjectSection(v: string | undefined): v is ProjectSection {
  return !!v && (PROJECT_SECTIONS as string[]).includes(v);
}

export interface ProjectSubmenuItem {
  section: ProjectSection;
  label: string;
  icon: LucideIcon;
}

export const PROJECT_SUBMENU: ProjectSubmenuItem[] = [
  { section: 'overview', label: 'Tổng quan', icon: LayoutDashboard },
  { section: 'chain', label: 'Chuỗi liên phòng', icon: Workflow },
  { section: 'schedule', label: 'Tiến độ', icon: CalendarClock },
  { section: 'finance', label: 'Tài chính', icon: Wallet },
  { section: 'docs', label: 'Tài liệu & Báo cáo', icon: FolderOpen },
  { section: 'team', label: 'Đội ngũ', icon: Users },
];

export const DEFAULT_PROJECT_SECTION: ProjectSection = 'overview';

export function buildProjectWorkspacePath(projectId: string, section: ProjectSection): string {
  return `/projects/${projectId}/workspace/${section}`;
}
