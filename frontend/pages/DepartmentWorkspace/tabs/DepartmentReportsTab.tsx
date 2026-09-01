import React, { useState, useMemo } from 'react';
import { 
  BarChart3, Download, TrendingUp, Calendar, Users, 
  CheckCircle2, Clock, Award, FileSpreadsheet, Sparkles
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, LineChart, Line 
} from 'recharts';
import * as XLSX from 'xlsx';
import { Button } from '../../../components/UI';
import { Task, TaskStatus, TaskPriority } from '../../../types';

interface DepartmentReportsTabProps {
  departmentId: string;
  currentDept: any;
  deptTasks: Task[];
  deptMembers: any[];
  deptTeams: any[];
  contracts?: any[];
  revenueReports?: any[];
}

export const DepartmentReportsTab: React.FC<DepartmentReportsTabProps> = ({
  departmentId,
  currentDept,
  deptTasks,
  deptMembers,
  deptTeams,
  contracts = [],
  revenueReports = []
}) => {
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter' | 'year'>('month');

  const todayStr = new Date().toISOString().split('T')[0];
  const totalTasks = deptTasks.length;
  const doneTasks = deptTasks.filter(t => t.status === TaskStatus.DONE).length;
  const overdueTasks = deptTasks.filter(t => t.dueDate && t.dueDate < todayStr && t.status !== TaskStatus.DONE).length;
  const slaRate = totalTasks > 0 ? Math.round(((totalTasks - overdueTasks) / totalTasks) * 100) : 100;

  // Member Performance Leaderboard
  const memberPerformance = useMemo(() => {
    return deptMembers.map(member => {
      const assigned = deptTasks.filter(t => t.assignees?.includes(member.id));
      const completed = assigned.filter(t => t.status === TaskStatus.DONE).length;
      const overdue = assigned.filter(t => t.dueDate && t.dueDate < todayStr && t.status !== TaskStatus.DONE).length;
      const rate = assigned.length > 0 ? Math.round((completed / assigned.length) * 100) : 100;

      return {
        id: member.id,
        name: member.name,
        role: member.role,
        avatar: member.avatar,
        assignedCount: assigned.length,
        completedCount: completed,
        overdueCount: overdue,
        completionRate: rate
      };
    }).sort((a, b) => b.completedCount - a.completedCount);
  }, [deptMembers, deptTasks, todayStr]);

  // Productivity by Team
  const teamChartData = useMemo(() => {
    return deptTeams.map(team => {
      const teamTasks = deptTasks.filter(t => t.teamId === team.id);
      const teamDone = teamTasks.filter(t => t.status === TaskStatus.DONE).length;
      return {
        name: team.name.replace('Đội ', '').replace('Nhóm ', ''),
        'Đã xong': teamDone,
        'Đang làm': teamTasks.length - teamDone
      };
    });
  }, [deptTeams, deptTasks]);

  // Export Excel Handler
  const handleExportExcel = () => {
    const dataToExport = memberPerformance.map((m, idx) => ({
      'STT': idx + 1,
      'Họ Và Tên': m.name,
      'Chức Vụ': m.role,
      'Phòng Ban': currentDept?.name || '',
      'Tổng Việc Giao': m.assignedCount,
      'Đã Hoàn Thành': m.completedCount,
      'Quá Hạn': m.overdueCount,
      'Tỷ Lệ Hoàn Thành (%)': `${m.completionRate}%`
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `BaoCao_${currentDept?.code || 'DEPT'}`);
    XLSX.writeFile(wb, `Bao_Cao_Hieu_Suat_${currentDept?.code || 'DEPT'}_${todayStr}.xlsx`);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* 1. TOP HEADER & EXPORT ACTION */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-gray-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 rounded-2xl">
            <BarChart3 size={24} />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Báo Cáo Hiệu Suất & Vận Hành — Phòng {currentDept?.name}
            </h2>
            <p className="text-xs text-slate-400">
              Tổng hợp năng suất làm việc, tỷ lệ tuân thủ hạn cam kết (SLA) và đóng góp của từng nhóm chuyên trách.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={handleExportExcel}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-sm"
          >
            <FileSpreadsheet size={16} /> Xuất Báo Cáo Excel
          </Button>
        </div>
      </div>

      {/* 2. STAT CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Tỷ Lệ Đạt SLA Đúng Hạn</span>
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 rounded-xl">
              <CheckCircle2 size={20} />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-800 dark:text-white">
            {slaRate}%
          </div>
          <div className="text-xs text-emerald-600 font-bold mt-2">
            {overdueTasks === 0 ? 'Tuyệt đối 100% đúng hạn' : `${overdueTasks} công việc trễ deadline`}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Tổng Số Nhiệm Vụ Đã Xử Lý</span>
            <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 rounded-xl">
              <TrendingUp size={20} />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-800 dark:text-white">
            {doneTasks} <span className="text-sm font-medium text-slate-400">/ {totalTasks} task</span>
          </div>
          <div className="text-xs text-slate-400 font-medium mt-2">
            Đạt tỷ lệ hoàn tất {totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0}%
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Quy Mô Đội Ngũ</span>
            <div className="p-2.5 bg-purple-50 dark:bg-purple-950/40 text-purple-600 rounded-xl">
              <Users size={20} />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-800 dark:text-white">
            {deptMembers.length} <span className="text-sm font-medium text-slate-400">thành viên</span>
          </div>
          <div className="text-xs text-slate-400 font-medium mt-2">
            Phụ trách {deptTeams.length} nhóm nghiệp vụ
          </div>
        </div>
      </div>

      {/* 3. CHARTS */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
          <BarChart3 size={16} className="text-cyan-500" />
          <span>Sản Lượng Hoàn Thành Theo Nhóm Nghiệp Vụ</span>
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={teamChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="Đã xong" fill="#10B981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Đang làm" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 4. LEADERBOARD TABLE */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Award size={18} className="text-amber-500" /> Bảng Xếp Hạng Năng Suất Nhân Sự
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 dark:bg-slate-700/50 border-b border-gray-200 dark:border-slate-700 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Nhân Viên</th>
                <th className="px-6 py-4">Chức Vụ</th>
                <th className="px-6 py-4">Việc Đã Giao</th>
                <th className="px-6 py-4">Đã Hoàn Thành</th>
                <th className="px-6 py-4">Quá Hạn</th>
                <th className="px-6 py-4 text-right">Tỷ Lệ Hoàn Thành</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
              {memberPerformance.map((m, idx) => (
                <tr key={m.id} className="hover:bg-gray-50/70 dark:hover:bg-slate-700/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <span className={`w-5 font-bold text-xs ${idx === 0 ? 'text-amber-500' : idx === 1 ? 'text-slate-400' : idx === 2 ? 'text-amber-700' : 'text-slate-300'}`}>
                        #{idx + 1}
                      </span>
                      <img src={m.avatar || 'https://via.placeholder.com/32'} alt={m.name} className="w-7 h-7 rounded-full object-cover" />
                      <span className="font-bold text-slate-900 dark:text-white text-sm">{m.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-semibold text-slate-500">{m.role}</td>
                  <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-200">{m.assignedCount}</td>
                  <td className="px-6 py-4 font-bold text-emerald-600">{m.completedCount}</td>
                  <td className="px-6 py-4 font-bold text-rose-500">{m.overdueCount}</td>
                  <td className="px-6 py-4 text-right font-black text-slate-800 dark:text-white">
                    {m.completionRate}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
