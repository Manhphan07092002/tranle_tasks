import { CheckCircle2, BarChart3, ArrowRightLeft, Users } from 'lucide-react';

interface StatCardsProps {
  totalTasks: number;
  completionRate: number;
  incomingRequestsCount: number;
  deptMembersCount: number;
  deptTeamsCount: number;
}

export function StatCards({
  totalTasks,
  completionRate,
  incomingRequestsCount,
  deptMembersCount,
  deptTeamsCount
}: StatCardsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex items-center gap-3">
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 rounded-xl">
          <CheckCircle2 size={22} />
        </div>
        <div>
          <div className="text-2xl font-black text-gray-900 dark:text-white">{totalTasks}</div>
          <div className="text-xs text-gray-500 font-medium">Tổng Công Việc</div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex items-center gap-3">
        <div className="p-3 bg-blue-50 dark:bg-blue-950/40 text-blue-600 rounded-xl">
          <BarChart3 size={22} />
        </div>
        <div>
          <div className="text-2xl font-black text-gray-900 dark:text-white">{totalTasks === 0 ? '—' : `${completionRate}%`}</div>
          <div className="text-xs text-gray-500 font-medium">{totalTasks === 0 ? 'Chưa có việc' : 'Tỷ Lệ Hoàn Thành'}</div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex items-center gap-3">
        <div className="p-3 bg-amber-50 dark:bg-amber-950/40 text-amber-600 rounded-xl">
          <ArrowRightLeft size={22} />
        </div>
        <div>
          <div className="text-2xl font-black text-gray-900 dark:text-white">{incomingRequestsCount}</div>
          <div className="text-xs text-gray-500 font-medium">Phiếu Yêu Cầu Đến</div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex items-center gap-3">
        <div className="p-3 bg-purple-50 dark:bg-purple-950/40 text-purple-600 rounded-xl">
          <Users size={22} />
        </div>
        <div>
          <div className="text-2xl font-black text-gray-900 dark:text-white">{deptMembersCount}</div>
          <div className="text-xs text-gray-500 font-medium">Thành Viên & {deptTeamsCount} Nhóm</div>
        </div>
      </div>
    </div>
  );
}