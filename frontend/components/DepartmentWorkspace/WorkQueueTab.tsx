import React from 'react';
import { Search, AlertTriangle, CheckSquare, Calendar } from 'lucide-react';
import { Task, TaskStatus, TaskPriority } from '../../types';
import { WorkQueueTaskItem } from './WorkQueueTaskItem';

interface WorkQueueTabProps {
  deptTasks: Task[];
  filteredQueueTasks: Task[];
  queueFilter: 'all' | 'my' | 'team' | 'unassigned' | 'today' | 'overdue' | 'blocked' | 'review';
  setQueueFilter: (filter: 'all' | 'my' | 'team' | 'unassigned' | 'today' | 'overdue' | 'blocked' | 'review') => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  overdueTasks: number;
  todayStr: string;
  user: any;
  teams: any[];
  projects: any[];
  users: any[];
  onTaskSelect: (task: Task) => void;
}

const filterTabs = [
  { id: 'all', label: 'Tất cả' },
  { id: 'my', label: 'Việc của tôi' },
  { id: 'team', label: 'Việc của Team' },
  { id: 'unassigned', label: 'Chưa phân công' },
  { id: 'today', label: 'Hôm nay' },
  { id: 'overdue', label: ({ overdue }: { overdue: number }) => `Quá hạn (${overdue})` },
  { id: 'blocked', label: 'Nghẽn / Khẩn' },
  { id: 'review', label: 'Chờ duyệt' },
] as const;

export function WorkQueueTab({
  deptTasks,
  filteredQueueTasks,
  queueFilter,
  setQueueFilter,
  searchQuery,
  setSearchQuery,
  overdueTasks,
  todayStr,
  user,
  teams,
  projects,
  users,
  onTaskSelect
}: WorkQueueTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white dark:bg-slate-800 p-3 rounded-xl border border-gray-200 dark:border-slate-700">
        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto">
          {filterTabs.map(tab => {
            const label = typeof tab.label === 'function' ? tab.label({ overdue: overdueTasks }) : tab.label;
            return (
              <button
                key={tab.id}
                onClick={() => setQueueFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  queueFilter === tab.id
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div className="relative min-w-[240px]">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={15} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm công việc..."
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      <div className="space-y-2.5">
        {filteredQueueTasks.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-gray-300 dark:border-slate-700">
            <CheckSquare size={42} className="mx-auto text-gray-300 dark:text-slate-600 mb-2" />
            <h3 className="text-sm font-bold text-gray-700 dark:text-slate-300">Không có công việc nào trong hàng đợi</h3>
            <p className="text-xs text-gray-400 mt-1">Các công việc thuộc bộ lọc này đã được hoàn tất hoặc chưa được tạo.</p>
          </div>
        ) : (
          filteredQueueTasks.map(task => {
            const isOverdue = !!(task.dueDate && task.dueDate < todayStr && task.status !== TaskStatus.DONE);
            const completedSubtasks = task.subtasks?.filter(st => st.isCompleted).length || 0;
            const totalSubtasks = task.subtasks?.length || 0;
            const taskTeam = teams.find(t => t.id === task.teamId);
            const taskProject = projects.find(p => p.id === task.projectId);

            return (
              <WorkQueueTaskItem
                key={task.id}
                task={task}
                isOverdue={isOverdue}
                completedSubtasks={completedSubtasks}
                totalSubtasks={totalSubtasks}
                taskTeam={taskTeam}
                taskProject={taskProject}
                todayStr={todayStr}
                user={user}
                users={users}
                onClick={() => onTaskSelect(task)}
              />
            );
          })
        )}
      </div>
    </div>
  );
}