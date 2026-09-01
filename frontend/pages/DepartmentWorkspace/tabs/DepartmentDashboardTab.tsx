import React, { useMemo } from 'react';
import { 
  Users, CheckCircle2, Clock, AlertTriangle, ArrowRightLeft, 
  Layers, BarChart3, TrendingUp, ShieldCheck, FileText, 
  Briefcase, Plus, ArrowRight, Zap, Target, PieChart
} from 'lucide-react';
import { 
  PieChart as RePieChart, Pie, Cell, ResponsiveContainer, Tooltip, 
  BarChart as ReBarChart, Bar, XAxis, YAxis, CartesianGrid, Legend 
} from 'recharts';
import { Task, DepartmentRequest, TaskStatus, TaskPriority } from '../../../types';
import { Button } from '../../../components/UI';

interface DepartmentDashboardTabProps {
  departmentId: string;
  currentDept: any;
  deptTasks: Task[];
  deptMembers: any[];
  deptTeams: any[];
  incomingRequests: DepartmentRequest[];
  outgoingRequests: DepartmentRequest[];
  approvals: any[];
  projects: any[];
  contracts: any[];
  onSelectTask: (task: Task) => void;
  onNavigateTab: (tab: string) => void;
  onCreateTask?: () => void;
  onCreateRequest?: () => void;
}

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6'];

