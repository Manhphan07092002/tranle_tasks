import React, { useState, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { Task, DepartmentRequest, TaskTemplate, TaskStatus, TaskPriority } from '../../types';
import {
  Building2, Users, CheckCircle2, Clock, AlertTriangle, ArrowRightLeft,
  FileText, Sparkles, Plus, Search, Filter, Layers, ChevronRight,
  Calendar, CheckSquare, Send, PlayCircle, Eye, ExternalLink, ShieldCheck,
  BarChart3, UserCheck, Inbox, ArrowUpRight, ArrowDownLeft, HardHat, Package,
  PieChart
} from 'lucide-react';
import { Button } from '../../components/UI';
import { TaskModal } from '../../components/TaskModal';
import { DepartmentDomainView } from './DepartmentDomainView';
import { CrossDepartmentWorkflowTracker } from '../../components/workflow/CrossDepartmentWorkflowTracker';
import { useNavigate } from 'react-router-dom';
import {
  DepartmentDashboardTab,
  DepartmentCalendarTab,
  DepartmentDocsTab,
  DepartmentApprovalsTab,
  DepartmentReportsTab,
  DepartmentAuditTab
} from './tabs';

export default function DepartmentWorkspacePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const {
    departments, teams, users, tasks, projects,
    departmentRequests, taskTemplates,
    contracts, approvals, revenueReports, refreshData,
    saveDepartmentRequest, convertRequestToTask,
    instantiateTaskTemplate, saveTaskTemplate, saveTask
  } = useData();

  // Role Scope Check
  const isAdminOrDirector = user?.role === 'Admin' || user?.role === 'Director' || user?.permissions?.includes('admin_panel');
  const userDept = departments.find(d => d.id === user?.departmentId || d.name === user?.department);
  const allowedDepartments = isAdminOrDirector ? departments : (userDept ? [userDept] : departments);

  // Selected Department
  const [selectedDeptId, setSelectedDeptId] = useState<string>(userDept?.id || (departments[0]?.id || ''));
  const [activeTab, setActiveTab] = useState<'dashboard' | 'queue' | 'requests' | 'domain' | 'workflow' | 'calendar' | 'docs' | 'approvals' | 'reports' | 'kpi' | 'audit'>('domain');

  // Auto lock to user department if not Admin or Director
  React.useEffect(() => {
    if (!isAdminOrDirector && userDept?.id) {
      setSelectedDeptId(userDept.id);
    }
  }, [isAdminOrDirector, userDept?.id]);
  
  // Work Queue Filter
  const [queueFilter, setQueueFilter] = useState<'all' | 'my' | 'team' | 'unassigned' | 'today' | 'overdue' | 'blocked' | 'review'>('all');
  const [requestTab, setRequestTab] = useState<'incoming' | 'outgoing'>('incoming');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isNewRequestOpen, setIsNewRequestOpen] = useState(false);
  const [isNewTemplateOpen, setIsNewTemplateOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  // New Request Form State
  const [targetDeptId, setTargetDeptId] = useState('');
  const [reqTitle, setReqTitle] = useState('');
  const [reqDesc, setReqDesc] = useState('');
  const [reqPriority, setReqPriority] = useState<'Urgent' | 'High' | 'Medium' | 'Low'>('Medium');
  const [reqDueDate, setReqDueDate] = useState('');
  const [reqRelatedProj, setReqRelatedProj] = useState('');

  // Current selected department object
  const currentDept = departments.find(d => d.id === selectedDeptId) || departments[0];
  const deptTeams = teams.filter(t => t.departmentId === selectedDeptId);
  const deptMembers = users.filter(u => u.departmentId === selectedDeptId || u.department === currentDept?.name);

  // Department Tasks
  const deptTasks = tasks.filter(t => t.departmentId === selectedDeptId || t.department === currentDept?.name);

  // Work Queue Filtering
  const todayStr = new Date().toISOString().split('T')[0];
  const filteredQueueTasks = useMemo(() => {
    return deptTasks.filter(t => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = t.title.toLowerCase().includes(q);
        const matchDesc = t.description?.toLowerCase().includes(q);
        if (!matchTitle && !matchDesc) return false;
      }

      // Filter Tab
      switch (queueFilter) {
        case 'my':
          return t.assignees?.includes(user?.id || '');
        case 'team':
          return !!t.teamId && user?.teamId === t.teamId;
        case 'unassigned':
          return !t.assignees || t.assignees.length === 0;
        case 'today':
          return t.dueDate === todayStr || t.startDate === todayStr;
        case 'overdue':
          return t.dueDate && t.dueDate < todayStr && t.status !== TaskStatus.DONE;
        case 'blocked':
          return (t as any).isBlocked || t.tags?.includes('Blocked') || t.priority === TaskPriority.URGENT;
        case 'review':
          return t.requiresApproval || t.approvalStatus === 'pending';
        default:
          return true;
      }
    });
  }, [deptTasks, queueFilter, searchQuery, user?.id, user?.teamId, todayStr]);

  // Department Requests
  const incomingRequests = departmentRequests.filter(r => r.targetDepartmentId === selectedDeptId);
  const outgoingRequests = departmentRequests.filter(r => r.sourceDepartmentId === selectedDeptId);

  // Templates
  const deptTemplates = taskTemplates.filter(t => t.departmentId === selectedDeptId);

  // KPIs
  const totalTasks = deptTasks.length;
  const completedTasks = deptTasks.filter(t => t.status === TaskStatus.DONE).length;
  const overdueTasks = deptTasks.filter(t => t.dueDate && t.dueDate < todayStr && t.status !== TaskStatus.DONE).length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 100;

  // Handle Create Request
  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqTitle.trim() || !targetDeptId) return;
    await saveDepartmentRequest({
      sourceDepartmentId: selectedDeptId,
      targetDepartmentId: targetDeptId,
      requesterId: user?.id || 'u1',
      title: reqTitle.trim(),
      description: reqDesc,
      priority: reqPriority,
      dueDate: reqDueDate || undefined,
      relatedEntityType: reqRelatedProj ? 'project' : undefined,
      relatedEntityId: reqRelatedProj || undefined,
    });
    setIsNewRequestOpen(false);
    setReqTitle('');
    setReqDesc('');
    setTargetDeptId('');
    setReqDueDate('');
    setReqRelatedProj('');
  };

  // Handle Instantiate Template
  const handleInstantiate = async (tpl: TaskTemplate) => {
    await instantiateTemplate(tpl.id, {
      userId: user?.id,
      customTitle: `[${currentDept?.code || 'DEPT'}] ${tpl.title}`,
    });
  };

  const instantiateTemplate = async (templateId: string, options: any) => {
    try {
      await instantiateTaskTemplate(templateId, options);
      setActiveTab('queue');
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleConvert = async (reqId: string) => {
    await convertRequestToTask(reqId);
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Top Banner & Department Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white text-2xl shadow-md">
            {currentDept?.icon || '🏢'}
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

        {/* Department Switcher Dropdown */}
        <div className="flex items-center gap-3">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider hidden sm:inline">Phòng Ban:</label>
          {isAdminOrDirector ? (
            <select
              value={selectedDeptId}
              onChange={(e) => setSelectedDeptId(e.target.value)}
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

      {/* Overview Stat Cards */}
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
            <div className="text-2xl font-black text-gray-900 dark:text-white">{completionRate}%</div>
            <div className="text-xs text-gray-500 font-medium">Tỷ Lệ Hoàn Thành</div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 text-amber-600 rounded-xl">
            <ArrowRightLeft size={22} />
          </div>
          <div>
            <div className="text-2xl font-black text-gray-900 dark:text-white">{incomingRequests.length}</div>
            <div className="text-xs text-gray-500 font-medium">Phiếu Yêu Cầu Đến</div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-purple-50 dark:bg-purple-950/40 text-purple-600 rounded-xl">
            <Users size={22} />
          </div>
          <div>
            <div className="text-2xl font-black text-gray-900 dark:text-white">{deptMembers.length}</div>
            <div className="text-xs text-gray-500 font-medium">Thành Viên & {deptTeams.length} Nhóm</div>
          </div>
        </div>
      </div>

      {/* Quick Jump Shortcuts Bar */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="font-bold text-gray-500 uppercase tracking-wider">Truy Cập Nhanh:</span>
        <button
          onClick={() => navigate('/contracts')}
          className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 font-semibold hover:border-emerald-500 hover:text-emerald-600 transition-colors flex items-center gap-1 shadow-sm"
        >
          <FileText size={13} className="text-emerald-500" />
          <span>Hợp Đồng</span>
        </button>
        <button
          onClick={() => navigate('/projects')}
          className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 font-semibold hover:border-blue-500 hover:text-blue-600 transition-colors flex items-center gap-1 shadow-sm"
        >
          <HardHat size={13} className="text-blue-500" />
          <span>Dự Án EPC</span>
        </button>
        <button
          onClick={() => navigate('/products')}
          className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 font-semibold hover:border-amber-500 hover:text-amber-600 transition-colors flex items-center gap-1 shadow-sm"
        >
          <Package size={13} className="text-amber-500" />
          <span>Kho & Thiết Bị</span>
        </button>
        <button
          onClick={() => navigate('/approvals')}
          className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 font-semibold hover:border-purple-500 hover:text-purple-600 transition-colors flex items-center gap-1 shadow-sm"
        >
          <ShieldCheck size={13} className="text-purple-500" />
          <span>Trung Tâm Phê Duyệt</span>
        </button>
        <button
          onClick={() => navigate('/reports')}
          className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 font-semibold hover:border-cyan-500 hover:text-cyan-600 transition-colors flex items-center gap-1 shadow-sm"
        >
          <BarChart3 size={13} className="text-cyan-500" />
          <span>Báo Cáo Phòng</span>
        </button>
      </div>

      {/* Main Tabs Navigation (11 Modules) */}
      <div className="flex border-b border-gray-200 dark:border-slate-700 gap-1 overflow-x-auto custom-scrollbar">
        {[
          { id: 'dashboard', label: 'Tổng quan', icon: BarChart3, color: 'text-gray-500' },
          { id: 'queue', label: 'Công việc', icon: Inbox, badge: deptTasks.length, color: 'text-gray-500' },
          { id: 'requests', label: 'Yêu cầu', icon: ArrowRightLeft, badge: incomingRequests.filter(r => r.status === 'pending').length, color: 'text-amber-500' },
          { id: 'domain', label: 'Nghiệp vụ', icon: Layers, badge: 'Đặc thù', color: 'text-emerald-500' },
          { id: 'workflow', label: 'Quy trình', icon: Sparkles, color: 'text-purple-500' },
          { id: 'calendar', label: 'Lịch biểu', icon: Calendar, color: 'text-blue-500' },
          { id: 'docs', label: 'Tài liệu', icon: FileText, color: 'text-gray-500' },
          { id: 'approvals', label: 'Phê duyệt', icon: CheckCircle2, color: 'text-gray-500' },
          { id: 'reports', label: 'Báo cáo', icon: PieChart, color: 'text-gray-500' },
          { id: 'kpi', label: 'KPI', icon: BarChart3, color: 'text-gray-500' },
          { id: 'audit', label: 'Lịch sử', icon: Clock, color: 'text-gray-400' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold border-b-2 whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400'
                : 'border-transparent text-gray-500 hover:text-gray-800 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <tab.icon size={15} className={activeTab === tab.id ? 'text-emerald-600' : tab.color} />
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                activeTab === tab.id ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300'
              }`}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* TAB: DOMAIN BUSINESS MODULES */}
      {activeTab === 'domain' && (
        <DepartmentDomainView
          departmentId={selectedDeptId}
          departmentName={currentDept?.name || ''}
          departmentCode={currentDept?.code || ''}
        />
      )}

      {/* TAB 1: WORK QUEUE */}
      {activeTab === 'queue' && (
        <div className="space-y-4">
          {/* Filter Sub-nav & Search */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white dark:bg-slate-800 p-3 rounded-xl border border-gray-200 dark:border-slate-700">
            <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto">
              {[
                { id: 'all', label: 'Tất cả' },
                { id: 'my', label: 'Việc của tôi' },
                { id: 'team', label: 'Việc của Team' },
                { id: 'unassigned', label: 'Chưa phân công' },
                { id: 'today', label: 'Hôm nay' },
                { id: 'overdue', label: `Quá hạn (${overdueTasks})` },
                { id: 'blocked', label: 'Nghẽn / Khẩn' },
                { id: 'review', label: 'Chờ duyệt' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setQueueFilter(tab.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    queueFilter === tab.id
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
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

          {/* Task List in Work Queue */}
          <div className="space-y-2.5">
            {filteredQueueTasks.length === 0 ? (
              <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-gray-300 dark:border-slate-700">
                <CheckCircle2 size={42} className="mx-auto text-gray-300 dark:text-slate-600 mb-2" />
                <h3 className="text-sm font-bold text-gray-700 dark:text-slate-300">Không có công việc nào trong hàng đợi</h3>
                <p className="text-xs text-gray-400 mt-1">Các công việc thuộc bộ lọc này đã được hoàn tất hoặc chưa được tạo.</p>
              </div>
            ) : (
              filteredQueueTasks.map(task => {
                const isOverdue = task.dueDate && task.dueDate < todayStr && task.status !== TaskStatus.DONE;
                const completedSubtasks = task.subtasks?.filter(st => st.isCompleted).length || 0;
                const totalSubtasks = task.subtasks?.length || 0;
                const taskTeam = teams.find(t => t.id === task.teamId);
                const taskProject = projects.find(p => p.id === task.projectId);

                return (
                  <div
                    key={task.id}
                    onClick={() => { setSelectedTask(task); setIsTaskModalOpen(true); }}
                    className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-slate-700 hover:border-emerald-500 hover:shadow-md transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Status Badge */}
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                          task.status === TaskStatus.DONE
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : task.status === TaskStatus.IN_PROGRESS
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                            : 'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-300'
                        }`}>
                          {task.status}
                        </span>

                        {/* Priority Badge */}
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                          task.priority === TaskPriority.URGENT
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 animate-pulse'
                            : task.priority === TaskPriority.HIGH
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                        }`}>
                          {task.priority}
                        </span>

                        {/* Team Tag */}
                        {taskTeam && (
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/50">
                            {taskTeam.name}
                          </span>
                        )}

                        {/* Project Tag */}
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

                    {/* Right side info: Subtasks, Due Date, Assignees */}
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

                      {/* Assignees Avatars */}
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
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 2: CROSS-DEPARTMENT REQUESTS */}
      {activeTab === 'requests' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white dark:bg-slate-800 p-3 rounded-xl border border-gray-200 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setRequestTab('incoming')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  requestTab === 'incoming'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700'
                }`}
              >
                <ArrowDownLeft size={14} />
                <span>Yêu Cầu Nhận Về ({incomingRequests.length})</span>
              </button>

              <button
                onClick={() => setRequestTab('outgoing')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  requestTab === 'outgoing'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700'
                }`}
              >
                <ArrowUpRight size={14} />
                <span>Yêu Cầu Gửi Đi ({outgoingRequests.length})</span>
              </button>
            </div>

            <Button
              onClick={() => setIsNewRequestOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs flex items-center gap-1.5"
            >
              <Plus size={15} />
              <span>Tạo Phiếu Yêu Cầu Mới</span>
            </Button>
          </div>

          {/* Request Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(requestTab === 'incoming' ? incomingRequests : outgoingRequests).map(reqItem => {
              const otherDept = departments.find(d => d.id === (requestTab === 'incoming' ? reqItem.sourceDepartmentId : reqItem.targetDepartmentId));
              return (
                <div
                  key={reqItem.id}
                  className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-bold text-gray-500 bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded">
                        {reqItem.requestNumber}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        reqItem.status === 'completed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : reqItem.status === 'in_progress'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {reqItem.status}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                      {reqItem.title}
                    </h3>

                    {reqItem.description && (
                      <p className="text-xs text-gray-600 dark:text-slate-300 line-clamp-2">
                        {reqItem.description}
                      </p>
                    )}

                    <div className="flex items-center gap-2 text-xs text-gray-500 pt-1">
                      <span className="font-medium">
                        {requestTab === 'incoming' ? 'Từ:' : 'Gửi đến:'}
                      </span>
                      <span className="font-bold text-emerald-700 dark:text-emerald-400">
                        {otherDept?.name || 'Phòng ban liên quan'}
                      </span>
                    </div>
                  </div>

                  <div className="border-t border-gray-100 dark:border-slate-700 pt-3 flex items-center justify-between">
                    <div className="text-xs text-gray-400">
                      Hạn: {reqItem.dueDate || 'Không thời hạn'}
                    </div>

                    {requestTab === 'incoming' && reqItem.status === 'pending' && (
                      <Button
                        size="sm"
                        onClick={() => handleConvert(reqItem.id)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs flex items-center gap-1"
                      >
                        <PlayCircle size={14} />
                        <span>Tiếp Nhận & Tạo Task</span>
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: WORKFLOW */}
      {activeTab === 'workflow' && (
        <div className="space-y-4">
          <CrossDepartmentWorkflowTracker />
        </div>
      )}


      {/* TAB 4: KPI & WORKLOAD */}
      {activeTab === 'kpi' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Workload by Members */}
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
                          style={{ width: `${memberTasks.length > 0 ? (doneCount / memberTasks.length) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Performance Summary */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <BarChart3 size={16} className="text-emerald-600" />
                <span>Chỉ Số Hiệu Suất Vận Hành (KPI)</span>
              </h3>

              <div className="space-y-4 text-xs">
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl flex items-center justify-between">
                  <span className="font-semibold text-emerald-900 dark:text-emerald-200">Tỷ lệ công việc đúng hạn (SLA)</span>
                  <span className="text-lg font-black text-emerald-700 dark:text-emerald-400">
                    {totalTasks > 0 ? Math.round(((totalTasks - overdueTasks) / totalTasks) * 100) : 100}%
                  </span>
                </div>

                <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-xl flex items-center justify-between">
                  <span className="font-semibold text-blue-900 dark:text-blue-200">Thời gian phản hồi yêu cầu trung bình</span>
                  <span className="text-lg font-black text-blue-700 dark:text-blue-400">&lt; 4.5 Giờ</span>
                </div>

                <div className="p-4 bg-purple-50 dark:bg-purple-950/30 rounded-xl flex items-center justify-between">
                  <span className="font-semibold text-purple-900 dark:text-purple-200">Mẫu quy trình đã chuẩn hóa</span>
                  <span className="text-lg font-black text-purple-700 dark:text-purple-400">{deptTemplates.length} quy trình</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: DASHBOARD */}
      {activeTab === 'dashboard' && (
        <DepartmentDashboardTab
          departmentId={selectedDeptId}
          currentDept={currentDept}
          deptTasks={deptTasks}
          deptMembers={deptMembers}
          deptTeams={deptTeams}
          incomingRequests={incomingRequests}
          outgoingRequests={outgoingRequests}
          approvals={approvals}
          projects={projects}
          contracts={contracts}
          onSelectTask={(task) => { setSelectedTask(task); setIsTaskModalOpen(true); }}
          onNavigateTab={(tab) => setActiveTab(tab as any)}
          onCreateTask={() => setIsTaskModalOpen(true)}
          onCreateRequest={() => setIsNewRequestOpen(true)}
        />
      )}

      {/* TAB: CALENDAR */}
      {activeTab === 'calendar' && (
        <DepartmentCalendarTab
          departmentId={selectedDeptId}
          currentDept={currentDept}
          deptTasks={deptTasks}
          deptMembers={deptMembers}
          onSelectTask={(task) => { setSelectedTask(task); setIsTaskModalOpen(true); }}
        />
      )}

      {/* TAB: DOCS */}
      {activeTab === 'docs' && (
        <DepartmentDocsTab
          departmentId={selectedDeptId}
          currentDept={currentDept}
          deptMembers={deptMembers}
        />
      )}

      {/* TAB: APPROVALS */}
      {activeTab === 'approvals' && (
        <DepartmentApprovalsTab
          departmentId={selectedDeptId}
          currentDept={currentDept}
          deptMembers={deptMembers}
          approvals={approvals}
          onRefreshApprovals={refreshData}
        />
      )}

      {/* TAB: REPORTS */}
      {activeTab === 'reports' && (
        <DepartmentReportsTab
          departmentId={selectedDeptId}
          currentDept={currentDept}
          deptTasks={deptTasks}
          deptMembers={deptMembers}
          deptTeams={deptTeams}
          contracts={contracts}
          revenueReports={revenueReports}
        />
      )}

      {/* TAB: AUDIT */}
      {activeTab === 'audit' && (
        <DepartmentAuditTab
          departmentId={selectedDeptId}
          currentDept={currentDept}
          deptMembers={deptMembers}
        />
      )}

      {/* Modal: New Department Request */}
      {isNewRequestOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-200 dark:border-slate-700 animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center">
              <h3 className="text-base font-bold text-gray-900 dark:text-white">Tạo Phiếu Yêu Cầu Liên Phòng Ban</h3>
              <button onClick={() => setIsNewRequestOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <form onSubmit={handleCreateRequest} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Gửi Đến Phòng Ban *
                </label>
                <select
                  required
                  value={targetDeptId}
                  onChange={(e) => setTargetDeptId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">-- Chọn phòng ban nhận --</option>
                  {departments.filter(d => d.id !== selectedDeptId).map(d => (
                    <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Tiêu Đề Yêu Cầu *
                </label>
                <input
                  type="text"
                  required
                  value={reqTitle}
                  onChange={(e) => setReqTitle(e.target.value)}
                  placeholder="VD: Yêu cầu khảo sát PVSyst & báo giá dự án..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Nội Dung & Yêu Cầu Chi Tiết
                </label>
                <textarea
                  rows={3}
                  value={reqDesc}
                  onChange={(e) => setReqDesc(e.target.value)}
                  placeholder="Mô tả các yêu cầu kỹ thuật, tài liệu bàn giao, thông số..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 dark:text-slate-300 mb-1">Độ Ưu Tiên</label>
                  <select
                    value={reqPriority}
                    onChange={(e) => setReqPriority(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-gray-900 dark:text-white outline-none"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 dark:text-slate-300 mb-1">Hạn Bàn Giao</label>
                  <input
                    type="date"
                    value={reqDueDate}
                    onChange={(e) => setReqDueDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-gray-900 dark:text-white outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100 dark:border-slate-700">
                <Button type="button" variant="ghost" onClick={() => setIsNewRequestOpen(false)}>
                  Hủy
                </Button>
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  Gửi Yêu Cầu
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Modal for viewing/editing tasks */}
      {isTaskModalOpen && selectedTask && (
        <TaskModal
          isOpen={isTaskModalOpen}
          onClose={() => setIsTaskModalOpen(false)}
          onSave={async (updatedTask) => {
            await saveTask(updatedTask);
            setIsTaskModalOpen(false);
          }}
          initialTask={selectedTask}
          user={user!}
          allUsers={users}
        />
      )}
    </div>
  );
}
