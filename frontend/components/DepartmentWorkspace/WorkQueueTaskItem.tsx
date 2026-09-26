import React from 'react';
import { AlertTriangle, CheckSquare, Calendar } from 'lucide-react';
import { Task, TaskStatus, TaskPriority } from '../../types';

interface WorkQueueTaskItemProps {
  task: Task;
  isOverdue: boolean;
  completedSubtasks: number;
  totalSubtasks: number;
  taskTeam: any;
  taskProject: any;
  todayStr: string;
  user: any;
  users: any[];
  onClick: () => void;
}

export function WorkQueueTaskItem({
  task,
  isOverdue,
  completedSubtasks,
  totalSubtasks,
  taskTeam,
  taskProject,
  todayStr,
  user,
  users,
  onClick
}: WorkQueueTaskItemProps) {
  return (
    <div
      onClick={onClick}
      className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-slate-700 hover:border-emerald-500 hover:shadow-md transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
    >
      <div className="space-y-1.5 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
            task.status === TaskStatus.DONE
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
              : task.status === TaskStatus.IN_PROGRESS
              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
              : 'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-300'
          }`}>
            {task.status}
          </span>

          <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
            task.priority === TaskPriority.URGENT
              ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 animate-pulse'
              : task.priority === TaskPriority.HIGH
              ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
              : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
          }`}>
            {task.priority}
          </span>

          {taskTeam && (
            <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/50">
              {taskTeam.name}
            </span>
          )}

          {taskProject && (
            <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200/50">
              {taskProject.name}
            </span>
          )}

          {isOverdue && (
            <span className="flex items-center gap-1 text-[11px] font-bold text-rose-600 dark:text-rose-400">
              <AlertTriangle size={12} /> Quá hạn
            </span>
          )}
        </div>

        <h3 className="text-sm font-bold text-gray-900 dark:text-white leading-tight">
          {task.title}
        </h3>

        {task.description && (
          <p className="text-xs text-gray-500 dark:text-slate-400 line-clamp-1">
            {task.description}
          </p>
        )}
      </div>

      <div className="flex items-center gap-4 flex-shrink-0">
        {totalSubtasks > 0 && (
          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-slate-400 font-medium">
            <CheckSquare size={14} className="text-emerald-600" />
            <span>{completedSubtasks}/{totalSubtasks}</span>
          </div>
        )}

        {task.dueDate && (
          <div className={`flex items-center gap-1 text-xs font-medium ${
            isOverdue ? 'text-rose-600 font-bold' : 'text-gray-500 dark:text-slate-400'
          }`}>
            <Calendar size={13} />
            <span>{task.dueDate}</span>
          </div>
        )}

        <div className="flex -space-x-2 overflow-hidden">
          {task.assignees && task.assignees.length > 0 ? (
            task.assignees.map(uid => {
              const u = users.find(userItem => userItem.id === uid);
              return (
                <img
                  key={uid}
                  src={u?.avatar || 'https://via.placeholder.com/32'}
                  alt={u?.name}
                  title={u?.name}
                  className="inline-block h-7 w-7 rounded-full ring-2 ring-white dark:ring-slate-800 object-cover"
                />
              );
            })
          ) : (
            <span className="text-xs text-gray-400 italic">Chưa giao</span>
          )}
        </div>
      </div>
    </div>
  );
}