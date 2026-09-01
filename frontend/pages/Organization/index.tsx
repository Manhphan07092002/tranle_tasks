import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Building2, Users, Network, Shield, Briefcase, Plus, Search,
  ChevronRight, ChevronDown, Phone, Mail, Award, CheckCircle2,
  FolderTree, UserCheck, Layers, ArrowRight, Settings2, Edit, Trash2, X
} from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { organizationService } from '../../services/organizationService';
import { Department, Team, Position, User } from '../../types';
import { Button, Card, Avatar } from '../../components/UI';
import { UserProfilePopup } from '../../components/UserProfilePopup';

type TabType = 'tree' | 'departments' | 'teams' | 'positions' | 'members';

export default function OrganizationPage() {
  const { user } = useAuth();
  const {
    departments, teams, positions, users, roles, projects, tasks,
    saveDepartment, deleteDepartment, saveTeam, deleteTeam, savePosition, deletePosition
  } = useData();

  const [activeTab, setActiveTab] = useState<TabType>('tree');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [expandedDepts, setExpandedDepts] = useState<Record<string, boolean>>({
    'dept-exec': true,
    'dept-sales': true,
    'dept-eng': true,
    'dept-epc': true,
    'dept-om': true,
  });

  // Modal states
  const [deptModal, setDeptModal] = useState<{ isOpen: boolean; dept: Partial<Department> | null }>({ isOpen: false, dept: null });
  const [teamModal, setTeamModal] = useState<{ isOpen: boolean; team: Partial<Team> | null }>({ isOpen: false, team: null });
  const [posModal, setPosModal] = useState<{ isOpen: boolean; pos: Partial<Position> | null }>({ isOpen: false, pos: null });

  const { data: treeData, isLoading: isTreeLoading } = useQuery({
    queryKey: ['organization', 'tree'],
    queryFn: () => organizationService.getTree(),
  });

  const { data: statsData } = useQuery({
    queryKey: ['organization', 'stats'],
    queryFn: () => organizationService.getStats(),
  });

  const canManage = user?.role === 'Admin' || user?.permissions?.includes('admin_panel') || user?.permissions?.includes('manage_users');

  const toggleDept = (deptId: string) => {
    setExpandedDepts(prev => ({ ...prev, [deptId]: !prev[deptId] }));
  };

  // Filtered users for directory
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchSearch =
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.department || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.phone || '').includes(searchQuery);
      const matchDept =
        selectedDeptFilter === 'all' ||
        u.departmentId === selectedDeptFilter ||
        (u.department && u.department === selectedDeptFilter);
      return matchSearch && matchDept;
    });
  }, [users, searchQuery, selectedDeptFilter]);

  // Filtered teams
  const filteredTeams = useMemo(() => {
    return teams.filter(t => {
      const matchDept = selectedDeptFilter === 'all' || t.departmentId === selectedDeptFilter;
      const matchSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) || (t.code || '').toLowerCase().includes(searchQuery.toLowerCase());
      return matchDept && matchSearch;
    });
  }, [teams, selectedDeptFilter, searchQuery]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 p-6 md:p-8 text-white shadow-xl">
        <div className="absolute -right-10 -bottom-10 opacity-10 pointer-events-none">
          <Building2 size={260} />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Tran Le Electricity
              </span>
              <span className="text-xs text-slate-300">Hệ thống Quản trị Tổ chức Doanh nghiệp</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
              Cơ Cấu Tổ Chức & Sơ Đồ Khối Phòng Ban
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-2xl">
              Mô hình quản trị 13 phòng ban chuyên môn, các nhóm kỹ thuật dự án solar, EPC, bảo hành ủy quyền SAJ Center và định danh chức danh nhân sự.
            </p>
          </div>
          {canManage && (
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => setDeptModal({ isOpen: true, dept: { color: '#16a34a', sortOrder: departments.length + 1 } })}
                className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md text-sm"
              >
                <Plus size={16} className="mr-1.5" /> Thêm Phòng Ban
              </Button>
              <Button
                onClick={() => setTeamModal({ isOpen: true, team: { color: '#16a34a' } })}
                variant="secondary"
                className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-sm"
              >
                <Plus size={16} className="mr-1.5" /> Thêm Nhóm / Team
              </Button>
            </div>
          )}
        </div>

        {/* Quick Stats Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-6 border-t border-slate-700/60">
          <div className="bg-white/5 rounded-xl p-3 backdrop-blur-sm">
            <div className="text-xs text-slate-300">Tổng Nhân Sự</div>
            <div className="text-xl font-bold text-white mt-0.5">{statsData?.totalUsers || users.length}</div>
          </div>
          <div className="bg-white/5 rounded-xl p-3 backdrop-blur-sm">
            <div className="text-xs text-slate-300">Phòng Ban Cốt Lõi</div>
            <div className="text-xl font-bold text-emerald-400 mt-0.5">{statsData?.totalDepartments || departments.length}</div>
          </div>
          <div className="bg-white/5 rounded-xl p-3 backdrop-blur-sm">
            <div className="text-xs text-slate-300">Nhóm Chuyên Môn</div>
            <div className="text-xl font-bold text-amber-400 mt-0.5">{statsData?.totalTeams || teams.length}</div>
          </div>
          <div className="bg-white/5 rounded-xl p-3 backdrop-blur-sm">
            <div className="text-xs text-slate-300">Chức Danh Vị Trí</div>
            <div className="text-xl font-bold text-sky-400 mt-0.5">{statsData?.totalPositions || positions.length}</div>
          </div>
          <div className="bg-white/5 rounded-xl p-3 backdrop-blur-sm">
            <div className="text-xs text-slate-300">Dự Án Đang Chạy</div>
            <div className="text-xl font-bold text-violet-400 mt-0.5">{statsData?.totalProjects || projects.length}</div>
          </div>
          <div className="bg-white/5 rounded-xl p-3 backdrop-blur-sm">
            <div className="text-xs text-slate-300">Nhiệm Vụ Đang Mở</div>
            <div className="text-xl font-bold text-rose-400 mt-0.5">{statsData?.totalTasks || tasks.length}</div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 dark:border-slate-700 pb-3">
        <div className="flex overflow-x-auto no-scrollbar gap-1 p-1 bg-gray-100 dark:bg-slate-800/80 rounded-xl">
          <button
            onClick={() => setActiveTab('tree')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'tree'
                ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-400 shadow-sm'
                : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <FolderTree size={16} />
            <span>Sơ Đồ Phân Cấp (Org Tree)</span>
          </button>
          <button
            onClick={() => setActiveTab('departments')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'departments'
                ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-400 shadow-sm'
                : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Building2 size={16} />
            <span>13 Phòng Ban ({departments.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('teams')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'teams'
                ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-400 shadow-sm'
                : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Layers size={16} />
            <span>Nhóm / Teams ({teams.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('positions')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'positions'
                ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-400 shadow-sm'
                : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Award size={16} />
            <span>Chức Danh ({positions.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('members')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'members'
                ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-400 shadow-sm'
                : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Users size={16} />
            <span>Danh Bạ Nhân Sự ({users.length})</span>
          </button>
        </div>

        {/* Filter controls */}
        {(activeTab === 'members' || activeTab === 'teams' || activeTab === 'departments') && (
          <div className="flex items-center gap-3">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Tìm kiếm nhanh..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm text-gray-800 dark:text-slate-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
            <select
              value={selectedDeptFilter}
              onChange={e => setSelectedDeptFilter(e.target.value)}
              className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            >
              <option value="all">Tất cả phòng ban</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* ─────────────────── TAB 1: ORG TREE ─────────────────── */}
      {activeTab === 'tree' && (
        <div className="space-y-6">
          {/* Company Root Node */}
          <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <Building2 size={32} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Công ty Cổ phần Tư vấn xây dựng Điện Trần Lê</h2>
                <p className="text-slate-400 text-sm">Tran Le Electricity • Kỷ niệm 10 năm thành lập (2015 – 2025)</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                    Trụ sở: 275–279 Diên Hồng, Cẩm Lệ, Đà Nẵng
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800/60">
                    Đối tác Ủy quyền SAJ Center (08/03/2026)
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-xs text-slate-400">Ban Lãnh Đạo</div>
                <div className="text-sm font-semibold text-white">Nguyễn Văn Duy (Director)</div>
              </div>
              <Avatar src="https://i.pravatar.cc/150?u=u4" alt="Director" size={10} />
            </div>
          </div>

          {/* Department Tree Nodes */}
          <div className="space-y-4">
            {departments.map((dept, index) => {
              const isExpanded = expandedDepts[dept.id] ?? false;
              const deptTeams = teams.filter(t => t.departmentId === dept.id);
              const deptMembers = users.filter(u => u.departmentId === dept.id || u.department === dept.name);
              const deptManager = dept.managerId ? users.find(u => u.id === dept.managerId) : null;

              return (
                <div
                  key={dept.id}
                  className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden transition-all"
                >
                  {/* Department Header Row */}
                  <div
                    onClick={() => toggleDept(dept.id)}
                    className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-gray-50/80 dark:hover:bg-slate-700/50 transition-colors"
                  >
                    <div className="flex items-center gap-3.5">
                      <button className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-slate-200">
                        {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                      </button>
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-sm flex-shrink-0"
                        style={{ backgroundColor: dept.color || '#16a34a' }}
                      >
                        {dept.code || index + 1}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-bold text-gray-900 dark:text-white">{dept.name}</h3>
                          {dept.code && (
                            <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300">
                              {dept.code}
                            </span>
                          )}
                        </div>
                        <p className="text-gray-500 dark:text-slate-400 text-xs mt-0.5 max-w-xl line-clamp-1">
                          {dept.description || 'Khối phòng ban chức năng thuộc Tran Le Electricity.'}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 self-end md:self-center pl-10 md:pl-0">
                      {deptManager && (
                        <div
                          onClick={e => { e.stopPropagation(); setSelectedUser(deptManager); }}
                          className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-gray-50 dark:bg-slate-700/60 border border-gray-200/60 dark:border-slate-600 text-xs hover:border-emerald-500"
                        >
                          <Avatar src={deptManager.avatar} alt={deptManager.name} size={6} />
                          <div className="text-left">
                            <div className="text-[10px] text-gray-400">Trưởng phòng</div>
                            <div className="font-semibold text-gray-800 dark:text-slate-200">{deptManager.name}</div>
                          </div>
                        </div>
                      )}
                      <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                        {deptMembers.length} nhân sự
                      </span>
                      <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                        {deptTeams.length} nhóm
                      </span>
                      {canManage && (
                        <button
                          onClick={e => { e.stopPropagation(); setDeptModal({ isOpen: true, dept }); }}
                          className="p-1.5 text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700"
                        >
                          <Edit size={16} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expanded Content: Teams & Members */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 dark:border-slate-700/80 bg-gray-50/50 dark:bg-slate-900/30 p-5 space-y-5">
                      {/* Teams Section */}
                      {deptTeams.length > 0 && (
                        <div>
                          <div className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <Layers size={14} className="text-emerald-600" />
                            <span>Các Nhóm Chuyên Môn Trực Thuộc ({deptTeams.length})</span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {deptTeams.map(team => {
                              const teamMembers = users.filter(u => u.teamId === team.id);
                              const teamLeader = team.managerId ? users.find(u => u.id === team.managerId) : null;

                              return (
                                <div
                                  key={team.id}
                                  className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200/80 dark:border-slate-700 shadow-sm relative group hover:border-emerald-500 transition-all"
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <span
                                          className="w-2.5 h-2.5 rounded-full"
                                          style={{ backgroundColor: team.color || '#16a34a' }}
                                        />
                                        <h4 className="font-bold text-sm text-gray-900 dark:text-white">{team.name}</h4>
                                      </div>
                                      {team.code && (
                                        <span className="text-[11px] font-mono text-gray-500 dark:text-slate-400 mt-0.5 block">
                                          Mã: {team.code}
                                        </span>
                                      )}
                                      <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 line-clamp-2">
                                        {team.description || 'Nhóm chuyên trách giải pháp năng lượng.'}
                                      </p>
                                    </div>
                                    {canManage && (
                                      <button
                                        onClick={() => setTeamModal({ isOpen: true, team })}
                                        className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-emerald-600 rounded transition-opacity"
                                      >
                                        <Edit size={14} />
                                      </button>
                                    )}
                                  </div>

                                  <div className="mt-3 pt-3 border-t border-gray-100 dark:border-slate-700 flex items-center justify-between text-xs">
                                    <div className="text-gray-500 dark:text-slate-400">
                                      Trưởng nhóm: <span className="font-medium text-gray-800 dark:text-slate-200">{teamLeader ? teamLeader.name : 'Chưa gán'}</span>
                                    </div>
                                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                      {teamMembers.length} thành viên
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Members List */}
                      <div>
                        <div className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                          <Users size={14} className="text-emerald-600" />
                          <span>Nhân Sự Phòng Ban ({deptMembers.length})</span>
                        </div>
                        {deptMembers.length === 0 ? (
                          <p className="text-xs text-gray-400 italic">Chưa có nhân sự được phân bổ vào phòng ban này.</p>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                            {deptMembers.map(m => {
                              const posObj = positions.find(p => p.id === m.positionId);
                              const teamObj = teams.find(t => t.id === m.teamId);

                              return (
                                <div
                                  key={m.id}
                                  onClick={() => setSelectedUser(m)}
                                  className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-gray-200/80 dark:border-slate-700 flex items-center gap-3 cursor-pointer hover:shadow-md hover:border-emerald-500 transition-all"
                                >
                                  <Avatar src={m.avatar} alt={m.name} size={10} />
                                  <div className="min-w-0 flex-1">
                                    <h5 className="font-bold text-xs text-gray-900 dark:text-white truncate">{m.name}</h5>
                                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 truncate">
                                      {posObj ? posObj.name : m.role}
                                    </p>
                                    <p className="text-[10px] text-gray-400 truncate">
                                      {teamObj ? teamObj.name : m.department}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─────────────────── TAB 2: DEPARTMENTS GRID ─────────────────── */}
      {activeTab === 'departments' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {departments
            .filter(d => d.name.toLowerCase().includes(searchQuery.toLowerCase()) || (d.code || '').toLowerCase().includes(searchQuery.toLowerCase()))
            .map((dept, index) => {
              const deptTeams = teams.filter(t => t.departmentId === dept.id);
              const deptMembers = users.filter(u => u.departmentId === dept.id || u.department === dept.name);
              const deptManager = dept.managerId ? users.find(u => u.id === dept.managerId) : null;
              const openTasksCount = tasks.filter(t => (t.departmentId === dept.id || t.department === dept.name) && t.status !== 'Done').length;
              const deptProjects = projects.filter(p => p.departmentId === dept.id || p.department === dept.name || p.id === dept.id);

              return (
                <Card
                  key={dept.id}
                  className="p-5 border border-gray-200/80 dark:border-slate-700/80 hover:shadow-lg transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-white text-base shadow-sm"
                          style={{ backgroundColor: dept.color || '#16a34a' }}
                        >
                          {dept.code || index + 1}
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900 dark:text-white text-base">{dept.name}</h3>
                          {dept.code && (
                            <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                              Mã: {dept.code}
                            </span>
                          )}
                        </div>
                      </div>
                      {canManage && (
                        <button
                          onClick={() => setDeptModal({ isOpen: true, dept })}
                          className="p-1.5 text-gray-400 hover:text-emerald-600 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700"
                        >
                          <Edit size={16} />
                        </button>
                      )}
                    </div>

                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-3 line-clamp-2">
                      {dept.description || 'Phòng ban chuyên môn Tran Le Electricity.'}
                    </p>

                    {/* Manager Row */}
                    <div className="mt-4 p-3 rounded-xl bg-gray-50 dark:bg-slate-700/40 border border-gray-100 dark:border-slate-700 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <Avatar src={deptManager?.avatar} alt={deptManager?.name || 'Trưởng phòng'} size={8} />
                        <div>
                          <div className="text-[10px] text-gray-400 uppercase font-semibold">Trưởng phòng phụ trách</div>
                          <div className="text-xs font-bold text-gray-800 dark:text-slate-200">
                            {deptManager ? deptManager.name : 'Chưa bổ nhiệm'}
                          </div>
                        </div>
                      </div>
                      {deptManager?.phone && (
                        <a href={`tel:${deptManager.phone}`} className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg">
                          <Phone size={14} />
                        </a>
                      )}
                    </div>

                    {/* Teams list tags */}
                    {deptTeams.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {deptTeams.map(t => (
                          <span
                            key={t.id}
                            className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                          >
                            {t.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Footer Metrics */}
                  <div className="mt-5 pt-3 border-t border-gray-100 dark:border-slate-700 flex items-center justify-between text-xs text-gray-500">
                    <div className="flex gap-3">
                      <span><strong>{deptMembers.length}</strong> nhân sự</span>
                      <span><strong>{deptTeams.length}</strong> nhóm</span>
                    </div>
                    <span className="text-amber-600 dark:text-amber-400 font-semibold">
                      {openTasksCount} việc đang mở
                    </span>
                  </div>
                </Card>
              );
            })}
        </div>
      )}

      {/* ─────────────────── TAB 3: TEAMS / SQUADS ─────────────────── */}
      {activeTab === 'teams' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredTeams.map(team => {
            const teamDept = departments.find(d => d.id === team.departmentId);
            const teamMembers = users.filter(u => u.teamId === team.id);
            const teamLeader = team.managerId ? users.find(u => u.id === team.managerId) : null;
            const teamTasks = tasks.filter(t => t.teamId === team.id);

            return (
              <Card key={team.id} className="p-5 border border-gray-200/80 dark:border-slate-700/80 hover:shadow-lg transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                        {teamDept?.name || 'Phòng Ban'}
                      </span>
                      <h3 className="font-bold text-gray-900 dark:text-white text-base mt-0.5">{team.name}</h3>
                      {team.code && (
                        <span className="text-xs font-mono text-gray-400">Mã: {team.code}</span>
                      )}
                    </div>
                    {canManage && (
                      <button
                        onClick={() => setTeamModal({ isOpen: true, team })}
                        className="p-1.5 text-gray-400 hover:text-emerald-600 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700"
                      >
                        <Edit size={16} />
                      </button>
                    )}
                  </div>

                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-2">
                    {team.description || 'Nhóm chuyên trách giải pháp năng lượng tái tạo.'}
                  </p>

                  <div className="mt-4 p-3 rounded-xl bg-gray-50 dark:bg-slate-700/40 border border-gray-100 dark:border-slate-700 flex items-center gap-3">
                    <Avatar src={teamLeader?.avatar} alt={teamLeader?.name || 'Leader'} size={8} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] text-gray-400 font-semibold uppercase">Trưởng nhóm (Team Leader)</div>
                      <div className="text-xs font-bold text-gray-800 dark:text-slate-200 truncate">
                        {teamLeader ? teamLeader.name : 'Chưa bổ nhiệm'}
                      </div>
                    </div>
                  </div>

                  {/* Member avatars */}
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex -space-x-2 overflow-hidden">
                      {teamMembers.slice(0, 5).map(m => (
                        <img
                          key={m.id}
                          src={m.avatar}
                          alt={m.name}
                          className="inline-block h-7 w-7 rounded-full ring-2 ring-white dark:ring-slate-800"
                        />
                      ))}
                      {teamMembers.length > 5 && (
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-200 dark:bg-slate-700 text-[10px] font-bold ring-2 ring-white dark:ring-slate-800">
                          +{teamMembers.length - 5}
                        </div>
                      )}
                    </div>
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      {teamMembers.length} thành viên
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 dark:border-slate-700 flex items-center justify-between text-xs text-gray-500">
                  <span>Màu sắc nhận diện</span>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: team.color || '#16a34a' }} />
                    <span className="font-mono text-[11px]">{team.color || '#16a34a'}</span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ─────────────────── TAB 4: POSITIONS TABLE ─────────────────── */}
      {activeTab === 'positions' && (
        <Card className="overflow-hidden border border-gray-200 dark:border-slate-700">
          <div className="p-4 bg-gray-50/70 dark:bg-slate-800/70 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
            <h3 className="font-bold text-sm text-gray-900 dark:text-white">
              Danh Mục Chức Danh & Vị Trí Công Việc ({positions.length})
            </h3>
            {canManage && (
              <Button
                onClick={() => setPosModal({ isOpen: true, pos: { level: 2, isManager: 0 } })}
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Plus size={14} className="mr-1" /> Thêm Chức Danh
              </Button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-100/60 dark:bg-slate-700/60 text-xs uppercase text-gray-500 dark:text-slate-400">
                <tr>
                  <th className="py-3 px-4">Mã & Tên Chức Danh</th>
                  <th className="py-3 px-4">Phòng Ban Trực Thuộc</th>
                  <th className="py-3 px-4">Cấp Bậc (Level)</th>
                  <th className="py-3 px-4">Vai Trò Quản Lý</th>
                  <th className="py-3 px-4">Số Nhân Sự</th>
                  {canManage && <th className="py-3 px-4 text-right">Thao Tác</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
                {positions.map(p => {
                  const deptObj = departments.find(d => d.id === p.departmentId);
                  const memberCount = users.filter(u => u.positionId === p.id).length;

                  return (
                    <tr key={p.id} className="hover:bg-gray-50/80 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="py-3 px-4 font-semibold text-gray-900 dark:text-white">
                        <div>{p.name}</div>
                        {p.code && <span className="text-xs font-mono text-gray-400">{p.code}</span>}
                      </td>
                      <td className="py-3 px-4 text-gray-600 dark:text-slate-300">
                        {deptObj ? (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium"
                            style={{ backgroundColor: `${deptObj.color}15`, color: deptObj.color }}
                          >
                            {deptObj.name}
                          </span>
                        ) : 'Toàn công ty'}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                          Level {p.level || 1}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {p.isManager ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 size={14} /> Quản lý (Manager)
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">Chuyên viên / Kỹ sư</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-bold text-gray-800 dark:text-slate-200">
                        {memberCount}
                      </td>
                      {canManage && (
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => setPosModal({ isOpen: true, pos: p })}
                            className="p-1.5 text-gray-400 hover:text-emerald-600 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700"
                          >
                            <Edit size={14} />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ─────────────────── TAB 5: STAFF DIRECTORY ─────────────────── */}
      {activeTab === 'members' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredUsers.map(u => {
            const posObj = positions.find(p => p.id === u.positionId);
            const teamObj = teams.find(t => t.id === u.teamId);
            const deptObj = departments.find(d => d.id === u.departmentId || d.name === u.department);
            const managerObj = u.managerId ? users.find(m => m.id === u.managerId) : null;

            return (
              <Card
                key={u.id}
                onClick={() => setSelectedUser(u)}
                className="p-5 border border-gray-200/80 dark:border-slate-700/80 hover:shadow-lg hover:border-emerald-500 cursor-pointer transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start gap-3.5">
                    <Avatar src={u.avatar} alt={u.name} size={12} />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-sm text-gray-900 dark:text-white truncate">{u.name}</h4>
                      <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 truncate">
                        {posObj ? posObj.name : u.role}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-slate-400 truncate mt-0.5">
                        {deptObj ? deptObj.name : u.department}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-1.5 text-xs text-gray-600 dark:text-slate-300">
                    {teamObj && (
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <Layers size={13} className="text-gray-400" />
                        <span className="truncate">Nhóm: <strong>{teamObj.name}</strong></span>
                      </div>
                    )}
                    {managerObj && (
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <UserCheck size={13} className="text-gray-400" />
                        <span className="truncate">Quản lý: <strong>{managerObj.name}</strong></span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <Mail size={13} className="text-gray-400" />
                      <span className="truncate">{u.email}</span>
                    </div>
                    {u.phone && (
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <Phone size={13} className="text-gray-400" />
                        <span className="truncate">{u.phone}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 dark:border-slate-700 flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400">
                    {u.role}
                  </span>
                  <span className="text-xs text-gray-400 hover:text-emerald-600 flex items-center gap-0.5">
                    Chi tiết <ChevronRight size={14} />
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* User Profile Popup */}
      {selectedUser && (
        <UserProfilePopup
          user={user as User}
          selectedUser={selectedUser}
          roles={roles}
          onClose={() => setSelectedUser(null)}
        />
      )}

      {/* ─────────────────── MODAL: DEPARTMENT ─────────────────── */}
      {deptModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 dark:border-slate-700">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-slate-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {deptModal.dept?.id ? 'Chỉnh Sửa Phòng Ban' : 'Thêm Phòng Ban Mới'}
              </h3>
              <button onClick={() => setDeptModal({ isOpen: false, dept: null })} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <form
              onSubmit={async e => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const formData = new FormData(form);
                await saveDepartment({
                  ...deptModal.dept,
                  name: formData.get('name') as string,
                  code: (formData.get('code') as string)?.toUpperCase(),
                  description: formData.get('description') as string,
                  color: formData.get('color') as string,
                  managerId: formData.get('managerId') as string || undefined,
                  sortOrder: Number(formData.get('sortOrder') || 0),
                });
                setDeptModal({ isOpen: false, dept: null });
              }}
              className="mt-4 space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">Tên phòng ban *</label>
                <input
                  name="name"
                  defaultValue={deptModal.dept?.name || ''}
                  required
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-sm"
                  placeholder="Ví dụ: Phòng Kinh Doanh"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">Mã viết tắt (Code)</label>
                  <input
                    name="code"
                    defaultValue={deptModal.dept?.code || ''}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-sm font-mono"
                    placeholder="VD: SALES, ENG"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">Màu sắc nhận diện</label>
                  <input
                    name="color"
                    type="color"
                    defaultValue={deptModal.dept?.color || '#16a34a'}
                    className="w-full h-10 p-1 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">Trưởng phòng phụ trách</label>
                <select
                  name="managerId"
                  defaultValue={deptModal.dept?.managerId || ''}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-sm"
                >
                  <option value="">-- Chưa bổ nhiệm --</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.role} - {u.department})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">Mô tả chức năng</label>
                <textarea
                  name="description"
                  defaultValue={deptModal.dept?.description || ''}
                  rows={3}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-sm"
                  placeholder="Mô tả phạm vi hoạt động của phòng ban..."
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-slate-700">
                <Button type="button" variant="ghost" onClick={() => setDeptModal({ isOpen: false, dept: null })}>
                  Hủy
                </Button>
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  Lưu Phòng Ban
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────── MODAL: TEAM ─────────────────── */}
      {teamModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 dark:border-slate-700">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-slate-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {teamModal.team?.id ? 'Chỉnh Sửa Nhóm / Team' : 'Thêm Nhóm Chuyên Môn Mới'}
              </h3>
              <button onClick={() => setTeamModal({ isOpen: false, team: null })} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <form
              onSubmit={async e => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const formData = new FormData(form);
                await saveTeam({
                  ...teamModal.team,
                  name: formData.get('name') as string,
                  code: (formData.get('code') as string)?.toUpperCase(),
                  departmentId: formData.get('departmentId') as string,
                  description: formData.get('description') as string,
                  color: formData.get('color') as string,
                  managerId: formData.get('managerId') as string || undefined,
                });
                setTeamModal({ isOpen: false, team: null });
              }}
              className="mt-4 space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">Phòng ban trực thuộc *</label>
                <select
                  name="departmentId"
                  defaultValue={teamModal.team?.departmentId || departments[0]?.id || ''}
                  required
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-sm"
                >
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">Tên nhóm / Team *</label>
                <input
                  name="name"
                  defaultValue={teamModal.team?.name || ''}
                  required
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-sm"
                  placeholder="VD: Nhóm Thiết Kế Solar & PVSyst"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">Mã Team (Code)</label>
                  <input
                    name="code"
                    defaultValue={teamModal.team?.code || ''}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-sm font-mono"
                    placeholder="VD: SOLAR_ENG"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">Màu sắc</label>
                  <input
                    name="color"
                    type="color"
                    defaultValue={teamModal.team?.color || '#16a34a'}
                    className="w-full h-10 p-1 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">Trưởng nhóm (Team Leader)</label>
                <select
                  name="managerId"
                  defaultValue={teamModal.team?.managerId || ''}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-sm"
                >
                  <option value="">-- Chưa bổ nhiệm --</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">Mô tả công việc</label>
                <textarea
                  name="description"
                  defaultValue={teamModal.team?.description || ''}
                  rows={2}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-sm"
                  placeholder="Mô tả nhiệm vụ trọng tâm..."
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-slate-700">
                <Button type="button" variant="ghost" onClick={() => setTeamModal({ isOpen: false, team: null })}>
                  Hủy
                </Button>
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  Lưu Nhóm
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────── MODAL: POSITION ─────────────────── */}
      {posModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 dark:border-slate-700">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-slate-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {posModal.pos?.id ? 'Chỉnh Sửa Chức Danh' : 'Thêm Chức Danh / Vị Trí Mới'}
              </h3>
              <button onClick={() => setPosModal({ isOpen: false, pos: null })} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <form
              onSubmit={async e => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const formData = new FormData(form);
                await savePosition({
                  ...posModal.pos,
                  name: formData.get('name') as string,
                  code: (formData.get('code') as string)?.toUpperCase(),
                  departmentId: formData.get('departmentId') as string || undefined,
                  level: Number(formData.get('level') || 1),
                  isManager: formData.get('isManager') === 'on' ? 1 : 0,
                  description: formData.get('description') as string,
                });
                setPosModal({ isOpen: false, pos: null });
              }}
              className="mt-4 space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">Tên chức danh / Vị trí *</label>
                <input
                  name="name"
                  defaultValue={posModal.pos?.name || ''}
                  required
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-sm"
                  placeholder="VD: Kỹ Sư Thiết Kế Solar & PVSyst"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">Mã (Code)</label>
                  <input
                    name="code"
                    defaultValue={posModal.pos?.code || ''}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-sm font-mono"
                    placeholder="VD: ENG_SOLAR"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">Cấp bậc (Level 1–5)</label>
                  <select
                    name="level"
                    defaultValue={posModal.pos?.level || 2}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-sm"
                  >
                    <option value="1">Level 1 - Thực tập / Nhân viên mới</option>
                    <option value="2">Level 2 - Chuyên viên / Kỹ sư chính</option>
                    <option value="3">Level 3 - Trưởng nhóm / Leader / PM</option>
                    <option value="4">Level 4 - Trưởng phòng / Giám đốc khối</option>
                    <option value="5">Level 5 - Ban Giám Đốc / HĐQT</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">Phòng ban</label>
                <select
                  name="departmentId"
                  defaultValue={posModal.pos?.departmentId || ''}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-sm"
                >
                  <option value="">-- Toàn công ty (Dùng chung) --</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isManagerCheckbox"
                  name="isManager"
                  defaultChecked={Boolean(posModal.pos?.isManager)}
                  className="w-4 h-4 text-emerald-600 rounded"
                />
                <label htmlFor="isManagerCheckbox" className="text-xs font-medium text-gray-700 dark:text-slate-300">
                  Đây là vị trí quản lý (Manager / Leader / Director)
                </label>
              </div>
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-slate-700">
                <Button type="button" variant="ghost" onClick={() => setPosModal({ isOpen: false, pos: null })}>
                  Hủy
                </Button>
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  Lưu Chức Danh
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
