import React, { useState, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { Button, Card, Avatar } from '../../components/UI';
import {
  Users, UserPlus, CheckCircle2, Clock, AlertTriangle, Briefcase,
  Search, Filter, Mail, Phone, MapPin, Calendar, Edit, Trash2,
  Shield, Award, ChevronRight, Layers, ArrowUpRight, Sparkles,
  Building2, UserCheck, Check, Plus, X, ArrowRight, ListTodo, User
} from 'lucide-react';
import { User as UserType, Team, Position, Task, TaskStatus, TaskPriority } from '../../types';
import { useData } from '../../contexts/DataContext';
import { UserProfilePopup } from '../../components/UserProfilePopup';

interface TeamPageProps {
  t: (key: string) => string;
  user: UserType;
  users: UserType[];
  openCreateUserModal: () => void;
  openEditUserModal: (u: UserType) => void;
  handleDeleteUser: (userId: string) => void;
}

export default function TeamPage({
  t, user, users, openCreateUserModal, openEditUserModal, handleDeleteUser
}: TeamPageProps) {
  const { roles, departments, teams, positions, tasks, saveTeam, deleteTask } = useData();
  const perms = user.permissions || [];
  const canViewTeam = perms.includes('view_dept_users') || perms.includes('manage_users');
  const canManageTeam = perms.includes('manage_users') || user.role === 'Admin' || user.role === 'Director';

  const [selectedDeptId, setSelectedDeptId] = useState<string>(user.departmentId || 'all');
  const [selectedTeamId, setSelectedTeamId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'members' | 'tasks' | 'overview'>('members');
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
  const [taskStatusFilter, setTaskStatusFilter] = useState<string>('all');

  // Edit Team Modal state
  const [editTeamModal, setEditTeamModal] = useState<{
    isOpen: boolean;
    team: Partial<Team> | null;
  }>({
    isOpen: false,
    team: null,
  });

  if (!canViewTeam) {
    return <Navigate to="/" replace />;
  }

  // Filter available teams by selected department
  const filteredTeams = useMemo(() => {
    if (selectedDeptId === 'all') return teams;
    return teams.filter(tm => tm.departmentId === selectedDeptId);
  }, [teams, selectedDeptId]);

  // Current active team object if selected
  const activeTeam = useMemo(() => {
    if (selectedTeamId === 'all') return null;
    return teams.find(tm => tm.id === selectedTeamId) || null;
  }, [teams, selectedTeamId]);

  // Department of the active team or selected department
  const activeDept = useMemo(() => {
    if (activeTeam) {
      return departments.find(d => d.id === activeTeam.departmentId) || null;
    }
    if (selectedDeptId !== 'all') {
      return departments.find(d => d.id === selectedDeptId) || null;
    }
    return null;
  }, [departments, activeTeam, selectedDeptId]);

  // Filtered members list
  const filteredMembers = useMemo(() => {
    return users.filter(u => {
      // Permission check: if not canManageTeam, restrict to own department
      if (!canManageTeam) {
        const isSameDept = (u.departmentId && u.departmentId === user.departmentId) || (u.department && u.department === user.department);
        if (!isSameDept) return false;
      }

      // Department filter
      if (selectedDeptId !== 'all') {
        const matchDept = (u.departmentId && u.departmentId === selectedDeptId) || (u.department && u.department === activeDept?.name);
        if (!matchDept) return false;
      }

      // Team filter
      if (selectedTeamId !== 'all') {
        if (u.teamId !== selectedTeamId) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const pos = positions.find(p => p.id === u.positionId)?.name?.toLowerCase() || '';
        const matchName = u.name.toLowerCase().includes(q);
        const matchEmail = u.email.toLowerCase().includes(q);
        const matchPhone = u.phone?.toLowerCase().includes(q) || false;
        const matchRole = u.role.toLowerCase().includes(q);
        const matchPos = pos.includes(q);
        if (!matchName && !matchEmail && !matchPhone && !matchRole && !matchPos) {
          return false;
        }
      }

      return true;
    });
  }, [users, user, canManageTeam, selectedDeptId, selectedTeamId, searchQuery, positions, activeDept]);

  // Team tasks
  const teamTasks = useMemo(() => {
    const memberIds = new Set(filteredMembers.map(m => m.id));
    return tasks.filter(t => {
      if (selectedTeamId !== 'all') {
        if (t.teamId === selectedTeamId) return true;
      }
      // Or assigned to any member of this team/filtered list
      const hasAssignee = t.assignees?.some(uid => memberIds.has(uid));
      if (hasAssignee) return true;
      if (selectedDeptId !== 'all' && t.departmentId === selectedDeptId) return true;
      return false;
    });
  }, [tasks, selectedTeamId, selectedDeptId, filteredMembers]);

  // Filtered team tasks
  const displayedTasks = useMemo(() => {
    return teamTasks.filter(t => {
      if (taskStatusFilter === 'all') return true;
      if (taskStatusFilter === 'todo') return (t.status as any) === TaskStatus.TODO || (t.status as any) === 'To Do' || (t.status as any) === 'todo';
      if (taskStatusFilter === 'in_progress') return (t.status as any) === TaskStatus.IN_PROGRESS || (t.status as any) === 'in_progress';
      if (taskStatusFilter === 'done') return (t.status as any) === TaskStatus.DONE || (t.status as any) === 'completed';
      return (t.status as any) === taskStatusFilter;
    });
  }, [teamTasks, taskStatusFilter]);

  // Team Metrics & KPI calculations
  const teamKpis = useMemo(() => {
    const totalMembers = filteredMembers.length;
    const totalTasks = teamTasks.length;
    const completedTasks = teamTasks.filter(t => (t.status as any) === TaskStatus.DONE || (t.status as any) === 'completed').length;
    const inProgressTasks = teamTasks.filter(t => (t.status as any) === TaskStatus.IN_PROGRESS || (t.status as any) === 'in_progress').length;
    const highPriorityTasks = teamTasks.filter(t => (t.priority as any) === TaskPriority.HIGH || (t.priority as any) === TaskPriority.URGENT || (t.priority as any) === 'high').length;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return {
      totalMembers,
      totalTasks,
      completedTasks,
      inProgressTasks,
      highPriorityTasks,
      completionRate
    };
  }, [filteredMembers, teamTasks]);

  // Team Leader
  const teamLeader = useMemo(() => {
    if (activeTeam?.managerId) {
      return users.find(u => u.id === activeTeam.managerId) || null;
    }
    // Fallback: look for user with manager position or manager role in this team
    return filteredMembers.find(m => m.role.toLowerCase().includes('manager') || m.role.toLowerCase().includes('trưởng')) || null;
  }, [activeTeam, users, filteredMembers]);

  const handleQuickMyTeam = () => {
    if (user.departmentId) setSelectedDeptId(user.departmentId);
    if (user.teamId) setSelectedTeamId(user.teamId);
  };

  const handleSaveTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTeamModal.team?.name || !editTeamModal.team?.departmentId) return;
    try {
      await saveTeam(editTeamModal.team as Team);
      setEditTeamModal({ isOpen: false, team: null });
    } catch (err: any) {
      alert('Lỗi lưu thông tin nhóm: ' + err.message);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* ── HEADER ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 p-6 rounded-2xl text-white shadow-xl">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-400">
              <Users size={26} />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                Không Gian Đội Nhóm
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium">
                  {teams.length} Nhóm chuyên môn
                </span>
              </h1>
              <p className="text-slate-300 text-sm mt-0.5">
                Quản trị cơ cấu nhân sự, phân bổ nhiệm vụ và giám sát năng lực thực thi
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {user.teamId && (
            <Button
              variant="outline"
              onClick={handleQuickMyTeam}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-sm text-sm"
            >
              <Sparkles size={16} className="mr-1.5 text-amber-400" /> Nhóm của tôi
            </Button>
          )}

          {canManageTeam && (
            <Button
              onClick={() => openCreateUserModal()}
              className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 text-sm font-semibold"
            >
              <UserPlus size={16} className="mr-1.5" /> Thêm Nhân Viên
            </Button>
          )}
        </div>
      </div>

      {/* ── FILTER & SWITCHER TOOLBAR ────────────────────────────────────────── */}
      <Card className="p-4 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm rounded-xl space-y-4">
        {/* Search & Department Selector */}
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Tìm kiếm theo tên, email, chức vụ, số điện thoại..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-slate-100"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <Building2 size={18} className="text-slate-400 hidden md:block" />
            <select
              value={selectedDeptId}
              onChange={(e) => {
                setSelectedDeptId(e.target.value);
                setSelectedTeamId('all');
              }}
              className="w-full md:w-64 px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">Tất cả Phòng Ban ({departments.length})</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Team Pills Carousel / Switcher */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Layers size={14} className="text-emerald-500" /> Chọn Nhóm chuyên môn ({filteredTeams.length}):
            </span>
            {selectedTeamId !== 'all' && (
              <button
                onClick={() => setSelectedTeamId('all')}
                className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold"
              >
                Xem tất cả nhóm
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              onClick={() => setSelectedTeamId('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                selectedTeamId === 'all'
                  ? 'bg-slate-900 text-white border-slate-900 shadow-sm dark:bg-emerald-600 dark:border-emerald-600'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
              }`}
            >
              Tất cả nhóm ({filteredMembers.length} nhân sự)
            </button>

            {filteredTeams.map(tm => {
              const isSelected = selectedTeamId === tm.id;
              const teamMemberCount = users.filter(u => u.teamId === tm.id).length;
              return (
                <button
                  key={tm.id}
                  onClick={() => setSelectedTeamId(tm.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                    isSelected
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20'
                      : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200 dark:bg-slate-800/80 dark:text-slate-300 dark:border-slate-700 hover:border-emerald-300'
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: tm.color || '#16a34a' }}
                  />
                  <span>{tm.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
                  }`}>
                    {teamMemberCount}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      {/* ── TEAM BANNER & KPI CARDS (If Active Team Selected) ─────────────────── */}
      {activeTeam && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Team Info Card */}
          <Card className="lg:col-span-2 p-6 border-slate-200 dark:border-slate-800 bg-gradient-to-br from-white via-slate-50/50 to-emerald-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800/80 rounded-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-bl-full pointer-events-none" />
            
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider text-white"
                    style={{ backgroundColor: activeTeam.color || '#16a34a' }}
                  >
                    {activeTeam.code || 'TEAM'}
                  </span>
                  {activeDept && (
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      {activeDept.name}
                    </span>
                  )}
                </div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                  {activeTeam.name}
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 max-w-xl">
                  {activeTeam.description || 'Chưa có mô tả chức năng nhiệm vụ cho nhóm này.'}
                </p>
              </div>

              {canManageTeam && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditTeamModal({ isOpen: true, team: activeTeam })}
                  className="self-start text-xs border-slate-300 dark:border-slate-700"
                >
                  <Edit size={14} className="mr-1 text-slate-500" /> Sửa Nhóm
                </Button>
              )}
            </div>

            {/* Team Leader Badge */}
            <div className="mt-6 pt-4 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Avatar
                    src={teamLeader?.avatar}
                    alt={teamLeader?.name || 'Leader'}
                    size={10}
                  />
                  <div className="absolute -bottom-1 -right-1 p-0.5 bg-amber-500 text-white rounded-full">
                    <Award size={10} />
                  </div>
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Trưởng Nhóm / Quản Lý</div>
                  <div className="text-sm font-bold text-slate-800 dark:text-white">
                    {teamLeader ? teamLeader.name : 'Chưa chỉ định trưởng nhóm'}
                  </div>
                  {teamLeader?.email && (
                    <div className="text-xs text-slate-500">{teamLeader.email}</div>
                  )}
                </div>
              </div>

              {teamLeader && (
                <button
                  onClick={() => setSelectedUser(teamLeader)}
                  className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                >
                  Xem hồ sơ <ChevronRight size={14} />
                </button>
              )}
            </div>
          </Card>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="p-4 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span className="text-xs font-medium">Thành viên</span>
                <Users size={16} className="text-emerald-500" />
              </div>
              <div className="mt-2">
                <div className="text-2xl font-black text-slate-900 dark:text-white">
                  {teamKpis.totalMembers}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">Nhân sự chính thức</div>
              </div>
            </Card>

            <Card className="p-4 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span className="text-xs font-medium">Tổng Công Việc</span>
                <ListTodo size={16} className="text-blue-500" />
              </div>
              <div className="mt-2">
                <div className="text-2xl font-black text-slate-900 dark:text-white">
                  {teamKpis.totalTasks}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">{teamKpis.inProgressTasks} đang thực hiện</div>
              </div>
            </Card>

            <Card className="p-4 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span className="text-xs font-medium">Tỷ lệ xong</span>
                <CheckCircle2 size={16} className="text-emerald-500" />
              </div>
              <div className="mt-2">
                <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                  {teamKpis.completionRate}%
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">{teamKpis.completedTasks}/{teamKpis.totalTasks} hoàn tất</div>
              </div>
            </Card>

            <Card className="p-4 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span className="text-xs font-medium">Ưu tiên cao</span>
                <AlertTriangle size={16} className="text-amber-500" />
              </div>
              <div className="mt-2">
                <div className="text-2xl font-black text-amber-500">
                  {teamKpis.highPriorityTasks}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">Cần chú ý tiến độ</div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ── SUB TABS ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('members')}
          className={`px-4 py-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'members'
              ? 'border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
          }`}
        >
          <Users size={16} />
          Danh sách Thành viên ({filteredMembers.length})
        </button>

        <button
          onClick={() => setActiveTab('tasks')}
          className={`px-4 py-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'tasks'
              ? 'border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
          }`}
        >
          <ListTodo size={16} />
          Hàng Đợi Công Việc Đội Nhóm ({teamTasks.length})
        </button>
      </div>

      {/* ── TAB CONTENT: MEMBERS ─────────────────────────────────────────────── */}
      {activeTab === 'members' && (
        <div>
          {filteredMembers.length === 0 ? (
            <Card className="p-12 text-center border-dashed border-2 border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 rounded-2xl">
              <Users size={48} className="mx-auto text-slate-400 mb-3 opacity-60" />
              <h3 className="text-base font-bold text-slate-700 dark:text-slate-200">Không tìm thấy thành viên nào</h3>
              <p className="text-sm text-slate-500 mt-1">Thử thay đổi bộ lọc hoặc thêm thành viên mới vào nhóm.</p>
              {canManageTeam && (
                <Button onClick={openCreateUserModal} className="mt-4 bg-emerald-600 text-white text-xs">
                  <UserPlus size={14} className="mr-1.5" /> Thêm Nhân Viên Ngay
                </Button>
              )}
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredMembers.map(u => {
                const positionObj = positions.find(p => p.id === u.positionId);
                const teamObj = teams.find(t => t.id === u.teamId);
                const roleObj = roles.find(r => r.name === u.role);
                const roleColor = roleObj?.color || '#3b82f6';
                const userActiveTasks = tasks.filter(t => 
                  t.assignees?.includes(u.id) &&
                  (t.status as any) !== TaskStatus.DONE && (t.status as any) !== 'completed'
                ).length;

                return (
                  <Card
                    key={u.id}
                    className="p-5 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 cursor-pointer relative group flex flex-col justify-between"
                    onClick={() => setSelectedUser(u)}
                  >
                    <div>
                      {/* Top row: Avatar + Name + Role */}
                      <div className="flex items-start gap-3.5">
                        <Avatar src={u.avatar} alt={u.name} size={12} />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-slate-900 dark:text-white text-base truncate group-hover:text-emerald-600 transition-colors">
                            {u.name}
                          </h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            {positionObj ? positionObj.name : u.department}
                          </p>

                          <div className="flex items-center gap-1.5 mt-2">
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border"
                              style={{ backgroundColor: roleColor + '15', color: roleColor, borderColor: roleColor + '30' }}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-current" />
                              {u.role}
                            </span>

                            {teamObj && (
                              <span
                                className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 truncate max-w-[130px]"
                              >
                                {teamObj.name}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Contact items */}
                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
                        <div className="flex items-center gap-2 truncate">
                          <Mail size={13} className="text-slate-400 shrink-0" />
                          <span className="truncate">{u.email}</span>
                        </div>
                        {u.phone && (
                          <div className="flex items-center gap-2">
                            <Phone size={13} className="text-slate-400 shrink-0" />
                            <span>{u.phone}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Footer: Task count badge & Quick Action */}
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                      <span className="inline-flex items-center gap-1 font-semibold text-slate-600 dark:text-slate-400">
                        <Briefcase size={13} className="text-emerald-500" />
                        <span>{userActiveTasks} việc đang làm</span>
                      </span>

                      <span className="text-emerald-600 font-bold group-hover:translate-x-1 transition-transform flex items-center gap-0.5">
                        Chi tiết <ChevronRight size={14} />
                      </span>
                    </div>

                    {/* Admin Actions popup */}
                    {canManageTeam && (
                      <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-slate-800 shadow-md rounded-lg p-1 border border-slate-200 dark:border-slate-700">
                        <button
                          onClick={(e) => { e.stopPropagation(); openEditUserModal(u); }}
                          className="p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md hover:text-emerald-600"
                          title="Sửa thông tin"
                        >
                          <Edit size={13} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteUser(u.id); }}
                          className="p-1.5 text-slate-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md hover:text-red-600"
                          title="Xóa nhân viên"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB CONTENT: TEAM TASKS ──────────────────────────────────────────── */}
      {activeTab === 'tasks' && (
        <div className="space-y-4">
          {/* Status Filter */}
          <div className="flex items-center gap-2">
            {[
              { id: 'all', label: 'Tất cả', count: teamTasks.length },
              { id: 'todo', label: 'Cần làm (To Do)', count: teamTasks.filter(t => (t.status as any) === TaskStatus.TODO || (t.status as any) === 'To Do').length },
              { id: 'in_progress', label: 'Đang làm (In Progress)', count: teamTasks.filter(t => (t.status as any) === TaskStatus.IN_PROGRESS).length },
              { id: 'done', label: 'Hoàn thành (Done)', count: teamTasks.filter(t => (t.status as any) === TaskStatus.DONE || (t.status as any) === 'completed').length },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setTaskStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                  taskStatusFilter === tab.id
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 hover:bg-slate-50'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>

          {displayedTasks.length === 0 ? (
            <Card className="p-12 text-center border-dashed border-2 border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 rounded-2xl">
              <CheckCircle2 size={48} className="mx-auto text-emerald-500 mb-3 opacity-60" />
              <h3 className="text-base font-bold text-slate-700 dark:text-slate-200">Không có công việc nào trong danh mục này</h3>
              <p className="text-sm text-slate-500 mt-1">Đội nhóm đã giải quyết toàn bộ nhiệm vụ hoặc chưa có nhiệm vụ mới được gán.</p>
            </Card>
          ) : (
            <div className="space-y-2.5">
              {displayedTasks.map(t => {
                const isDone = (t.status as any) === TaskStatus.DONE || (t.status as any) === 'completed';
                const isUrgent = (t.priority as any) === TaskPriority.HIGH || (t.priority as any) === TaskPriority.URGENT || (t.priority as any) === 'High';
                const assigneeUsers = users.filter(u => t.assignees?.includes(u.id));

                return (
                  <Card
                    key={t.id}
                    className={`p-4 border rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
                      isDone
                        ? 'bg-slate-50/70 border-slate-200 dark:bg-slate-900/40 dark:border-slate-800 opacity-80'
                        : 'bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-800 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-start gap-3.5 min-w-0">
                      <div className={`mt-0.5 p-2 rounded-lg ${
                        isDone
                          ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                          : isUrgent
                          ? 'bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}>
                        {isDone ? <CheckCircle2 size={18} /> : <Briefcase size={18} />}
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-sm font-bold ${isDone ? 'line-through text-slate-400' : 'text-slate-900 dark:text-white'}`}>
                            {t.title}
                          </span>

                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            t.priority === 'High' || t.priority === 'Urgent'
                              ? 'bg-red-50 text-red-600 border-red-200 dark:bg-red-950/30'
                              : t.priority === 'Medium'
                              ? 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/30'
                              : 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/30'
                          }`}>
                            {t.priority || 'Normal'}
                          </span>

                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold">
                            {t.status}
                          </span>
                        </div>

                        {t.description && (
                          <p className="text-xs text-slate-500 mt-1 line-clamp-1 max-w-2xl">
                            {t.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Right Info: Assignees + Due Date */}
                    <div className="flex items-center gap-4 shrink-0 self-end md:self-center">
                      {/* Assignee Avatars */}
                      <div className="flex -space-x-2 overflow-hidden">
                        {assigneeUsers.slice(0, 3).map(au => (
                          <Avatar
                            key={au.id}
                            src={au.avatar}
                            alt={au.name}
                            size={7}
                            className="border-2 border-white dark:border-slate-900"
                          />
                        ))}
                        {assigneeUsers.length > 3 && (
                          <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-bold flex items-center justify-center border-2 border-white dark:border-slate-900">
                            +{assigneeUsers.length - 3}
                          </div>
                        )}
                      </div>

                      {t.dueDate && (
                        <div className="flex items-center gap-1 text-xs text-slate-400">
                          <Calendar size={13} />
                          <span>{t.dueDate}</span>
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── USER PROFILE MODAL ───────────────────────────────────────────────── */}
      {selectedUser && (
        <UserProfilePopup
          user={user}
          selectedUser={selectedUser}
          roles={roles}
          onClose={() => setSelectedUser(null)}
        />
      )}

      {/* ── EDIT TEAM MODAL ──────────────────────────────────────────────────── */}
      {editTeamModal.isOpen && editTeamModal.team && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-lg bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-2xl space-y-4 border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Edit size={18} className="text-emerald-600" />
                Cập nhật thông tin Nhóm Chuyên Môn
              </h3>
              <button
                onClick={() => setEditTeamModal({ isOpen: false, team: null })}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveTeam} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Tên nhóm chuyên môn *
                </label>
                <input
                  type="text"
                  required
                  value={editTeamModal.team.name || ''}
                  onChange={(e) => setEditTeamModal({
                    ...editTeamModal,
                    team: { ...editTeamModal.team, name: e.target.value }
                  })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Mã nhóm (Code)
                  </label>
                  <input
                    type="text"
                    value={editTeamModal.team.code || ''}
                    onChange={(e) => setEditTeamModal({
                      ...editTeamModal,
                      team: { ...editTeamModal.team, code: e.target.value }
                    })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Màu đại diện
                  </label>
                  <input
                    type="color"
                    value={editTeamModal.team.color || '#16a34a'}
                    onChange={(e) => setEditTeamModal({
                      ...editTeamModal,
                      team: { ...editTeamModal.team, color: e.target.value }
                    })}
                    className="w-full h-9 p-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Trưởng nhóm (Team Leader)
                </label>
                <select
                  value={editTeamModal.team.managerId || ''}
                  onChange={(e) => setEditTeamModal({
                    ...editTeamModal,
                    team: { ...editTeamModal.team, managerId: e.target.value }
                  })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                >
                  <option value="">-- Chọn Trưởng Nhóm --</option>
                  {users
                    .filter(u => u.teamId === editTeamModal.team?.id || u.departmentId === editTeamModal.team?.departmentId)
                    .map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Mô tả chức năng nhiệm vụ
                </label>
                <textarea
                  rows={3}
                  value={editTeamModal.team.description || ''}
                  onChange={(e) => setEditTeamModal({
                    ...editTeamModal,
                    team: { ...editTeamModal.team, description: e.target.value }
                  })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  placeholder="Nhập mô tả hoạt động chính của đội nhóm..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditTeamModal({ isOpen: false, team: null })}
                >
                  Hủy
                </Button>
                <Button type="submit" className="bg-emerald-600 text-white">
                  Lưu Thay Đổi
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
