import React, { useState } from 'react';
import { 
  CheckSquare, Clock, AlertTriangle, AlertCircle, 
  MoreHorizontal, Play, CheckCircle2, User
} from 'lucide-react';

export const WorkQueue: React.FC = () => {
  const [filter, setFilter] = useState<'my_work' | 'team_work' | 'due_today' | 'blocked'>('my_work');

  const tasks = [
    { id: 'TSK-101', title: 'Thẩm định hồ sơ năng lực thầu', type: 'Review', status: 'To Do', priority: 'High', assignee: 'Nguyễn Văn A', due: 'Hôm nay' },
    { id: 'TSK-102', title: 'Hoàn thiện bản vẽ thiết kế mái nhà', type: 'Design', status: 'In Progress', priority: 'Medium', assignee: 'Lê Hoàng B', due: 'Ngày mai' },
    { id: 'TSK-103', title: 'Lên PO mua vật tư thi công', type: 'Procurement', status: 'Blocked', priority: 'High', assignee: 'Trần Thị C', due: 'Quá hạn 1 ngày' },
    { id: 'TSK-104', title: 'Báo cáo doanh thu quý 3', type: 'Report', status: 'Waiting', priority: 'Low', assignee: 'Nguyễn Văn A', due: 'Thứ 6' },
  ];

  const filteredTasks = tasks.filter(t => {
    if (filter === 'my_work') return t.assignee === 'Nguyễn Văn A';
    if (filter === 'blocked') return t.status === 'Blocked';
    if (filter === 'due_today') return t.due === 'Hôm nay' || t.due.includes('Quá hạn');
    return true; // team_work
  });

  return (
    <div className="bg-white dark:bg-slate-800 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col h-full">
      {/* Header & Filters */}
      <div className="p-5 border-b border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <CheckSquare className="text-emerald-500" size={20} />
          Hàng Đợi Công Việc (Work Queue)
        </h3>
        
        <div className="flex bg-gray-100 dark:bg-slate-900 p-1 rounded-xl w-fit">
          <button 
            onClick={() => setFilter('my_work')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === 'my_work' ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
          >
            My Work
          </button>
          <button 
            onClick={() => setFilter('team_work')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === 'team_work' ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
          >
            Team Work
          </button>
          <button 
            onClick={() => setFilter('due_today')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === 'due_today' ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
          >
            Due Today
          </button>
          <button 
            onClick={() => setFilter('blocked')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${filter === 'blocked' ? 'bg-white dark:bg-slate-700 text-rose-600 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
          >
            <AlertTriangle size={12} /> Blocked
          </button>
        </div>
      </div>

      {/* Task List */}
      <div className="divide-y divide-gray-100 dark:divide-slate-700 flex-1 overflow-y-auto">
        {filteredTasks.map(task => (
          <div key={task.id} className="p-4 hover:bg-gray-50 dark:hover:bg-slate-750/50 transition-colors flex items-center justify-between group cursor-pointer">
            <div className="flex items-start gap-4">
              <button className="mt-0.5 text-gray-300 hover:text-emerald-500 transition-colors">
                <CheckCircle2 size={20} />
              </button>
              <div>
                <h4 className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  {task.title}
                </h4>
                <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-gray-500 dark:text-slate-400">
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">{task.id}</span>
                  <span className="px-2 py-0.5 bg-gray-100 dark:bg-slate-700 rounded-md">{task.type}</span>
                  <span className={`flex items-center gap-1 ${task.due.includes('Quá hạn') ? 'text-rose-500 font-bold' : ''}`}>
                    <Clock size={12} /> {task.due}
                  </span>
                  <span className="flex items-center gap-1">
                    <User size={12} /> {task.assignee}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex flex-col items-end gap-1">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  task.priority === 'High' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30' : 
                  task.priority === 'Medium' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30' : 
                  'bg-gray-100 text-gray-600 dark:bg-slate-700'
                }`}>
                  {task.priority}
                </span>
                <span className={`text-[10px] font-bold uppercase tracking-wider ${
                  task.status === 'Blocked' ? 'text-rose-500' :
                  task.status === 'In Progress' ? 'text-blue-500' :
                  task.status === 'Waiting' ? 'text-amber-500' : 'text-gray-500'
                }`}>
                  {task.status}
                </span>
              </div>
              <button className="text-gray-400 hover:text-gray-900 dark:hover:text-white p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreHorizontal size={18} />
              </button>
            </div>
          </div>
        ))}
        {filteredTasks.length === 0 && (
          <div className="p-8 text-center text-gray-500 dark:text-slate-400 text-sm">
            Không có công việc nào trong thư mục này.
          </div>
        )}
      </div>
    </div>
  );
};
