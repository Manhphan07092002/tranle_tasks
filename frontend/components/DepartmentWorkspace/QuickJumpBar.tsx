import { FileText, HardHat, Package, ShieldCheck, BarChart3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function QuickJumpBar() {
  const navigate = useNavigate();

  const shortcuts = [
    { icon: FileText, color: 'text-emerald-500', bg: 'hover:border-emerald-500 hover:text-emerald-600', label: 'Hợp Đồng', path: '/contracts' },
    { icon: HardHat, color: 'text-blue-500', bg: 'hover:border-blue-500 hover:text-blue-600', label: 'Dự Án EPC', path: '/projects' },
    { icon: Package, color: 'text-amber-500', bg: 'hover:border-amber-500 hover:text-amber-600', label: 'Kho & Thiết Bị', path: '/products' },
    { icon: ShieldCheck, color: 'text-purple-500', bg: 'hover:border-purple-500 hover:text-purple-600', label: 'Trung Tâm Phê Duyệt', path: '/approvals' },
    { icon: BarChart3, color: 'text-cyan-500', bg: 'hover:border-cyan-500 hover:text-cyan-600', label: 'Báo Cáo Phòng', path: '/reports' },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className="font-bold text-gray-500 uppercase tracking-wider">Truy Cập Nhanh:</span>
      {shortcuts.map(({ icon: Icon, color, bg, label, path }) => (
        <button
          key={path}
          onClick={() => navigate(path)}
          className={`px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 font-semibold transition-colors flex items-center gap-1 shadow-sm ${bg}`}
        >
          <Icon size={13} className={color} />
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}