import React from 'react';
import { Users, BarChart3, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { Task, TaskStatus } from '../../types';

interface KPITabProps {
  deptTasks: Task[];
  deptMembers: any[];
  deptTemplates: any[];
  overdueTasks: number;
  totalTasks: number;
  completionRate: number;
}

export function KPITab({
  deptTasks,
  deptMembers,
  deptTemplates,
  overdueTasks,
  totalTasks,
  completionRate
}: KPITabProps) {
  const hasTasks = totalTasks > 0;
  const slaRate = hasTasks ? Math.round(((totalTasks - overdueTasks) / totalTasks) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Users size={16} className="text-emerald-600" />
            <span>Phân Bổ Tải Việc Thành Viên ({deptMembers.length} nhân sự)</span>
          </h3>

          <div className="space-y-3">
            {deptMembers.map(m => {
              const memberTasks = deptTasks.filter(t => t.assignees?.includes(m.id));
              const doneCount = memberTasks.filter(t => t.status === TaskStatus.DONE).length;
              const openCount = memberTasks.length - doneCount;
              const progress = memberTasks.length > 0 ? (doneCount / memberTasks.length) * 100 : 0;

              return (
                <div key={m.id} className="p-3 bg-gray-50 dark:bg-slate-700/50 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <div className="flex items-center gap-2">
                      <img src={m.avatar || 'https://via.placeholder.com/32'} alt={m.name} className="w-6 h-6 rounded-full object-cover" />
                      <span className="text-gray-900 dark:text-white">{m.name}</span>
                      <span className="text-[11px] font-normal text-gray-400">({m.role})</span>
                    </div>
                    <span className="text-emerald-700 dark:text-emerald-400 font-bold">{openCount} việc đang mở</span>
                  </div>

                  <div className="w-full bg-gray-200 dark:bg-slate-600 h-2 rounded-full overflow-hidden flex">
                    <div
                      className="bg-emerald-500 h-full"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <BarChart3 size={16} className="text-emerald-600" />
            <span>Chỉ Số Hiệu Suất Vận Hành (KPI)</span>
          </h3>

          <div className="space-y-4 text-xs">
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl flex items-center justify-between">
              <span className="font-semibold text-emerald-900 dark:text-emerald-200">Tỷ lệ công việc đúng hạn (SLA)</span>
              <span className="text-lg font-black text-emerald-700 dark:text-emerald-400">{hasTasks ? `${slaRate}%` : '—'}</span>
            </div>

            <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-xl flex items-center justify-between">
              <span className="font-semibold text-blue-900 dark:text-blue-200">Tỷ lệ hoàn thành</span>
              <span className="text-lg font-black text-blue-700 dark:text-blue-400">{hasTasks ? `${completionRate}%` : '—'}</span>
            </div>

            <div className="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-xl flex items-center justify-between">
              <span className="font-semibold text-amber-900 dark:text-amber-200">Công việc quá hạn</span>
              <span className="text-lg font-black text-amber-700 dark:text-amber-400">{overdueTasks}</span>
            </div>

            <div className="p-4 bg-purple-50 dark:bg-purple-950/30 rounded-xl flex items-center justify-between">
              <span className="font-semibold text-purple-900 dark:text-purple-200">Mẫu quy trình đã chuẩn hóa</span>
              <span className="text-lg font-black text-purple-700 dark:text-purple-400">{deptTemplates.length} quy trình</span>
            </div>

            <div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-xl flex items-center justify-between">
              <span className="font-semibold text-gray-900 dark:text-white">Thời gian phản hồi yêu cầu TB</span>
              <span className="text-lg font-black text-gray-700 dark:text-gray-400">{"< 4.5 Giờ"}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}