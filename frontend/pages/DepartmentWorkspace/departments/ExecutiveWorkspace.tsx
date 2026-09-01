import React, { useState, useEffect } from 'react';
import { 
  Crown, ShieldCheck, TrendingUp, DollarSign, HardHat, 
  CheckCircle2, AlertTriangle, ArrowRight, Target, 
  Users, Briefcase, Calendar, MessageSquare, Flag, Loader2, Plus, X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../components/UI';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Line, ComposedChart 
} from 'recharts';
import { departmentWorkspaceService } from '../../../services/departmentWorkspaceService';

interface ExecutiveWorkspaceProps {
  contracts: any[];
  projects: any[];
  approvals: any[];
  revenueReports: any[];
  totalContractValue: number;
  totalRevenue: number;
  formatVND: (num: number) => string;
}

export const ExecutiveWorkspace: React.FC<ExecutiveWorkspaceProps> = ({
  contracts,
  projects,
  approvals,
  revenueReports,
  totalContractValue,
  totalRevenue,
  formatVND
}) => {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<any[]>([]);
  const [okrs, setOkrs] = useState<any[]>([]);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [execKpis, setExecKpis] = useState<any>({ totalContractValue: 0, totalContracts: 0, totalProjects: 0, pendingApprovals: 0, okrsCompleted: 0 });

  // Modal State
  const [isAddOkrOpen, setIsAddOkrOpen] = useState(false);
  const [isAddMeetingOpen, setIsAddMeetingOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // OKR Form State
  const [okrObjective, setOkrObjective] = useState('');
  const [okrDept, setOkrDept] = useState('P. Kinh Doanh & Sales');
  const [okrProgress, setOkrProgress] = useState<number>(0);

  // Meeting Form State
  const [meetingTitle, setMeetingTitle] = useState('');
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingActions, setMeetingActions] = useState<number>(1);

  const fetchExecData = async () => {
    try {
      setLoading(true);
      const [metricsData, okrsData, meetingsData, kpisData] = await Promise.all([
        departmentWorkspaceService.getRecords('dept-exec', 'metrics'),
        departmentWorkspaceService.getRecords('dept-exec', 'okrs'),
        departmentWorkspaceService.getRecords('dept-exec', 'meetings'),
        departmentWorkspaceService.getKpis('dept-exec')
      ]);
      setMetrics(metricsData);
      setOkrs(okrsData);
      setMeetings(meetingsData);
      if (kpisData) setExecKpis(kpisData);
    } catch (err) {
      console.error('Error fetching executive records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExecData();
  }, []);

  const handleCreateOkr = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!okrObjective.trim()) return;

    try {
      setIsSubmitting(true);
      await departmentWorkspaceService.createRecord('dept-exec', 'okrs', {
        objective: okrObjective.trim(),
        progress: Number(okrProgress),
        dept: okrDept,
        status: okrProgress >= 100 ? 'completed' : okrProgress < 50 ? 'at_risk' : 'on_track'
      });
      setIsAddOkrOpen(false);
      setOkrObjective('');
      setOkrProgress(0);
      fetchExecData();
    } catch (err) {
      console.error('Error creating OKR:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetingTitle.trim()) return;

    try {
      setIsSubmitting(true);
      await departmentWorkspaceService.createRecord('dept-exec', 'meetings', {
        title: meetingTitle.trim(),
        date: meetingDate.trim() || new Date().toLocaleDateString('vi-VN'),
        actions: Number(meetingActions),
        pending: Number(meetingActions)
      });
      setIsAddMeetingOpen(false);
      setMeetingTitle('');
      setMeetingDate('');
      fetchExecData();
    } catch (err) {
      console.error('Error creating meeting action:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const dynamicContractValue = execKpis.totalContractValue || totalContractValue || 0;

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-300">
      {/* 1. HEADER BANNER */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white p-8 rounded-3xl border border-slate-700 shadow-2xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 bg-amber-500/20 rounded-xl border border-amber-500/30 backdrop-blur-sm">
                <Crown className="text-amber-400" size={28} />
              </div>
              <h2 className="text-3xl font-black text-white tracking-tight">Executive Cockpit</h2>
            </div>
            <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
              Trung tâm điều hành chiến lược Tran Le Electricity. Quan sát toàn cảnh dòng tiền, kiểm soát rủi ro dự án, và ra quyết định phê duyệt cấp cao.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={() => navigate('/approvals')} className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-black text-xs px-4 py-2.5 shadow-lg shadow-amber-500/20 rounded-xl transition-transform hover:scale-105">
              <ShieldCheck size={16} className="mr-1.5" /> 
              Phê Duyệt Đang Chờ ({execKpis.pendingApprovals || approvals.filter(a => a.status === 'pending').length})
            </Button>
            <Button onClick={() => setIsAddOkrOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-transform hover:scale-105">
              <Target size={16} className="mr-1.5" /> 
              Giao Mục Tiêu (OKR)
            </Button>
            <Button onClick={() => setIsAddMeetingOpen(true)} className="bg-white/10 hover:bg-white/20 text-white font-bold text-xs px-4 py-2.5 border border-white/20 rounded-xl backdrop-blur-md transition-transform hover:scale-105">
              <Calendar size={16} className="mr-1.5" /> 
              Lịch Giao Ban HĐQT
            </Button>
          </div>
        </div>
      </div>

      {/* 2. CHỈ SỐ TÀI CHÍNH & KINH DOANH */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between text-gray-500 mb-4 relative z-10">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Tổng Hợp Đồng Ký Kết</span>
            <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg text-emerald-600">
              <Briefcase size={20} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-800 dark:text-white relative z-10">
            {formatVND(dynamicContractValue)}
          </div>
          <div className="text-xs text-slate-400 font-medium mt-2 flex items-center gap-1 relative z-10">
            {execKpis.totalContracts || contracts.length} hợp đồng trong cơ sở dữ liệu
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between text-gray-500 mb-4 relative z-10">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Doanh Thu Thực Tế</span>
            <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-blue-600">
              <DollarSign size={20} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-800 dark:text-white relative z-10">
            {formatVND(totalRevenue)}
          </div>
          <div className="text-xs text-slate-400 font-medium mt-2 flex items-center gap-1 relative z-10">
            Dữ liệu ghi nhận từ báo cáo tài chính
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between text-gray-500 mb-4 relative z-10">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Mục Tiêu OKR Hoàn Thành</span>
            <div className="p-2 bg-amber-50 dark:bg-amber-900/30 rounded-lg text-amber-600">
              <Target size={20} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-800 dark:text-white relative z-10">
            {execKpis.okrsCompleted || okrs.filter(o => o.status === 'completed').length} <span className="text-sm font-medium text-slate-500">/ {okrs.length}</span>
          </div>
          <div className="text-xs text-slate-400 font-medium mt-2 flex items-center gap-1 relative z-10">
            Đánh giá theo các chỉ số then chốt quý
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between text-gray-500 mb-4 relative z-10">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Dự Án Đang Triển Khai</span>
            <div className="p-2 bg-purple-50 dark:bg-purple-900/30 rounded-lg text-purple-600">
              <HardHat size={20} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-800 dark:text-white relative z-10">
            {execKpis.totalProjects || projects.length} <span className="text-sm font-medium text-slate-500">dự án</span>
          </div>
          <div className="text-xs text-slate-400 font-medium mt-2 flex items-center gap-1 relative z-10">
            Tổng hợp các công trình EPC & O&M
          </div>
        </div>
      </div>

      {/* 4. QUẢN TRỊ MỤC TIÊU & CUỘC HỌP */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Company OKRs */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Target size={18} className="text-emerald-500" /> Quản Trị Mục Tiêu (OKRs) ({okrs.length})
            </h3>
            <Button size="sm" onClick={() => setIsAddOkrOpen(true)} className="bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 rounded-lg text-xs font-bold">
              + Giao Mục Tiêu
            </Button>
          </div>
          
          <div className="space-y-4">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="animate-spin text-emerald-500" size={32} />
              </div>
            ) : okrs.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-sm font-medium">Chưa có mục tiêu OKRs nào được giao</div>
            ) : okrs.map(okr => (
              <div key={okr.id} className="p-4 border border-gray-100 dark:border-slate-700 rounded-2xl bg-gray-50/50 dark:bg-slate-800/50 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">{okr.objective}</h4>
                    <span className="text-[11px] text-slate-500 font-medium">Chủ trì: {okr.dept}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    okr.status === 'on_track' ? 'bg-blue-100 text-blue-700' :
                    okr.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                  }`}>
                    {okr.progress}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${okr.status === 'at_risk' ? 'bg-rose-500' : okr.status === 'completed' ? 'bg-emerald-500' : 'bg-blue-500'}`}
                    style={{ width: `${okr.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Meeting Actions */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar size={18} className="text-fuchsia-500" /> Cuộc Họp & Action Items ({meetings.length})
            </h3>
            <Button size="sm" onClick={() => setIsAddMeetingOpen(true)} className="bg-fuchsia-50 dark:bg-fuchsia-900/40 text-fuchsia-700 dark:text-fuchsia-400 border border-fuchsia-200 rounded-lg text-xs font-bold">
              + Đặt Lịch Giao Ban
            </Button>
          </div>

          <div className="space-y-4">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="animate-spin text-fuchsia-500" size={32} />
              </div>
            ) : meetings.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-sm font-medium">Chưa có lịch họp hoặc Action items nào</div>
            ) : meetings.map(m => (
              <div key={m.id} className="flex gap-4 p-4 border border-gray-100 dark:border-slate-700 rounded-2xl bg-gray-50/50 dark:bg-slate-800/50 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                <div className="w-12 h-12 shrink-0 rounded-xl bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 flex flex-col items-center justify-center border border-indigo-100 dark:border-indigo-800">
                  <span className="text-[10px] font-bold uppercase">{m.date.includes(',') ? m.date.split(',')[0] : 'LỊCH'}</span>
                  <span className="text-xs font-black">{m.date.includes(',') ? m.date.split(',')[1] : m.date}</span>
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">{m.title}</h4>
                  <div className="flex items-center gap-4 mt-2">
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <Flag size={12} className="text-slate-400" /> {m.actions} Action Items
                    </span>
                    {m.pending > 0 && (
                      <span className="text-xs text-rose-600 font-bold flex items-center gap-1 bg-rose-50 px-2 py-0.5 rounded-full">
                        <AlertTriangle size={12} /> {m.pending} Cần Làm
                      </span>
                    )}
                    {m.pending === 0 && (
                      <span className="text-xs text-emerald-600 font-bold flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-full">
                        <CheckCircle2 size={12} /> Hoàn Thành
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* MODAL: GIAO MỤC TIÊU OKR */}
      {isAddOkrOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200 dark:border-slate-700 animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gradient-to-r from-emerald-800 to-teal-900 text-white">
              <h3 className="text-base font-bold flex items-center gap-2">
                <Target size={18} /> Thiết Lập Mục Tiêu (OKR) Cho Phòng Ban
              </h3>
              <button onClick={() => setIsAddOkrOpen(false)} className="text-white/80 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateOkr} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Mục Tiêu Trọng Tâm (Objective) *
                </label>
                <input
                  type="text"
                  required
                  value={okrObjective}
                  onChange={(e) => setOkrObjective(e.target.value)}
                  placeholder="VD: Đạt doanh số Solar Rooftop Q3..."
                  className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Đơn Vị Chủ Trì
                  </label>
                  <select
                    value={okrDept}
                    onChange={(e) => setOkrDept(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="P. Kinh Doanh & Sales">P. Kinh Doanh & Sales</option>
                    <option value="Khối Tổng Thầu EPC">Khối Tổng Thầu EPC</option>
                    <option value="P. Kỹ Thuật Solar">P. Kỹ Thuật Solar</option>
                    <option value="Trung Tâm Dịch Vụ O&M">Trung Tâm Dịch Vụ O&M</option>
                    <option value="P. Tài Chính Kế Toán">P. Tài Chính Kế Toán</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Tiến Độ Hiện Tại (%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={okrProgress}
                    onChange={(e) => setOkrProgress(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 dark:border-slate-700">
                <Button type="button" variant="ghost" onClick={() => setIsAddOkrOpen(false)}>
                  Hủy
                </Button>
                <Button type="submit" disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                  {isSubmitting ? 'Đang lưu...' : 'Giao Mục Tiêu'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ĐẶT LỊCH GIAO BAN */}
      {isAddMeetingOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200 dark:border-slate-700 animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gradient-to-r from-fuchsia-800 to-indigo-900 text-white">
              <h3 className="text-base font-bold flex items-center gap-2">
                <Calendar size={18} /> Đặt Lịch Giao Ban & Action Items
              </h3>
              <button onClick={() => setIsAddMeetingOpen(false)} className="text-white/80 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateMeeting} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Nội Dung Cuộc Họp / Giao Ban *
                </label>
                <input
                  type="text"
                  required
                  value={meetingTitle}
                  onChange={(e) => setMeetingTitle(e.target.value)}
                  placeholder="VD: Họp Giao Ban Đầu Tuần — Đẩy nhanh tiến độ EPC..."
                  className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-fuchsia-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Thời Gian Giao Ban
                  </label>
                  <input
                    type="text"
                    value={meetingDate}
                    onChange={(e) => setMeetingDate(e.target.value)}
                    placeholder="VD: THỨ HAI, 09:00"
                    className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-fuchsia-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Số Lượng Action Items
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={meetingActions}
                    onChange={(e) => setMeetingActions(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-fuchsia-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 dark:border-slate-700">
                <Button type="button" variant="ghost" onClick={() => setIsAddMeetingOpen(false)}>
                  Hủy
                </Button>
                <Button type="submit" disabled={isSubmitting} className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white font-bold">
                  {isSubmitting ? 'Đang lưu...' : 'Lưu Lịch Giao Ban'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
