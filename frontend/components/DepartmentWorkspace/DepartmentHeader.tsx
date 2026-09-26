import {
  ShieldCheck, Crown, TrendingUp, Cpu, Wrench, ShoppingCart, Package,
  Megaphone, Headphones, DollarSign, Users, Server, Scale, Building2,
  type LucideIcon,
} from 'lucide-react';

// DB lưu icon phòng ban dưới dạng tên (VD: 'Crown') — map sang component Lucide.
// Tên lạ (emoji cũ) thì render text như cũ để tương thích ngược.
const DEPT_ICONS: Record<string, LucideIcon> = {
  Crown, TrendingUp, Cpu, Wrench, ShieldCheck, ShoppingCart, Package,
  Megaphone, Headphones, DollarSign, Users, Server, Scale,
};

function DeptIcon({ name }: { name?: string }) {
  const Icon = (name && DEPT_ICONS[name]) || null;
  if (Icon) return <Icon size={28} strokeWidth={2.2} />;
  if (name) return <span className="text-2xl leading-none">{name}</span>;
  return <Building2 size={28} strokeWidth={2.2} />;
}

interface DepartmentHeaderProps {
  currentDept: any;
  isAdminOrDirector: boolean;
  allowedDepartments: any[];
  selectedDeptId: string;
  onSelectDept: (id: string) => void;
}

export function DepartmentHeader({
  currentDept,
  isAdminOrDirector,
  allowedDepartments,
  selectedDeptId,
  onSelectDept
}: DepartmentHeaderProps) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm">
      <div className="flex items-center gap-4">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-md"
          style={{ background: `linear-gradient(135deg, ${currentDept?.color || '#10b981'}, ${currentDept?.color || '#0f766e'}dd)` }}
        >
          <DeptIcon name={currentDept?.icon} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">{currentDept?.name}</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              {currentDept?.code || 'DEPT'}
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 max-w-2xl">
            {currentDept?.description || 'Không gian quản trị nghiệp vụ chuyên sâu, hàng đợi công việc và phối hợp liên phòng ban Tran Le Electricity.'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider hidden sm:inline">Phòng Ban:</label>
        {isAdminOrDirector ? (
          <select
            value={selectedDeptId}
            onChange={(e) => onSelectDept(e.target.value)}
            className="px-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-gray-50 dark:bg-slate-700 text-sm font-semibold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 shadow-inner"
          >
            {allowedDepartments.map(d => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.code})
              </option>
            ))}
          </select>
        ) : (
          <div className="px-4 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-2">
            <ShieldCheck size={16} />
            <span>Phòng ban trực thuộc: <strong>{currentDept?.name}</strong></span>
          </div>
        )}
      </div>
    </div>
  );
}