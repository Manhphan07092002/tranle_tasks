import React, { useState, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, Filter, 
  Clock, CheckCircle2, AlertTriangle, Users, Plus, Flag
} from 'lucide-react';
import { Task, TaskStatus, TaskPriority } from '../../../types';
import { Button } from '../../../components/UI';

interface DepartmentCalendarTabProps {
  departmentId: string;
  currentDept: any;
  deptTasks: Task[];
  deptMembers: any[];
  events?: any[];
  onSelectTask: (task: Task) => void;
}

export const DepartmentCalendarTab: React.FC<DepartmentCalendarTabProps> = ({
  departmentId,
  currentDept,
  deptTasks,
  deptMembers,
  events = [],
  onSelectTask
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedMember, setSelectedMember] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'month' | 'agenda'>('month');

  // Month navigation
  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };
  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };
  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const monthYearStr = currentDate.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });

  // Filter tasks by member if selected
  const filteredTasks = useMemo(() => {
    if (selectedMember === 'all') return deptTasks;
    return deptTasks.filter(t => t.assignees?.includes(selectedMember));
  }, [deptTasks, selectedMember]);

  // Generate days in month matrix
  const daysMatrix = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const startingDayOfWeek = firstDay.getDay(); // 0 is Sunday
    const totalDays = lastDay.getDate();

    const days = [];
    
    // Fill blank days from previous month
    for (let i = 0; i < (startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1); i++) {
      days.push({ day: 0, dateStr: '', isCurrentMonth: false });
    }

    // Fill days of current month
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ day: d, dateStr, isCurrentMonth: true });
    }

    return days;
  }, [currentDate]);

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* 1. TOP CONTROLS BAR */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 rounded-xl">
            <CalendarIcon size={22} />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white capitalize">
              {monthYearStr}
            </h2>
            <p className="text-xs text-slate-400">
              Lịch công tác & Mốc thời hạn bàn giao phòng {currentDept?.name}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Member Filter Dropdown */}
          <div className="flex items-center gap-2">
            <Users size={14} className="text-slate-400" />
            <select
              value={selectedMember}
              onChange={(e) => setSelectedMember(e.target.value)}
              className="text-xs font-semibold px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-xl bg-gray-50 dark:bg-slate-700 text-slate-800 dark:text-white outline-none"
            >
              <option value="all">Tất cả nhân sự ({deptMembers.length})</option>
              {deptMembers.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          {/* View Mode Toggle */}
          <div className="flex bg-gray-100 dark:bg-slate-700 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'month' ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm' : 'text-slate-500'
              }`}
            >
              Theo Tháng
            </button>
            <button
              onClick={() => setViewMode('agenda')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'agenda' ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm' : 'text-slate-500'
              }`}
            >
              Danh Sách (Agenda)
            </button>
          </div>

          {/* Month Stepper Buttons */}
          <div className="flex items-center gap-1">
            <button onClick={prevMonth} className="p-2 border border-gray-200 dark:border-slate-700 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 text-slate-600 dark:text-white">
              <ChevronLeft size={16} />
            </button>
            <button onClick={goToToday} className="px-3 py-1.5 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-bold hover:bg-gray-50 dark:hover:bg-slate-700 text-slate-600 dark:text-white">
              Hôm nay
            </button>
            <button onClick={nextMonth} className="p-2 border border-gray-200 dark:border-slate-700 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 text-slate-600 dark:text-white">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* 2. CALENDAR MONTH VIEW */}
      {viewMode === 'month' && (
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
          
          {/* Day of Week Headers */}
          <div className="grid grid-cols-7 border-b border-gray-200 dark:border-slate-700 text-center text-xs font-bold text-slate-500 py-3 bg-gray-50/70 dark:bg-slate-800/80">
            <div>Thứ Hai</div>
            <div>Thứ Ba</div>
            <div>Thứ Tư</div>
            <div>Thứ Năm</div>
            <div>Thứ Sáu</div>
            <div className="text-amber-600">Thứ Bảy</div>
            <div className="text-rose-600">Chủ Nhật</div>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-gray-100 dark:divide-slate-700 min-h-[600px]">
            {daysMatrix.map((item, idx) => {
              if (!item.isCurrentMonth) {
                return <div key={`empty-${idx}`} className="bg-gray-50/30 dark:bg-slate-900/10 min-h-[100px]" />;
              }

              const isToday = item.dateStr === todayStr;
              const dayTasks = filteredTasks.filter(t => t.dueDate === item.dateStr || t.startDate === item.dateStr);
              const dayEvents = events.filter(e => e.startDate?.startsWith(item.dateStr));

              return (
                <div 
                  key={item.dateStr} 
                  className={`p-2 min-h-[110px] transition-colors flex flex-col justify-between ${
                    isToday ? 'bg-blue-50/40 dark:bg-blue-950/20' : 'hover:bg-gray-50/60 dark:hover:bg-slate-700/20'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${
                      isToday ? 'bg-blue-600 text-white' : 'text-slate-700 dark:text-slate-300'
                    }`}>
                      {item.day}
                    </span>
                    {dayTasks.length > 0 && (
                      <span className="text-[10px] text-slate-400 font-semibold">{dayTasks.length} task</span>
                    )}
                  </div>

                  {/* Tasks on this Day */}
                  <div className="space-y-1 overflow-y-auto max-h-[80px] custom-scrollbar">
                    {dayEvents.map(ev => (
                      <div key={ev.id} className="text-[10px] font-bold p-1 rounded bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 truncate">
                        ★ {ev.title}
                      </div>
                    ))}

                    {dayTasks.map(t => (
                      <div
                        key={t.id}
                        onClick={() => onSelectTask(t)}
                        className={`text-[10px] font-bold p-1 rounded cursor-pointer truncate transition-all ${
                          t.status === TaskStatus.DONE
                            ? 'bg-emerald-100 text-emerald-800 line-through opacity-75'
                            : t.priority === TaskPriority.URGENT
                            ? 'bg-rose-100 text-rose-800 border-l-2 border-l-rose-500'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {t.title}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* 3. AGENDA LIST VIEW */}
      {viewMode === 'agenda' && (
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-gray-200 dark:border-slate-700 shadow-sm p-6 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            Danh Sách Mốc Công Việc & Sự Kiện Sắp Tới
          </h3>

          <div className="space-y-3">
            {filteredTasks.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm">
                Không có sự kiện hoặc mốc deadline nào trong danh sách.
              </div>
            ) : (
              filteredTasks
                .slice()
                .sort((a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999'))
                .map(t => (
                  <div
                    key={t.id}
                    onClick={() => onSelectTask(t)}
                    className="p-4 rounded-2xl border border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-700/30 hover:border-blue-400 cursor-pointer transition-all flex items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          t.priority === TaskPriority.URGENT ? 'bg-rose-100 text-rose-700' :
                          t.priority === TaskPriority.HIGH ? 'bg-amber-100 text-amber-700' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {t.priority}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          t.status === TaskStatus.DONE ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {t.status}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">{t.title}</h4>
                      {t.description && <p className="text-xs text-slate-500 line-clamp-1">{t.description}</p>}
                    </div>

                    <div className="text-right flex-shrink-0">
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {t.dueDate || 'Không hạn'}
                      </div>
                      <div className="text-[11px] text-slate-400">Hạn bàn giao</div>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      )}

    </div>
  );
};