export const DepartmentDashboardTab: React.FC<DepartmentDashboardTabProps> = ({
  departmentId,
  currentDept,
  deptTasks,
  deptMembers,
  deptTeams,
  incomingRequests,
  outgoingRequests,
  approvals,
  projects,
  contracts,
  onSelectTask,
  onNavigateTab,
  onCreateTask,
  onCreateRequest
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  // Calculations
  const totalTasks = deptTasks.length;
  const doneTasks = deptTasks.filter(t => t.status === TaskStatus.DONE).length;
  const inProgressTasks = deptTasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length;
  const todoTasks = deptTasks.filter(t => t.status === TaskStatus.TODO).length;
  const overdueTasks = deptTasks.filter(t => t.dueDate && t.dueDate < todayStr && t.status !== TaskStatus.DONE).length;
  const urgentTasks = deptTasks.filter(t => t.priority === TaskPriority.URGENT && t.status !== TaskStatus.DONE).length;

  const completionRate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  // Status Distribution Data
  const statusData = useMemo(() => [
    { name: 'Hoàn thành', value: doneTasks, color: '#10B981' },
    { name: 'Đang làm', value: inProgressTasks, color: '#3B82F6' },
    { name: 'Chờ xử lý', value: todoTasks, color: '#94A3B8' },
  ].filter(d => d.value > 0), [doneTasks, inProgressTasks, todoTasks]);

  // Priority Distribution Data
  const priorityData = useMemo(() => [
    { name: 'Khẩn cấp', count: deptTasks.filter(t => t.priority === TaskPriority.URGENT).length },
    { name: 'Cao', count: deptTasks.filter(t => t.priority === TaskPriority.HIGH).length },
    { name: 'Trung bình', count: deptTasks.filter(t => t.priority === TaskPriority.MEDIUM).length },
    { name: 'Thấp', count: deptTasks.filter(t => t.priority === TaskPriority.LOW).length },
  ], [deptTasks]);

  // Team Workload Data
  const teamWorkload = useMemo(() => {
    return deptTeams.map(team => {
      const teamTasks = deptTasks.filter(t => t.teamId === team.id);
      const teamDone = teamTasks.filter(t => t.status === TaskStatus.DONE).length;
      return {
        name: team.name.replace('Đội ', '').replace('Nhóm ', ''),
        total: teamTasks.length,
        done: teamDone,
        open: teamTasks.length - teamDone
      };
    });
  }, [deptTeams, deptTasks]);

  // Top Urgent & Focus Tasks
  const focusTasks = useMemo(() => {
    return deptTasks
      .filter(t => t.status !== TaskStatus.DONE)
      .sort((a, b) => {
        if (a.priority === TaskPriority.URGENT && b.priority !== TaskPriority.URGENT) return -1;
        if (b.priority === TaskPriority.URGENT && a.priority !== TaskPriority.URGENT) return 1;
        return (a.dueDate || '9999') > (b.dueDate || '9999') ? 1 : -1;
      })
      .slice(0, 5);
  }, [deptTasks]);

  // Department Related Projects
  const deptProjects = useMemo(() => {
    return projects.filter(p => 
      p.department === currentDept?.name || 
      p.department === currentDept?.code || 
      p.departmentId === departmentId
    );
  }, [projects, currentDept, departmentId]);

  // Department Pending Approvals
  const deptApprovals = useMemo(() => {
    return approvals.filter(a => a.departmentId === departmentId || a.status === 'pending');
  }, [approvals, departmentId]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* 1. TOP METRIC SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Card 1: Completion Progress */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between text-gray-500 mb-3 relative z-10">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Tiến Độ Nhiệm Vụ</span>
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 rounded-xl">
              <Target size={20} />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-800 dark:text-white relative z-10">
            {completionRate}%
          </div>
          <div className="w-full bg-gray-100 dark:bg-slate-700 h-2 rounded-full mt-3 overflow-hidden">
            <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${completionRate}%` }} />
          </div>
          <div className="text-xs text-slate-400 font-medium mt-2 flex justify-between relative z-10">
            <span>{doneTasks} đã xong</span>
            <span>{totalTasks - doneTasks} còn lại</span>
          </div>
        </div>

        {/* Card 2: Work Queue Load */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between text-gray-500 mb-3 relative z-10">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Tổng Công Việc</span>
            <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 rounded-xl">
              <Layers size={20} />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-800 dark:text-white relative z-10">
            {totalTasks} <span className="text-sm font-medium text-slate-400">task</span>
          </div>
          <div className="text-xs text-slate-400 font-medium mt-3 flex items-center gap-2 relative z-10">
            <span className="inline-block w-2 h-2 rounded-full bg-blue-500" />
            <span>{inProgressTasks} đang tiến hành</span>
            <span className="inline-block w-2 h-2 rounded-full bg-slate-300 ml-2" />
            <span>{todoTasks} chờ làm</span>
          </div>
        </div>

        {/* Card 3: Urgent & Overdue Alerts */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between text-gray-500 mb-3 relative z-10">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Cần Chú Ý Gấp</span>
            <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 text-rose-600 rounded-xl">
              <AlertTriangle size={20} />
            </div>
          </div>
          <div className="text-3xl font-black text-rose-600 dark:text-rose-400 relative z-10">
            {urgentTasks + overdueTasks} <span className="text-sm font-medium text-slate-400">vấn đề</span>
          </div>
          <div className="text-xs text-rose-500/80 font-medium mt-3 flex items-center gap-2 relative z-10">
            <span>{urgentTasks} việc khẩn cấp</span>
            <span>•</span>
            <span>{overdueTasks} quá hạn</span>
          </div>
        </div>

        {/* Card 4: Team & Personnel */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between text-gray-500 mb-3 relative z-10">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Nhân Sự Phòng Ban</span>
            <div className="p-2.5 bg-purple-50 dark:bg-purple-950/40 text-purple-600 rounded-xl">
              <Users size={20} />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-800 dark:text-white relative z-10">
            {deptMembers.length} <span className="text-sm font-medium text-slate-400">nhân sự</span>
          </div>
          <div className="text-xs text-slate-400 font-medium mt-3 flex items-center gap-2 relative z-10">
            <span>Phân bổ trong {deptTeams.length} tổ / nhóm chức năng</span>
          </div>
        </div>

      </div>

      {/* 2. CHARTS & VISUALIZATIONS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Status Distribution Donut Chart */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2 mb-4">
              <PieChart size={16} className="text-emerald-500" />
              <span>Phân Bổ Trạng Thái Công Việc</span>
            </h3>
            {statusData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-slate-400 text-xs">
                Chưa có dữ liệu công việc
              </div>
            ) : (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <RePieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RePieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
          <div className="flex justify-center gap-4 text-xs font-semibold pt-4 border-t border-gray-100 dark:border-slate-700">
            <span className="flex items-center gap-1.5 text-emerald-600"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"/> Đã xong ({doneTasks})</span>
            <span className="flex items-center gap-1.5 text-blue-600"><span className="w-2.5 h-2.5 rounded-full bg-blue-500"/> Đang làm ({inProgressTasks})</span>
            <span className="flex items-center gap-1.5 text-slate-400"><span className="w-2.5 h-2.5 rounded-full bg-slate-400"/> Chờ làm ({todoTasks})</span>
          </div>
        </div>

        {/* Priority Breakdown Bar Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <BarChart3 size={16} className="text-blue-500" />
              <span>Phân Bổ Mức Độ Ưu Tiên</span>
            </h3>
            <span className="text-xs text-slate-400 font-medium">Theo phòng ban {currentDept?.name}</span>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <ReBarChart data={priorityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#3B82F6" radius={[6, 6, 0, 0]} />
              </ReBarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* 3. FOCUS TASKS & COLLABORATION ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Focus Tasks Widget */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Zap size={16} className="text-amber-500" />
              <span>Nhiệm Vụ Trọng Tâm Cần Xử Lý</span>
            </h3>
            <button 
              onClick={() => onNavigateTab('queue')}
              className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
            >
              Xem tất cả <ArrowRight size={13} />
            </button>
          </div>

          <div className="space-y-3">
            {focusTasks.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                Tuyệt vời! Không có nhiệm vụ tồn đọng hoặc khẩn cấp cần xử lý ngay.
              </div>
            ) : (
              focusTasks.map(task => (
                <div 
                  key={task.id}
                  onClick={() => onSelectTask(task)}
                  className="p-3.5 bg-gray-50 dark:bg-slate-700/40 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 border border-gray-100 dark:border-slate-700 rounded-2xl cursor-pointer transition-all flex items-center justify-between gap-3 group"
                >
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        task.priority === TaskPriority.URGENT ? 'bg-rose-100 text-rose-700' :
                        task.priority === TaskPriority.HIGH ? 'bg-amber-100 text-amber-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {task.priority}
                      </span>
                      <span className="text-xs text-slate-400">{task.dueDate || 'Không hạn'}</span>
                    </div>
                    <div className="text-xs font-bold text-slate-800 dark:text-white truncate group-hover:text-emerald-600 transition-colors">
                      {task.title}
                    </div>
                  </div>
                  <ArrowRight size={14} className="text-slate-400 group-hover:text-emerald-600 transition-transform group-hover:translate-x-1" />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Cross-Department Requests & Approvals Widget */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <ArrowRightLeft size={16} className="text-purple-500" />
              <span>Yêu Cầu Liên Phòng Ban Đang Chờ</span>
            </h3>
            <button 
              onClick={() => onNavigateTab('requests')}
              className="text-xs font-bold text-purple-600 hover:text-purple-700 flex items-center gap-1"
            >
              Hàng đợi <ArrowRight size={13} />
            </button>
          </div>

          <div className="space-y-3">
            {incomingRequests.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                Chưa có yêu cầu phối hợp nào từ các phòng ban khác gửi đến.
              </div>
            ) : (
              incomingRequests.slice(0, 5).map(req => (
                <div 
                  key={req.id}
                  className="p-3.5 bg-gray-50 dark:bg-slate-700/40 border border-gray-100 dark:border-slate-700 rounded-2xl flex items-center justify-between gap-3"
                >
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-bold bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded">
                        {req.requestNumber}
                      </span>
                      <span className="text-xs font-bold text-slate-800 dark:text-white truncate">
                        {req.title}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">
                      {req.description || 'Không có mô tả thêm'}
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    req.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                    req.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {req.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
