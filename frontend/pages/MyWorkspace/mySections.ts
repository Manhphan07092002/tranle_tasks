import {
  Sun, Inbox, CheckCircle2, Calendar, Mail, BarChart3,
  type LucideIcon,
} from 'lucide-react';

/** Sections của Không gian cá nhân — URL là nguồn trạng thái: /my-work/:section */
export type MySection =
  | 'today' | 'tasks' | 'approvals' | 'calendar' | 'inbox' | 'kpi';

export const MY_SECTIONS: MySection[] = [
  'today', 'tasks', 'approvals', 'calendar', 'inbox', 'kpi',
];

export function isMySection(v: string | undefined): v is MySection {
  return !!v && (MY_SECTIONS as string[]).includes(v);
}

export interface MySubmenuItem {
  section: MySection;
  label: string;
  icon: LucideIcon;
}

export const MY_SUBMENU: MySubmenuItem[] = [
  { section: 'today', label: 'Hôm nay', icon: Sun },
  { section: 'tasks', label: 'Việc của tôi', icon: Inbox },
  { section: 'approvals', label: 'Chờ tôi duyệt', icon: CheckCircle2 },
  { section: 'calendar', label: 'Lịch', icon: Calendar },
  { section: 'inbox', label: 'Hộp thư & Thông báo', icon: Mail },
  { section: 'kpi', label: 'KPI cá nhân', icon: BarChart3 },
];

export const DEFAULT_MY_SECTION: MySection = 'today';

export function buildMyWorkPath(section: MySection): string {
  return `/my-work/${section}`;
}
