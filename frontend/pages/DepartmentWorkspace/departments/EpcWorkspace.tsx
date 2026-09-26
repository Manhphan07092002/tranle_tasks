import React, { useState, useEffect } from 'react';
import { 
  HardHat, ShieldAlert, CheckCircle2, Camera, UserSquare2, 
  MapPin, AlertTriangle, Play, ClipboardCheck, ArrowRight, 
  Zap, Loader2, Plus, Star, Award, ShieldCheck
} from 'lucide-react';
import { Button } from '../../../components/UI';
import { DailySiteLogModal } from '../../../components/epc/DailySiteLogModal';
import { ProjectChainTimeline } from '../../../components/workflow/ProjectChainTimeline';
import { departmentWorkspaceService } from '../../../services/departmentWorkspaceService';
import { useNotifications } from '../../../contexts/NotificationContext';

interface EpcWorkspaceProps {
  projects: any[];
}

export const EpcWorkspace: React.FC<EpcWorkspaceProps> = ({ projects }) => {
  const { showToast } = useNotifications();
  const [isSiteLogOpen, setIsSiteLogOpen] = useState(false);
  const [chainProject, setChainProject] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'kanban' | 'subcontractor' | 'hse' | 'attendance'>('kanban');
  const [kanbanFilter, setKanbanFilter] = useState<'all' | 'active' | 'done'>('all');
  const [subcontractors, setSubcontractors] = useState<any[]>([]);
  const [hseLogs, setHseLogs] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<any>({ activeProjects: 0, totalWorkers: 0, inboundCount: 0, openHse: 0, criticalHse: 0 });

  // Add Subcontractor Modal State
  const [isAddSubOpen, setIsAddSubOpen] = useState(false);
  const [isAddHseOpen, setIsAddHseOpen] = useState(false);
  const [subName, setSubName] = useState('');
  const [subTask, setSubTask] = useState('Lắp đặt khung giàn & Tấm pin');
  const [subRating, setSubRating] = useState<number>(5);
  const [subStatus, setSubStatus] = useState('Đang thi công');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Attendance Form State
  const [isAddAttOpen, setIsAddAttOpen] = useState(false);
  const [attSite, setAttSite] = useState('');
  const [attDate, setAttDate] = useState(new Date().toISOString().slice(0, 10));
  const [attTeam, setAttTeam] = useState('');
  const [attWorkers, setAttWorkers] = useState<number | ''>('');
  const [attNote, setAttNote] = useState('');

  // HSE Log Form State
  const [hseSite, setHseSite] = useState('');
  const [hseCategory, setHseCategory] = useState('Toolbox meeting');
  const [hseTitle, setHseTitle] = useState('');
  const [hseSeverity, setHseSeverity] = useState('medium');
  const [hseDate, setHseDate] = useState(new Date().toISOString().slice(0, 10));
  const [hseAction, setHseAction] = useState('');

  const fetchEpcData = async () => {
    setLoading(true);
    try {
      const [subs, hse, att, freshKpis] = await Promise.all([
        departmentWorkspaceService.getRecords('dept-epc', 'subcontractor'),
        departmentWorkspaceService.getRecords('dept-epc', 'hse'),
        departmentWorkspaceService.getRecords('dept-epc', 'attendance'),
        departmentWorkspaceService.getKpis('dept-epc')
      ]);
      setSubcontractors(subs);
      setHseLogs(hse);
      setAttendance(att);
      if (freshKpis) setKpis(freshKpis);
    } catch (err) {
      console.error('Error fetching records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEpcData();
  }, []);

  const handleCreateSubcontractor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subName.trim()) return;

    try {
      setIsSubmitting(true);
      await departmentWorkspaceService.createRecord('dept-epc', 'subcontractor', {
        name: subName.trim(),
        task: subTask,
        rating: Math.min(5, Math.max(1, Number(subRating) || 1)),
        status: subStatus
      });
      setIsAddSubOpen(false);
      setSubName('');
      setSubTask('Lắp đặt khung giàn & Tấm pin');
      setSubRating(5);
      setSubStatus('Đang thi công');
      fetchEpcData();
    } catch (err) {
      console.error('Error adding subcontractor:', err);
      showToast({ type: 'error', title: 'Thêm thầu phụ thất bại', message: 'Vui lòng thử lại.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateHse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hseSite.trim() || !hseTitle.trim()) return;

    try {
      setIsSubmitting(true);
      await departmentWorkspaceService.createRecord('dept-epc', 'hse', {
        site: hseSite.trim(),
        category: hseCategory,
        title: hseTitle.trim(),
        severity: hseSeverity,
        date: hseDate || new Date().toISOString().slice(0, 10),
        status: 'open',
        action: hseAction.trim()
      });
      setIsAddHseOpen(false);
      setHseSite('');
      setHseTitle('');
      setHseSeverity('medium');
      setHseDate(new Date().toISOString().slice(0, 10));
      setHseAction('');
      fetchEpcData();
    } catch (err) {
      console.error('Error creating HSE log:', err);
      showToast({ type: 'error', title: 'Ghi nhận HSE thất bại', message: 'Vui lòng thử lại.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    const workers = Number(attWorkers);
    if (!attSite.trim() || !Number.isFinite(workers) || workers < 0) return;

    try {
      setIsSubmitting(true);
      await departmentWorkspaceService.createRecord('dept-epc', 'attendance', {
        site: attSite.trim(),
        date: attDate || new Date().toISOString().slice(0, 10),
        team: attTeam.trim(),
        workers,
        note: attNote.trim()
      });
      setIsAddAttOpen(false);
      setAttSite('');
      setAttDate(new Date().toISOString().slice(0, 10));
      setAttTeam('');
      setAttWorkers('');
      setAttNote('');
      fetchEpcData();
    } catch (err) {
      console.error('Error creating attendance:', err);
      showToast({ type: 'error', title: 'Chấm công thất bại', message: 'Vui lòng thử lại.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseHse = async (log: any) => {
    try {
      await departmentWorkspaceService.updateRecord('dept-epc', 'hse', log.id, {
        ...log,
        status: 'closed'
      });
      fetchEpcData();
    } catch (err) {
      console.error('Error closing HSE log:', err);
      showToast({ type: 'error', title: 'Đóng biên bản thất bại', message: 'Vui lòng thử lại.' });
    }
  };

  // Chuỗi COD -> O&M: bàn giao vận hành + chuyển dự án sang bảo hành (backend lo idempotency).
  const handleHandoverOm = async (p: any) => {
    try {
      setIsSubmitting(true);
      const res = await departmentWorkspaceService.codToOm(p.id);
      showToast({ type: 'success', title: 'Đã bàn giao O&M', message: res?.message || 'Dự án đã chuyển sang bảo hành.' });
    } catch (err) {
      console.error('Error handing over to OM:', err);
      showToast({ type: 'error', title: 'Bàn giao thất bại', message: 'Vui lòng thử lại.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isProjectDone = (p: any) => /hoàn thành|done|complete|nghiệm thu/i.test(String(p.status || ''));
  const filteredProjects = projects.filter(p => {
    if (kanbanFilter === 'active') return !isProjectDone(p);
    if (kanbanFilter === 'done') return isProjectDone(p);
    return true;
  });
  const openHseCount = kpis.openHse ?? hseLogs.filter(l => l.status === 'open').length;
  const criticalHseCount = kpis.criticalHse ?? hseLogs.filter(l => l.severity === 'critical' && l.status === 'open').length;

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-300">
      {/* 1. HEADER & DASHBOARD */}
      <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-slate-900 text-white p-8 rounded-3xl border border-amber-500 shadow-xl relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none" 
             style={{ backgroundImage: 'repeating-linear-gradient(45deg, #000 0, #000 20px, #fff 20px, #fff 40px)' }} />
        
        <div className="absolute right-0 top-0 w-96 h-96 bg-amber-400/20 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 bg-amber-500/20 rounded-xl border border-amber-400/30 backdrop-blur-sm">
                <HardHat className="text-amber-300" size={28} />
              </div>
              <h2 className="text-3xl font-black text-white tracking-tight">EPC Command Center</h2>
            </div>
            <p className="text-amber-100 text-sm max-w-2xl leading-relaxed">
              Tổng huy động lực lượng thi công thực địa. Quản lý tiến độ dự án, thầu phụ (Subcontractors), Nhật ký công trường và kiểm soát An toàn lao động (HSE).
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={() => setIsSiteLogOpen(true)}
              className="bg-white text-orange-700 hover:bg-orange-50 font-black text-xs px-4 py-2.5 shadow-lg rounded-xl transition-transform hover:scale-105"
            >
              <Camera size={16} className="mr-1.5" />
              Ghi Nhật Ký Thi Công
            </Button>
            <Button
              onClick={() => setIsAddSubOpen(true)}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs px-4 py-2.5 shadow-lg rounded-xl transition-transform hover:scale-105"
            >
              <Plus size={16} className="mr-1.5" />
              Thêm Thầu Phụ
            </Button>
            <span className="px-4 py-2.5 rounded-xl bg-slate-800/80 border border-amber-500/30 text-amber-400 text-xs font-bold backdrop-blur-md flex items-center gap-2">
              <ShieldAlert size={16} /> Chuẩn An Toàn HSE
            </span>
          </div>
        </div>
      </div>

      {/* 2. STATS ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between text-gray-500 mb-4 relative z-10">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Dự Án Đang Thi Công</span>
            <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-blue-600">
              <Play size={20} />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-800 dark:text-white relative z-10">
            {kpis.activeProjects} <span className="text-lg font-medium text-slate-500">site</span>
          </div>
          <div className="text-xs text-slate-400 font-medium mt-2 flex items-center gap-1 relative z-10">
            {kpis.activeProjects > 0 ? `${kpis.activeProjects} site đang thi công` : 'Chưa có dự án thi công'}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between text-gray-500 mb-4 relative z-10">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Nhân Lực Hiện Trường</span>
            <div className="p-2 bg-amber-50 dark:bg-amber-900/30 rounded-lg text-amber-600">
              <UserSquare2 size={20} />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-800 dark:text-white relative z-10">
            {kpis.totalWorkers} <span className="text-lg font-medium text-slate-500">nhân công</span>
          </div>
          <div className="text-xs text-slate-400 font-medium mt-2 flex items-center gap-1 relative z-10">
            Kỹ sư giám sát & Đội thi công khung/cáp
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between text-gray-500 mb-4 relative z-10">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Chỉ Số An Toàn HSE</span>
            <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg text-emerald-600">
              <ShieldCheck size={20} />
            </div>
          </div>
          <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 relative z-10">
            {openHseCount === 0 ? 'An toàn' : `${openHseCount} cần xử lý`}
          </div>
          <div className="text-xs text-slate-400 font-medium mt-2 flex items-center gap-1 relative z-10">
            {criticalHseCount > 0
              ? `${criticalHseCount} sự cố nghiêm trọng đang mở`
              : 'Tuân thủ PCCC & An toàn điện cao áp'}
          </div>
        </div>
      </div>

      {/* 3. TABS CONTROLLER */}
      <div className="bg-white dark:bg-slate-800 p-2 rounded-2xl border border-gray-200 dark:border-slate-700 flex gap-2">
        <button
          onClick={() => setActiveTab('kanban')}
          className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
            activeTab === 'kanban'
              ? 'bg-amber-600 text-white shadow-lg shadow-amber-500/20'
              : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'
          }`}
        >
          <Play size={16} /> Tiến Độ Thi Công Hiện Trường
        </button>
        <button
          onClick={() => setActiveTab('subcontractor')}
          className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
            activeTab === 'subcontractor'
              ? 'bg-amber-600 text-white shadow-lg shadow-amber-500/20'
              : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'
          }`}
        >
          <HardHat size={16} /> Quản Lý Đội Thầu Phụ ({subcontractors.length})
        </button>
        <button
          onClick={() => setActiveTab('hse')}
          className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
            activeTab === 'hse'
              ? 'bg-amber-600 text-white shadow-lg shadow-amber-500/20'
              : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'
          }`}
        >
          <ShieldAlert size={16} /> An Toàn HSE ({openHseCount} mở)
        </button>
        <button
          onClick={() => setActiveTab('attendance')}
          className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
            activeTab === 'attendance'
              ? 'bg-amber-600 text-white shadow-lg shadow-amber-500/20'
              : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'
          }`}
        >
          <UserSquare2 size={16} /> Chấm Công Site
        </button>
      </div>

      {/* 4. TAB CONTENTS */}
      {activeTab === 'kanban' ? (
        <div className="space-y-4">
          <div className="flex flex-wrap justify-between items-center gap-2">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">
              Danh Sách Các Dự Án Thi Công Thực Địa ({filteredProjects.length})
            </h3>
            <div className="flex items-center gap-2">
              <div className="flex bg-gray-100 dark:bg-slate-700 rounded-xl p-1 text-xs font-bold">
                {(['all', 'active', 'done'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setKanbanFilter(f)}
                    className={`px-3 py-1.5 rounded-lg transition-colors ${
                      kanbanFilter === f ? 'bg-white dark:bg-slate-800 text-amber-600 shadow' : 'text-slate-500'
                    }`}
                  >
                    {f === 'all' ? 'Tất cả' : f === 'active' ? 'Đang thi công' : 'Hoàn thành'}
                  </button>
                ))}
              </div>
              <Button size="sm" onClick={() => setIsSiteLogOpen(true)} className="bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl">
                <Camera size={14} className="mr-1" /> Ghi Nhật Ký
              </Button>
            </div>
          </div>

          {filteredProjects.length === 0 ? (
            <div className="py-16 text-center bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-gray-200 dark:border-slate-700 space-y-2">
              <HardHat size={24} className="mx-auto text-slate-400" />
              <div className="text-sm font-bold text-slate-800 dark:text-white">Không có dự án nào trong bộ lọc này</div>
              <p className="text-xs text-slate-400">Các hợp đồng sau khi chốt sẽ chuyển sang khối EPC để khởi công.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredProjects.map(p => (
                <div key={p.id} className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-gray-200 dark:border-slate-700 shadow-sm space-y-3">
                  <div className="flex justify-between items-start gap-2">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">{p.name}</span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 whitespace-nowrap">{p.status || 'Thi công'}</span>
                  </div>
                  {p.description && <div className="text-xs text-slate-500">{p.description}</div>}
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Tiến độ thi công:</span>
                    <span className="font-black text-slate-900 dark:text-white">{p.progress ?? 0}%</span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                    <div className="bg-amber-500 h-full rounded-full transition-all" style={{ width: `${p.progress ?? 0}%` }} />
                  </div>
                  <Button size="sm" onClick={() => setChainProject(p)} variant="ghost" className="w-full text-xs font-bold rounded-xl">
                    Xem dòng đời dự án
                  </Button>
                  {isProjectDone(p) && p.status !== 'warranty' && (
                    <Button size="sm" onClick={() => handleHandoverOm(p)} disabled={isSubmitting} className="w-full bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl">
                      Bàn giao vận hành O&M
                    </Button>
                  )}
                  {p.status === 'warranty' && (
                    <div className="text-[11px] font-bold text-teal-600 text-center">Đang bảo hành O&M</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : activeTab === 'hse' ? (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">
              Sổ Theo Dõi An Toàn HSE ({openHseCount} đang mở)
            </h3>
            <Button size="sm" onClick={() => setIsAddHseOpen(true)} className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl">
              <Plus size={14} className="mr-1" /> Ghi Nhận Sự Cố
            </Button>
          </div>

          {hseLogs.length === 0 ? (
            <div className="py-16 text-center bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-gray-200 dark:border-slate-700 space-y-2">
              <ShieldCheck size={24} className="mx-auto text-emerald-500" />
              <div className="text-sm font-bold text-slate-800 dark:text-white">Chưa ghi nhận sự cố nào — công trường đang an toàn</div>
              <p className="text-xs text-slate-400">Ghi nhận sự cố, suýt soát, vi phạm an toàn điện/PCCC và toolbox meeting.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {hseLogs.map(log => (
                <div key={log.id} className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-gray-200 dark:border-slate-700 shadow-sm flex justify-between items-center gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        log.severity === 'critical' ? 'bg-rose-100 text-rose-700' :
                        log.severity === 'high' ? 'bg-orange-100 text-orange-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {log.severity}
                      </span>
                      <span className="text-[11px] font-bold text-slate-500">{log.category}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${log.status === 'open' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {log.status === 'open' ? 'Đang mở' : 'Đã đóng'}
                      </span>
                    </div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white mt-1">{log.title}</h4>
                    <div className="text-xs text-slate-400 mt-0.5">Công trình: {log.site} • {log.date}{log.action ? ` • Xử lý: ${log.action}` : ''}</div>
                  </div>
                  {log.status === 'open' && (
                    <Button size="sm" onClick={() => handleCloseHse(log)} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shrink-0">
                      Đóng
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : activeTab === 'subcontractor' ? (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">
              Đánh Giá & Quản Lý Nhà Thầu Phụ EPC
            </h3>
            <Button size="sm" onClick={() => setIsAddSubOpen(true)} className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl">
              <Plus size={14} className="mr-1" /> Thêm Thầu Phụ
            </Button>
          </div>

          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-2">
              <Loader2 className="animate-spin text-amber-600" size={28} />
              <span className="text-xs">Đang tải danh sách thầu phụ...</span>
            </div>
          ) : subcontractors.length === 0 ? (
            <div className="py-16 text-center bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-gray-200 dark:border-slate-700 space-y-2">
              <UserSquare2 size={24} className="mx-auto text-slate-400" />
              <div className="text-sm font-bold text-slate-800 dark:text-white">Chưa có nhà thầu phụ nào</div>
              <p className="text-xs text-slate-400">Thêm các đội thầu phụ thi công cơ điện, kết cấu mái và kéo cáp.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {subcontractors.map(sub => (
                <div key={sub.id} className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-gray-200 dark:border-slate-700 shadow-sm space-y-2">
                  <div className="flex justify-between items-start">
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">{sub.name}</h4>
                    <span className="flex items-center gap-1 text-xs font-bold text-amber-500">
                      <Star size={14} className="fill-amber-500" /> {sub.rating}/5
                    </span>
                  </div>
                  <div className="text-xs text-slate-500">{sub.task}</div>
                  <div className="border-t border-gray-100 dark:border-slate-700 pt-2 flex justify-between items-center text-xs">
                    <span className="text-slate-400">Trạng thái:</span>
                    <span className="font-bold text-amber-600">{sub.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">
              Chấm Công Nhân Lực Theo Site ({attendance.reduce((s: number, a: any) => s + (Number(a.workers) || 0), 0)} lượt công)
            </h3>
            <Button size="sm" onClick={() => setIsAddAttOpen(true)} className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl">
              <Plus size={14} className="mr-1" /> Chấm Công
            </Button>
          </div>

          {attendance.length === 0 ? (
            <div className="py-16 text-center bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-gray-200 dark:border-slate-700 space-y-2">
              <UserSquare2 size={24} className="mx-auto text-slate-400" />
              <div className="text-sm font-bold text-slate-800 dark:text-white">Chưa có bản chấm công nào</div>
              <p className="text-xs text-slate-400">Ghi nhận quân số từng đội theo site mỗi ngày.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {attendance.map((a: any) => (
                <div key={a.id} className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-gray-200 dark:border-slate-700 shadow-sm flex justify-between items-center gap-3">
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">{a.site}</h4>
                    <div className="text-xs text-slate-500 mt-0.5">{a.date} • Đội: {a.team || '—'}{a.note ? ` • ${a.note}` : ''}</div>
                  </div>
                  <span className="text-2xl font-black text-amber-600 whitespace-nowrap">{a.workers} <span className="text-xs font-medium text-slate-500">công</span></span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 5. MODAL: THÊM THẦU PHỤ */}
      {isAddSubOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200 dark:border-slate-700 animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gradient-to-r from-amber-600 to-orange-700 text-white">
              <h3 className="text-base font-bold flex items-center gap-2">
                <HardHat size={18} /> Thêm Nhà Thầu Phụ Thi Công
              </h3>
              <button onClick={() => setIsAddSubOpen(false)} className="text-white/80 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateSubcontractor} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Tên Đơn Vị / Đội Thầu Phụ *
                </label>
                <input
                  type="text"
                  required
                  value={subName}
                  onChange={(e) => setSubName(e.target.value)}
                  placeholder="VD: Công ty TNHH Cơ Điện Miền Trung..."
                  className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Hạng Mục Thi Công Phụ Trách
                </label>
                <select
                  value={subTask}
                  onChange={(e) => setSubTask(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="Lắp đặt khung giàn & Tấm pin">Lắp đặt khung giàn & Tấm pin</option>
                  <option value="Kéo cáp DC & Lắp máng cáp">Kéo cáp DC & Lắp máng cáp</option>
                  <option value="Đấu nối tủ điện AC & Inverter">Đấu nối tủ điện AC & Inverter</option>
                  <option value="Thí nghiệm hiệu chỉnh & Đóng điện EVN">Thí nghiệm hiệu chỉnh & Đóng điện EVN</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Đánh Giá Năng Lực (1-5 Sao)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={subRating}
                    onChange={(e) => setSubRating(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Trạng Thái
                  </label>
                  <select
                    value={subStatus}
                    onChange={(e) => setSubStatus(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="Đang thi công">Đang thi công</option>
                    <option value="Chờ huy động">Chờ huy động</option>
                    <option value="Đã hoàn thành">Đã hoàn thành</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 dark:border-slate-700">
                <Button type="button" variant="ghost" onClick={() => setIsAddSubOpen(false)}>
                  Hủy
                </Button>
                <Button type="submit" disabled={isSubmitting} className="bg-amber-600 hover:bg-amber-700 text-white font-bold">
                  {isSubmitting ? 'Đang lưu...' : 'Lưu Thầu Phụ'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CHẤM CÔNG SITE */}
      {isAddAttOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200 dark:border-slate-700 animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gradient-to-r from-amber-600 to-orange-700 text-white">
              <h3 className="text-base font-bold flex items-center gap-2">
                <UserSquare2 size={18} /> Chấm Công Nhân Lực Site
              </h3>
              <button onClick={() => setIsAddAttOpen(false)} className="text-white/80 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateAttendance} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Công Trình / Site *
                </label>
                <input
                  type="text"
                  required
                  value={attSite}
                  onChange={(e) => setAttSite(e.target.value)}
                  placeholder="VD: Solar Farm Ninh Thuận..."
                  className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Ngày Chấm Công
                  </label>
                  <input
                    type="date"
                    value={attDate}
                    onChange={(e) => setAttDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Số Công *
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={attWorkers}
                    onChange={(e) => setAttWorkers(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="VD: 25"
                    className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Đội / Tổ Đội
                  </label>
                  <input
                    type="text"
                    value={attTeam}
                    onChange={(e) => setAttTeam(e.target.value)}
                    placeholder="VD: Tổ khung giàn..."
                    className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Ghi Chú
                  </label>
                  <input
                    type="text"
                    value={attNote}
                    onChange={(e) => setAttNote(e.target.value)}
                    placeholder="VD: Tăng ca đổ móng..."
                    className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 dark:border-slate-700">
                <Button type="button" variant="ghost" onClick={() => setIsAddAttOpen(false)}>
                  Hủy
                </Button>
                <Button type="submit" disabled={isSubmitting} className="bg-amber-600 hover:bg-amber-700 text-white font-bold">
                  {isSubmitting ? 'Đang lưu...' : 'Lưu Chấm Công'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. MODAL: GHI NHẬN HSE */}
      {isAddHseOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200 dark:border-slate-700 animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gradient-to-r from-rose-700 to-orange-700 text-white">
              <h3 className="text-base font-bold flex items-center gap-2">
                <ShieldAlert size={18} /> Ghi Nhận Sự Cố / An Toàn HSE
              </h3>
              <button onClick={() => setIsAddHseOpen(false)} className="text-white/80 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateHse} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Công Trình / Site *
                </label>
                <input
                  type="text"
                  required
                  value={hseSite}
                  onChange={(e) => setHseSite(e.target.value)}
                  placeholder="VD: Solar Farm Ninh Thuận..."
                  className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Nội Dung Ghi Nhận *
                </label>
                <input
                  type="text"
                  required
                  value={hseTitle}
                  onChange={(e) => setHseTitle(e.target.value)}
                  placeholder="VD: Công nhân không đeo dây an toàn trên mái..."
                  className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Phân Loại
                  </label>
                  <select
                    value={hseCategory}
                    onChange={(e) => setHseCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-rose-500"
                  >
                    <option value="Toolbox meeting">Toolbox meeting</option>
                    <option value="Suýt soát">Suýt soát (Near-miss)</option>
                    <option value="Vi phạm an toàn điện">Vi phạm an toàn điện</option>
                    <option value="Vi phạm PCCC">Vi phạm PCCC</option>
                    <option value="Tai nạn lao động">Tai nạn lao động</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Mức Độ
                  </label>
                  <select
                    value={hseSeverity}
                    onChange={(e) => setHseSeverity(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-rose-500"
                  >
                    <option value="low">Thấp</option>
                    <option value="medium">Trung bình</option>
                    <option value="high">Cao</option>
                    <option value="critical">Nghiêm trọng</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Ngày Ghi Nhận
                  </label>
                  <input
                    type="date"
                    value={hseDate}
                    onChange={(e) => setHseDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Hành Động Khắc Phục
                  </label>
                  <input
                    type="text"
                    value={hseAction}
                    onChange={(e) => setHseAction(e.target.value)}
                    placeholder="VD: Dừng việc, đào tạo lại..."
                    className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 dark:border-slate-700">
                <Button type="button" variant="ghost" onClick={() => setIsAddHseOpen(false)}>
                  Hủy
                </Button>
                <Button type="submit" disabled={isSubmitting} className="bg-rose-600 hover:bg-rose-700 text-white font-bold">
                  {isSubmitting ? 'Đang lưu...' : 'Lưu Ghi Nhận'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. DAILY SITE LOG MODAL */}
      {isSiteLogOpen && (
        <DailySiteLogModal
          isOpen={isSiteLogOpen}
          onClose={() => setIsSiteLogOpen(false)}
        />
      )}

      {/* 8. MODAL: DÒNG ĐỜI DỰ ÁN LIÊN PHÒNG BAN */}
      {chainProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-200 dark:border-slate-700 animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gradient-to-r from-amber-600 to-orange-700 text-white shrink-0">
              <h3 className="text-base font-bold">
                Dòng đời dự án: {chainProject.name}
              </h3>
              <button onClick={() => setChainProject(null)} className="text-white/80 hover:text-white">✕</button>
            </div>
            <div className="p-6 overflow-y-auto custom-scrollbar">
              <ProjectChainTimeline project={chainProject} />
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
