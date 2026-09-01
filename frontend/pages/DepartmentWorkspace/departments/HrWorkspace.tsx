import React, { useState, useEffect } from 'react';
import { 
  Users, UserPlus, FileSpreadsheet, Building2, UserCheck, 
  UserX, Send, Briefcase, GraduationCap, Clock, CheckCircle2, 
  Search, Calendar, ArrowUpRight, Loader2, Plus, X
} from 'lucide-react';
import { Button } from '../../../components/UI';
import { departmentWorkspaceService } from '../../../services/departmentWorkspaceService';

export const HrWorkspace: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'recruitment' | 'directory'>('directory');
  
  const [recruitmentRecords, setRecruitmentRecords] = useState<any[]>([]);
  const [employeeRecords, setEmployeeRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<any>({ totalEmployees: 0, openPositions: 0 });

  // Modal State
  const [isAddJobOpen, setIsAddJobOpen] = useState(false);
  const [isAddLeaveOpen, setIsAddLeaveOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Job Form State
  const [jobTitle, setJobTitle] = useState('');
  const [jobDept, setJobDept] = useState('P. Kỹ Thuật Solar');
  const [jobSlots, setJobSlots] = useState<number>(2);

  // Leave Form State
  const [leaveEmployee, setLeaveEmployee] = useState('');
  const [leaveType, setLeaveType] = useState('Nghỉ phép năm');
  const [leaveDays, setLeaveDays] = useState<number>(1);
  const [leaveDate, setLeaveDate] = useState(new Date().toISOString().split('T')[0]);

  const fetchHrData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'recruitment') {
        const data = await departmentWorkspaceService.getRecords('dept-hr', 'recruitment');
        setRecruitmentRecords(data);
      } else if (activeTab === 'directory') {
        const data = await departmentWorkspaceService.getRecords('dept-hr', 'employees');
        setEmployeeRecords(data);
      }
    } catch (err) {
      console.error('Error fetching hr records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    departmentWorkspaceService.getKpis('dept-hr').then(setKpis).catch(console.error);
  }, []);

  useEffect(() => {
    fetchHrData();
  }, [activeTab]);

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobTitle.trim()) return;

    try {
      setIsSubmitting(true);
      await departmentWorkspaceService.createRecord('dept-hr', 'recruitment', {
        title: jobTitle.trim(),
        dept: jobDept,
        slots: Number(jobSlots),
        applied: 0,
        status: 'Screening'
      });
      setIsAddJobOpen(false);
      setJobTitle('');
      fetchHrData();
    } catch (err) {
      console.error('Error creating job posting:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveEmployee.trim()) return;

    try {
      setIsSubmitting(true);
      await departmentWorkspaceService.createRecord('dept-hr', 'employees', {
        name: leaveEmployee.trim(),
        position: 'Nhân viên',
        dept: 'Khối Thi Công EPC',
        status: 'on_leave',
        pto: Number(leaveDays),
        timesheet: 'Đã duyệt nghỉ phép'
      });
      setIsAddLeaveOpen(false);
      setLeaveEmployee('');
      fetchHrData();
    } catch (err) {
      console.error('Error submitting leave:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-300">
      {/* 1. HEADER & KPI DASHBOARD */}
      <div className="bg-gradient-to-r from-rose-900 via-pink-900 to-orange-950 text-white p-8 rounded-3xl shadow-xl relative overflow-hidden border border-rose-500/30">
        <div className="absolute right-0 top-0 w-96 h-96 bg-orange-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/4 bottom-0 w-64 h-64 bg-pink-500/20 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 bg-rose-500/20 rounded-xl border border-rose-400/30 backdrop-blur-sm">
                <Users className="text-rose-300" size={28} />
              </div>
              <h2 className="text-3xl font-black text-white tracking-tight">HR & Culture Hub</h2>
            </div>
            <p className="text-rose-100/80 text-sm max-w-2xl leading-relaxed">
              Trung tâm Phát triển Nguồn nhân lực. Quản lý Tuyển dụng (Recruitment), Hồ sơ nhân sự (Directory), Chấm công (Timesheet) và Văn hóa doanh nghiệp.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={() => setIsAddJobOpen(true)}
              className="bg-orange-500 hover:bg-orange-400 text-slate-900 font-black text-xs px-4 py-2.5 shadow-lg rounded-xl transition-all"
            >
              <UserPlus size={16} className="mr-1.5" /> Tạo Yêu Cầu Tuyển Dụng
            </Button>
            <Button
              onClick={() => setIsAddLeaveOpen(true)}
              className="bg-slate-900/60 hover:bg-slate-900 text-rose-300 border border-rose-500/30 font-bold text-xs px-4 py-2.5 rounded-xl transition-all backdrop-blur-md flex items-center gap-2"
            >
              <Calendar size={16} /> Đơn Nghỉ Phép / Công Tác
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between text-gray-500 mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Quy Mô Nhân Sự (Headcount)</span>
            <div className="p-2 bg-rose-50 dark:bg-rose-900/30 rounded-lg text-rose-600">
              <Building2 size={20} />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-800 dark:text-white">
            {employeeRecords.length} <span className="text-lg font-medium text-slate-500">nhân viên</span>
          </div>
          <div className="text-xs text-rose-500 font-bold mt-2 flex items-center gap-1">
            Đang làm việc tại các văn phòng & công trình EPC
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between text-gray-500 mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Vị Trí Đang Tuyển Dụng</span>
            <div className="p-2 bg-orange-50 dark:bg-orange-900/30 rounded-lg text-orange-600">
              <Briefcase size={20} />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-800 dark:text-white">
            {recruitmentRecords.length} <span className="text-lg font-medium text-slate-500">vị trí</span>
          </div>
          <div className="text-xs text-orange-500 font-bold mt-2 flex items-center gap-1">
            Kỹ sư Solar, Trưởng nhóm Kinh doanh & Kỹ thuật
          </div>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-3xl overflow-hidden shadow-sm flex flex-col min-h-[500px]">
        {/* Tab Headers */}
        <div className="flex border-b border-gray-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40 px-6 pt-4 gap-2">
          <button 
            onClick={() => setActiveTab('directory')}
            className={`px-6 py-3 text-sm font-bold rounded-t-2xl transition-colors flex items-center gap-2 ${
              activeTab === 'directory' 
                ? 'bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 border-t border-l border-r border-gray-200 dark:border-slate-700 -mb-[1px]' 
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Users size={16} /> Danh Sách Nhân Sự & Chấm Công ({employeeRecords.length})
          </button>
          <button 
            onClick={() => setActiveTab('recruitment')}
            className={`px-6 py-3 text-sm font-bold rounded-t-2xl transition-colors flex items-center gap-2 ${
              activeTab === 'recruitment' 
                ? 'bg-white dark:bg-slate-800 text-orange-600 dark:text-orange-400 border-t border-l border-r border-gray-200 dark:border-slate-700 -mb-[1px]' 
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Briefcase size={16} /> Tuyển Dụng & Phỏng Vấn ({recruitmentRecords.length})
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-2">
              <Loader2 className="animate-spin text-rose-600" size={28} />
              <span className="text-xs">Đang tải dữ liệu Nhân sự...</span>
            </div>
          ) : activeTab === 'directory' ? (
            <div className="space-y-3">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Hồ Sơ Nhân Sự & Trạng Thái Nghỉ Phép</span>
                <Button size="sm" onClick={() => setIsAddLeaveOpen(true)} className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl">
                  <Plus size={14} className="mr-1" /> Đăng Ký Nghỉ Phép / Công Tác
                </Button>
              </div>

              {employeeRecords.length === 0 ? (
                <div className="py-16 text-center text-slate-400 text-sm">Chưa có hồ sơ nhân sự nào</div>
              ) : (
                employeeRecords.map(emp => (
                  <div key={emp.id} className="p-4 bg-gray-50 dark:bg-slate-700/30 border border-gray-100 dark:border-slate-700 rounded-2xl flex justify-between items-center">
                    <div>
                      <div className="font-bold text-sm text-slate-900 dark:text-white">{emp.name}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{emp.position} • {emp.dept}</div>
                    </div>
                    <div className="text-right">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                        emp.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {emp.status === 'active' ? 'Làm việc' : 'Nghỉ phép'}
                      </span>
                      <div className="text-[11px] text-slate-400 mt-1">{emp.timesheet}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Chiến Dịch Tuyển Dụng Đang Triển Khai</span>
                <Button size="sm" onClick={() => setIsAddJobOpen(true)} className="bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl">
                  <Plus size={14} className="mr-1" /> Đăng Tin Tuyển Dụng
                </Button>
              </div>

              {recruitmentRecords.length === 0 ? (
                <div className="py-16 text-center text-slate-400 text-sm">Chưa có vị trí tuyển dụng nào</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {recruitmentRecords.map(job => (
                    <div key={job.id} className="p-5 bg-gray-50 dark:bg-slate-700/30 border border-gray-100 dark:border-slate-700 rounded-2xl space-y-2">
                      <div className="flex justify-between items-start">
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white">{job.title}</h4>
                        <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">{job.slots} Chỉ tiêu</span>
                      </div>
                      <div className="text-xs text-slate-400">{job.dept}</div>
                      <div className="border-t border-gray-100 dark:border-slate-700 pt-2 flex justify-between items-center text-xs text-slate-500">
                        <span>Đã nhận: <span className="font-bold text-slate-800 dark:text-white">{job.applied} CV</span></span>
                        <span className="font-bold text-orange-600 capitalize">{job.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* MODAL: ĐĂNG TIN TUYỂN DỤNG */}
      {isAddJobOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200 dark:border-slate-700 animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gradient-to-r from-orange-700 to-rose-800 text-white">
              <h3 className="text-base font-bold flex items-center gap-2">
                <UserPlus size={18} /> Đăng Tin Tuyển Dụng Vị Trí Mới
              </h3>
              <button onClick={() => setIsAddJobOpen(false)} className="text-white/80 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateJob} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Chức Danh Tuyển Dụng *
                </label>
                <input
                  type="text"
                  required
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="VD: Kỹ Sư Thiết Kế Solar PVsyst / AutoCAD..."
                  className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Phòng Ban Tiếp Nhận
                  </label>
                  <select
                    value={jobDept}
                    onChange={(e) => setJobDept(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="P. Kỹ Thuật Solar">P. Kỹ Thuật Solar</option>
                    <option value="Khối Tổng Thầu EPC">Khối Tổng Thầu EPC</option>
                    <option value="P. Kinh Doanh Solar">P. Kinh Doanh Solar</option>
                    <option value="Trung Tâm Dịch Vụ O&M">Trung Tâm Dịch Vụ O&M</option>
                    <option value="P. Mua Hàng & SCM">P. Mua Hàng & SCM</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Chỉ Tiêu Tuyển Dụng
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={jobSlots}
                    onChange={(e) => setJobSlots(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 dark:border-slate-700">
                <Button type="button" variant="ghost" onClick={() => setIsAddJobOpen(false)}>
                  Hủy
                </Button>
                <Button type="submit" disabled={isSubmitting} className="bg-orange-600 hover:bg-orange-700 text-white font-bold">
                  {isSubmitting ? 'Đang lưu...' : 'Đăng Tin'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ĐĂNG KÝ NGHỈ PHÉP */}
      {isAddLeaveOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200 dark:border-slate-700 animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gradient-to-r from-rose-800 to-pink-900 text-white">
              <h3 className="text-base font-bold flex items-center gap-2">
                <Calendar size={18} /> Đăng Ký Nghỉ Phép / Đi Công Tác
              </h3>
              <button onClick={() => setIsAddLeaveOpen(false)} className="text-white/80 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateLeave} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Họ Tên Nhân Viên *
                </label>
                <input
                  type="text"
                  required
                  value={leaveEmployee}
                  onChange={(e) => setLeaveEmployee(e.target.value)}
                  placeholder="VD: Kỹ sư Nguyễn Văn Nam..."
                  className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Loại Nghỉ Phép
                  </label>
                  <select
                    value={leaveType}
                    onChange={(e) => setLeaveType(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-rose-500"
                  >
                    <option value="Nghỉ phép năm">Nghỉ phép năm</option>
                    <option value="Nghỉ ốm / Khám bệnh">Nghỉ ốm / Khám bệnh</option>
                    <option value="Công tác hiện trường">Công tác hiện trường</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Số Ngày Nghỉ
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={leaveDays}
                    onChange={(e) => setLeaveDays(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 dark:border-slate-700">
                <Button type="button" variant="ghost" onClick={() => setIsAddLeaveOpen(false)}>
                  Hủy
                </Button>
                <Button type="submit" disabled={isSubmitting} className="bg-rose-600 hover:bg-rose-700 text-white font-bold">
                  {isSubmitting ? 'Đang lưu...' : 'Gửi Đơn'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
