import { 
  BarChart3, Inbox, ArrowRightLeft, Layers, Sparkles, Calendar, 
  FileText, CheckCircle2, PieChart, Clock, Gauge
} from 'lucide-react';

interface TabConfig {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  badge?: number | string;
  color: string;
}

const tabs: TabConfig[] = [
  { id: 'dashboard', label: 'Tổng quan', icon: BarChart3, color: 'text-gray-500' },
  { id: 'queue', label: 'Công việc', icon: Inbox, color: 'text-gray-500' },
  { id: 'requests', label: 'Yêu cầu', icon: ArrowRightLeft, color: 'text-amber-500' },
  { id: 'domain', label: 'Nghiệp vụ', icon: Layers, badge: 'Đặc thù', color: 'text-emerald-500' },
  { id: 'workflow', label: 'Quy trình', icon: Sparkles, color: 'text-purple-500' },
  { id: 'calendar', label: 'Lịch biểu', icon: Calendar, color: 'text-blue-500' },
  { id: 'docs', label: 'Tài liệu', icon: FileText, color: 'text-gray-500' },
  { id: 'approvals', label: 'Phê duyệt', icon: CheckCircle2, color: 'text-gray-500' },
  { id: 'reports', label: 'Báo cáo', icon: PieChart, color: 'text-gray-500' },
  { id: 'kpi', label: 'KPI', icon: BarChart3, color: 'text-gray-500' },
  { id: 'audit', label: 'Lịch sử', icon: Clock, color: 'text-gray-400' },
  { id: 'workload', label: 'Tải công việc', icon: Gauge, color: 'text-gray-500' },
];

interface TabNavigationProps {
  activeTab: TabConfig['id'];
  onTabChange: (tab: TabConfig['id']) => void;
  badgeOverrides?: Record<string, number | string>;
}

export function TabNavigation({
  activeTab,
  onTabChange,
  badgeOverrides = {}
}: TabNavigationProps) {
  return (
    <div className="flex border-b border-gray-200 dark:border-slate-700 gap-1 overflow-x-auto custom-scrollbar">
      {tabs.map(tab => {
        const badge = badgeOverrides[tab.id] ?? tab.badge;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold border-b-2 whitespace-nowrap transition-colors ${
              isActive
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400'
                : 'border-transparent text-gray-500 hover:text-gray-800 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <tab.icon size={15} className={isActive ? 'text-emerald-600' : tab.color} />
            <span>{tab.label}</span>
            {badge !== undefined && (
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300'
              }`}>
                {badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}