import React, { useState, useEffect } from 'react';
import { 
  Users, UserPlus, FileSpreadsheet, Building2, UserCheck, 
  UserX, Send, Briefcase, GraduationCap, Clock, CheckCircle2, 
  Search, Calendar, ArrowUpRight, Loader2, Plus, X
} from 'lucide-react';
import { Button } from '../../../components/UI';
import { useData } from '../../../contexts/DataContext';
import { departmentWorkspaceService } from '../../../services/departmentWorkspaceService';
import { useNotifications } from '../../../contexts/NotificationContext';

export const HrWorkspace: React.FC = () => {
  const { departments = [] } = useData();
  const { showToast } = useNotifications();
  const [activeTab, setActiveTab] = useState<'recruitment' | 'directory' | 'leaves'>('directory');
  
  const [recruitmentRecords, setRecruitmentRecords] = useState<any[]>([]);
  const [employeeRecords, setEmployeeRecords] = useState<any[]>([]);
  const [leaveRecords, setLeaveRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<any>({ totalEmployees: 0, openPositions: 0, pendingLeaves: 0 });
  const [leaveError, setLeaveError] = useState('');

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

  // Employee Form State
  const [isAddEmpOpen, setIsAddEmpOpen] = useState(false);
  const [empName, setEmpName] = useState('');
  const [empPosition, setEmpPosition] = useState('Nhân viên');
  const [empDept, setEmpDept] = useState('');
  const [empPto, setEmpPto] = useState<number>(12);

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empName.trim()) return;
    const dept = empDept || departments[0]?.name || '';
    try {
      setIsSubmitting(true);
      await departmentWorkspaceService.createRecord('dept-hr', 'employees', {
        name: empName.trim(),
        position: empPosition.trim() || 'Nhân viên',
        dept,
        status: 'active',
        pto: Math.max(0, Number(empPto) || 0),
        timesheet: ''
      });
      setIsAddEmpOpen(false);
      setEmpName('');
      setEmpPosition('Nhân viên');
      setEmpPto(12);
      fetchHrData();
      showToast({ type: 'success', title: 'Đã thêm hồ sơ', message: `Hồ sơ ${empName.trim()} đã được tạo.` });
    } catch (err) {
      console.error('Error creating employee:', err);
      showToast({ type: 'error', title: 'Thêm hồ sơ thất bại', message: 'Vui lòng thử lại.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const fetchHrData = async () => {
    setLoading(true);
    try {
      const [recruitment, employees, leaves] = await Promise.all([
        departmentWorkspaceService.getRecords('dept-hr', 'recruitment'),
        departmentWorkspaceService.getRecords('dept-hr', 'employees'),
        departmentWorkspaceService.getRecords('dept-hr', 'leaves'),
      ]);
      setRecruitmentRecords(recruitment);
      setEmployeeRecords(employees);
      setLeaveRecords(leaves);
      const freshKpis = await departmentWorkspaceService.getKpis('dept-hr');
      if (freshKpis) setKpis(freshKpis);
    } catch (err) {
      console.error('Error fetching hr records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHrData();
  }, []);

  useEffect(() => {
    if (departments.length > 0 && !departments.some(d => d.name === jobDept)) {
      setJobDept(departments[0].name);
    }
  }, [departments]);

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobTitle.trim()) return;

    try {
      setIsSubmitting(true);
      await departmentWorkspaceService.createRecord('dept-hr', 'recruitment', {
        title: jobTitle.trim(),
        dept: jobDept,
        slots: Math.max(1, Number(jobSlots) || 1),
        applied: 0,
        status: 'Screening'
      });
      setIsAddJobOpen(false);
      setJobTitle('');
      setJobSlots(2);
      fetchHrData();
    } catch (err) {
      console.error('Error creating job posting:', err);
      showToast({ type: 'error', title: 'Đăng tin thất bại', message: 'Vui lòng thử lại.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const RECRUIT_STAGES = ['Screening', 'Interview', 'Offer', 'Hired'];
  const recruitStageLabel = (s: string) => {
    if (s === 'Interview') return 'Phỏng vấn';
    if (s === 'Offer') return 'Đề nghị';
    if (s === 'Hired') return 'Đã tuyển';
    if (s === 'Rejected') return 'Đã loại';
    return 'Sàng lọc';
  };
  const nextRecruitStage = (s: string) => {
    const i = RECRUIT_STAGES.indexOf(s);
    return i >= 0 && i < RECRUIT_STAGES.length - 1 ? RECRUIT_STAGES[i + 1] : null;
  };

  const handleAdvanceRecruitment = async (job: any) => {
    const next = nextRecruitStage(job.status);
    if (!next) return;
    try {
      await departmentWorkspaceService.updateRecord('dept-hr', 'recruitment', job.id, {
        ...job,
        status: next
      });
      fetchHrData();
    } catch (err) {
      console.error('Error advancing recruitment:', err);
      showToast({ type: 'error', title: 'Chuyển giai đoạn thất bại', message: 'Vui lòng thử lại.' });
    }
  };

  const handleRejectRecruitment = async (job: any) => {
    try {
      await departmentWorkspaceService.updateRecord('dept-hr', 'recruitment', job.id, {
        ...job,
        status: 'Rejected'
      });
      fetchHrData();
    } catch (err) {
      console.error('Error rejecting recruitment:', err);
      showToast({ type: 'error', title: 'Loại tin thất bại', message: 'Vui lòng thử lại.' });
    }
  };

  const handleAddApplicant = async (job: any) => {
    try {
      await departmentWorkspaceService.updateRecord('dept-hr', 'recruitment', job.id, {
        ...job,
        applied: Number(job.applied || 0) + 1
      });
      fetchHrData();
    } catch (err) {
      console.error('Error adding applicant:', err);
      showToast({ type: 'error', title: 'Ghi nhận CV thất bại', message: 'Vui lòng thử lại.' });
    }
  };

  const handleCreateLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveEmployee.trim()) return;
    const days = Math.max(1, Number(leaveDays) || 1);

    try {
      setIsSubmitting(true);
      // Đơn nghỉ là bản ghi hr_leaves riêng — KHÔNG tạo hồ sơ nhân sự mới.
      await departmentWorkspaceService.createRecord('dept-hr', 'leaves', {
        employeeName: leaveEmployee.trim(),
        type: leaveType,
        startDate: leaveDate || new Date().toISOString().slice(0, 10),
        days,
        status: 'pending'
      });
      setIsAddLeaveOpen(false);
      setLeaveEmployee('');
      setLeaveType('Nghỉ phép năm');
      setLeaveDays(1);
      setLeaveDate(new Date().toISOString().slice(0, 10));
      fetchHrData();
    } catch (err) {
      console.error('Error submitting leave:', err);
      showToast({ type: 'error', title: 'Gửi đơn thất bại', message: 'Vui lòng thử lại.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApproveLeave = async (lv: any) => {
    setLeaveError('');
    try {
      // Nghỉ phép năm trừ tồn phép; loại khác (ốm/công tác) chỉ đổi trạng thái.
      if (lv.type === 'Nghỉ phép năm') {
        const emp = employeeRecords.find(e =>
          String(e.name || '').trim().toLowerCase() === String(lv.employeeName || '').trim().toLowerCase()
        );
        if (emp) {
          const balance = Number(emp.pto) || 0;
          if (balance < Number(lv.days)) {
            setLeaveError(`Không đủ phép: ${emp.name} còn ${balance} ngày, đơn xin ${lv.days} ngày.`);
            return;
          }
          await departmentWorkspaceService.updateRecord('dept-hr', 'employees', emp.id, {
            ...emp,
            pto: balance - Number(lv.days),
            timesheet: `Nghỉ phép năm ${lv.days} ngày từ ${lv.startDate} (đã duyệt)`
          });
        }
      }
      await departmentWorkspaceService.updateRecord('dept-hr', 'leaves', lv.id, {
        ...lv,
        status: 'approved'
      });
      fetchHrData();
    } catch (err) {
      console.error('Error approving leave:', err);
      setLeaveError('Duyệt đơn thất bại, vui lòng thử lại.');
    }
  };

  const handleRejectLeave = async (lv: any) => {
    setLeaveError('');
    try {
      await departmentWorkspaceService.updateRecord('dept-hr', 'leaves', lv.id, {
        ...lv,
        status: 'rejected'
      });
      fetchHrData();
    } catch (err) {
      console.error('Error rejecting leave:', err);
      setLeaveError('Từ chối đơn thất bại, vui lòng thử lại.');
    }
  };

  const pendingLeaves = leaveRecords.filter(l => l.status === 'pending');
  // Định biên theo phòng ban (phục vụ điều phối nhân sự cho dự án EPC).
  const deptBreakdown = (() => {
    const map = new Map<string, number>();
    employeeRecords.forEach((e: any) => {
      const k = String(e.dept || '—');
      map.set(k, (map.get(k) || 0) + 1);
    });
    const max = Math.max(1, ...[...map.values()]);
    return [...map.entries()].map(([dept, count]) => ({
      dept, count, pct: Math.round((count / max) * 100),
    }));
  })();
  const empStatusMeta = (status: string) => {
    if (status === 'active') return { label: 'Làm việc', cls: 'bg-emerald-100 text-emerald-700' };
    if (status === 'on_leave') return { label: 'Nghỉ phép', cls: 'bg-amber-100 text-amber-700' };
    if (status === 'on_trip') return { label: 'Công tác', cls: 'bg-blue-100 text-blue-700' };
    return { label: status || '—', cls: 'bg-slate-100 text-slate-600' };
  };
  const leaveStatusMeta = (status: string) => {
    if (status === 'approved') return { label: 'Đã duyệt', cls: 'bg-emerald-100 text-emerald-700' };
    if (status === 'rejected') return { label: 'Từ chối', cls: 'bg-rose-100 text-rose-700' };
    return { label: 'Chờ duyệt', cls: 'bg-amber-100 text-amber-700' };
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
            {kpis.totalEmployees ?? employeeRecords.length} <span className="text-lg font-medium text-slate-500">nhân viên</span>
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
          <button 
            onClick={() => setActiveTab('leaves')}
            className={`px-6 py-3 text-sm font-bold rounded-t-2xl transition-colors flex items-center gap-2 ${
              activeTab === 'leaves' 
                ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 border-t border-l border-r border-gray-200 dark:border-slate-700 -mb-[1px]' 
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Calendar size={16} /> Đơn Nghỉ Phép ({pendingLeaves.length} chờ duyệt)
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
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => { setEmpDept(departments[0]?.name || ''); setIsAddEmpOpen(true); }} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl">
                    <Plus size={14} className="mr-1" /> Thêm Hồ Sơ
                  </Button>
                  <Button size="sm" onClick={() => setIsAddLeaveOpen(true)} className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl">
                    <Plus size={14} className="mr-1" /> Đăng Ký Nghỉ Phép / Công Tác
                  </Button>
                </div>
              </div>

              {deptBreakdown.length > 0 && (
                <div className="p-4 bg-gray-50 dark:bg-slate-700/30 border border-gray-100 dark:border-slate-700 rounded-2xl space-y-2">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Định biên theo phòng ban</div>
                  {deptBreakdown.map(d => (
                    <div key={d.dept} className="flex items-center gap-2 text-xs">
                      <span className="w-40 truncate font-semibold text-slate-700 dark:text-slate-200">{d.dept}</span>
                      <div className="flex-1 bg-gray-200 dark:bg-slate-600 h-2 rounded-full overflow-hidden">
                        <div className="bg-rose-500 h-full" style={{ width: `${d.pct}%` }} />
                      </div>
                      <span className="font-black text-slate-800 dark:text-white w-8 text-right">{d.count}</span>
                    </div>
                  ))}
                </div>
              )}
              {employeeRecords.length === 0 ? (
                <div className="py-16 text-center text-slate-400 text-sm">Chưa có hồ sơ nhân sự nào</div>
              ) : (
                employeeRecords.map(emp => {
                  const meta = empStatusMeta(emp.status);
                  return (
                  <div key={emp.id} className="p-4 bg-gray-50 dark:bg-slate-700/30 border border-gray-100 dark:border-slate-700 rounded-2xl flex justify-between items-center">
                    <div>
                      <div className="font-bold text-sm text-slate-900 dark:text-white">{emp.name}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{emp.position} • {emp.dept} • Còn {Number(emp.pto) || 0} ngày phép</div>
                    </div>
                    <div className="text-right">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${meta.cls}`}>
                        {meta.label}
                      </span>
                      <div className="text-[11px] text-slate-400 mt-1">{emp.timesheet}</div>
                    </div>
                  </div>
                  );
                })
              )}
            </div>
          ) : activeTab === 'leaves' ? (
            <div className="space-y-3">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Đơn Nghỉ Phép / Công Tác ({pendingLeaves.length} chờ duyệt)</span>
                <Button size="sm" onClick={() => setIsAddLeaveOpen(true)} className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl">
                  <Plus size={14} className="mr-1" /> Đăng Ký Nghỉ Phép / Công Tác
                </Button>
              </div>

              {leaveError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold rounded-xl">
                  {leaveError}
                </div>
              )}

              {leaveRecords.length === 0 ? (
                <div className="py-16 text-center text-slate-400 text-sm">Chưa có đơn nghỉ phép nào</div>
              ) : (
                leaveRecords.map(lv => {
                  const meta = leaveStatusMeta(lv.status);
                  return (
                  <div key={lv.id} className="p-4 bg-gray-50 dark:bg-slate-700/30 border border-gray-100 dark:border-slate-700 rounded-2xl flex justify-between items-center gap-3">
                    <div>
                      <div className="font-bold text-sm text-slate-900 dark:text-white">{lv.employeeName}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{lv.type} • {lv.days} ngày • từ {lv.startDate}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${meta.cls}`}>
                        {meta.label}
                      </span>
                      {lv.status === 'pending' && (
                        <>
                          <Button size="sm" onClick={() => handleApproveLeave(lv)} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl">
                            Duyệt
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleRejectLeave(lv)} className="text-xs font-bold rounded-xl">
                            Từ chối
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                  );
                })
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
                        <button onClick={() => handleAddApplicant(job)} title="Ghi nhận thêm 1 CV" className="hover:text-orange-600">
                          Đã nhận: <span className="font-bold text-slate-800 dark:text-white">{job.applied} CV</span> <span className="font-bold text-orange-500">+CV</span>
                        </button>
                        <span className={`font-bold px-2 py-0.5 rounded-full ${
                          job.status === 'Hired' ? 'bg-emerald-100 text-emerald-700' :
                          job.status === 'Rejected' ? 'bg-slate-200 text-slate-500' :
                          'bg-orange-100 text-orange-700'
                        }`}>
                          {recruitStageLabel(job.status)}
                        </span>
                      </div>
                      {job.status !== 'Hired' && job.status !== 'Rejected' && (
                        <div className="flex gap-2 pt-1">
                          {nextRecruitStage(job.status) && (
                            <Button size="sm" onClick={() => handleAdvanceRecruitment(job)} className="flex-1 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl">
                              Tiếp → {recruitStageLabel(nextRecruitStage(job.status) || '')}
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" onClick={() => handleRejectRecruitment(job)} className="text-xs font-bold rounded-xl">
                            Loại
                          </Button>
                        </div>
                      )}
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
                    {departments.length > 0 ? (
                      departments.map(d => (
                        <option key={d.id} value={d.name}>{d.name}</option>
                      ))
                    ) : (
                      <>
                        <option value="P. Kỹ Thuật Solar">P. Kỹ Thuật Solar</option>
                        <option value="Khối Tổng Thầu EPC">Khối Tổng Thầu EPC</option>
                        <option value="P. Kinh Doanh Solar">P. Kinh Doanh Solar</option>
                        <option value="Trung Tâm Dịch Vụ O&M">Trung Tâm Dịch Vụ O&M</option>
                        <option value="P. Mua Hàng & SCM">P. Mua Hàng & SCM</option>
                      </>
                    )}
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

      {/* MODAL: THÊM HỒ SƠ NHÂN SỰ */}
      {isAddEmpOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200 dark:border-slate-700 animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gradient-to-r from-emerald-700 to-teal-800 text-white">
              <h3 className="text-base font-bold">
                Thêm Hồ Sơ Nhân Sự
              </h3>
              <button onClick={() => setIsAddEmpOpen(false)} className="text-white/80 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateEmployee} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Họ Tên Nhân Viên *
                </label>
                <input
                  type="text"
                  required
                  value={empName}
                  onChange={(e) => setEmpName(e.target.value)}
                  placeholder="VD: Nguyễn Văn Nam..."
                  className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Chức Danh
                  </label>
                  <input
                    type="text"
                    value={empPosition}
                    onChange={(e) => setEmpPosition(e.target.value)}
                    placeholder="VD: Kỹ sư Solar..."
                    className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Tồn Phép Năm (ngày)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={empPto}
                    onChange={(e) => setEmpPto(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Phòng Ban
                </label>
                <select
                  value={empDept}
                  onChange={(e) => setEmpDept(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {departments.length > 0 ? (
                    departments.map((d: any) => (
                      <option key={d.id} value={d.name}>{d.name}</option>
                    ))
                  ) : (
                    <option value="">— Chưa có phòng ban —</option>
                  )}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 dark:border-slate-700">
                <Button type="button" variant="ghost" onClick={() => setIsAddEmpOpen(false)}>
                  Hủy
                </Button>
                <Button type="submit" disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                  {isSubmitting ? 'Đang lưu...' : 'Lưu Hồ Sơ'}
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

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Ngày Bắt Đầu Nghỉ
                </label>
                <input
                  type="date"
                  value={leaveDate}
                  onChange={(e) => setLeaveDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-rose-500"
                />
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
