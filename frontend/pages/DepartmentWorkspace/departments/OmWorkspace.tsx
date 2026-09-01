import React, { useState, useEffect } from 'react';
import { 
  Activity, ShieldCheck, Wrench, Zap, Flame, AlertCircle, 
  Settings2, Sun, ThermometerSun, Droplets, ArrowRight, Fan, 
  Loader2, Plus, X
} from 'lucide-react';
import { Button } from '../../../components/UI';
import { SajRmaTicketModal } from '../../../components/om/SajRmaTicketModal';
import { FlirThermalScanModal } from '../../../components/om/FlirThermalScanModal';
import { departmentWorkspaceService } from '../../../services/departmentWorkspaceService';

export const OmWorkspace: React.FC = () => {
  const [isRmaOpen, setIsRmaOpen] = useState(false);
  const [isFlirOpen, setIsFlirOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'scada' | 'pm'>('scada');
  const [alarms, setAlarms] = useState<any[]>([]);
  const [pms, setPms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<any>({ activeAlarms: 0, criticalAlarms: 0, totalSchedules: 0 });

  // Add PM Modal State
  const [isAddPmOpen, setIsAddPmOpen] = useState(false);
  const [pmSite, setPmSite] = useState('');
  const [pmTask, setPmTask] = useState('');
  const [pmDate, setPmDate] = useState(new Date().toISOString().split('T')[0]);
  const [pmTeam, setPmTeam] = useState('Đội O&M Miền Nam');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchOmRecords = async () => {
    setLoading(true);
    try {
      if (activeTab === 'scada') {
        const data = await departmentWorkspaceService.getRecords('dept-om', 'alarms');
        setAlarms(data);
      } else if (activeTab === 'pm') {
        const data = await departmentWorkspaceService.getRecords('dept-om', 'pm');
        setPms(data);
      }
    } catch (err) {
      console.error('Error fetching om records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    departmentWorkspaceService.getKpis('dept-om').then(setKpis).catch(console.error);
  }, []);

  useEffect(() => {
    fetchOmRecords();
  }, [activeTab]);

  const handleCreatePm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pmSite.trim()) return;

    try {
      setIsSubmitting(true);
      await departmentWorkspaceService.createRecord('dept-om', 'pm', {
        site: pmSite.trim(),
        task: pmTask,
        date: pmDate,
        team: pmTeam,
        status: 'scheduled'
      });
      setIsAddPmOpen(false);
      setPmSite('');
      fetchOmRecords();
    } catch (err) {
      console.error('Error creating PM schedule:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-20 bg-slate-950 p-6 rounded-3xl min-h-screen text-slate-100 animate-in fade-in duration-300">
      {/* 1. HEADER & SCADA DASHBOARD */}
      <div className="bg-gradient-to-r from-cyan-900 via-slate-900 to-blue-950 text-white p-8 rounded-3xl border border-cyan-800/50 shadow-[0_0_40px_-10px_rgba(8,145,178,0.3)] relative overflow-hidden">
        <div className="absolute inset-0 opacity-5 pointer-events-none" 
             style={{ backgroundImage: 'linear-gradient(#0891b2 1px, transparent 1px), linear-gradient(90deg, #0891b2 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 bg-cyan-950 rounded-xl border border-cyan-500/30">
                <Activity className="text-cyan-400" size={28} />
              </div>
              <h2 className="text-3xl font-black text-white tracking-tight">O&M SAJ Service Center</h2>
            </div>
            <p className="text-cyan-200/70 text-sm max-w-2xl leading-relaxed">
              Hệ thống giám sát điều độ trung tâm. Quản lý sản lượng phát điện, cảnh báo Inverter SAJ, tiếp nhận bảo hành RMA và điều phối bảo trì rửa pin (Preventive Maintenance).
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={() => setIsRmaOpen(true)}
              className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs px-4 py-2.5 shadow-[0_0_15px_rgba(8,145,178,0.5)] rounded-xl transition-all"
            >
              <Wrench size={16} className="mr-1.5" /> Tạo Ticket RMA SAJ
            </Button>
            <Button
              onClick={() => setIsFlirOpen(true)}
              className="bg-slate-800 hover:bg-slate-700 text-rose-400 border border-rose-500/30 font-bold text-xs px-4 py-2.5 rounded-xl transition-all"
            >
              <Flame size={16} className="mr-1.5 inline" /> Báo Cáo Nhiệt FLIR
            </Button>
          </div>
        </div>
      </div>

      {/* Real-time KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-4">
            <span className="text-xs font-bold uppercase tracking-wider">Cảnh Báo Hoạt Động</span>
            <AlertCircle size={18} className="text-rose-400" />
          </div>
          <div className="text-3xl font-black text-white">
            {kpis.activeAlarms} <span className="text-sm font-medium text-slate-500">sự cố</span>
          </div>
          <div className="text-xs text-rose-400/80 font-bold mt-2">
            {kpis.criticalAlarms > 0 ? `${kpis.criticalAlarms} lỗi nghiêm trọng cần xử lý` : 'Trạng thái ổn định'}
          </div>
        </div>

        <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-4">
            <span className="text-xs font-bold uppercase tracking-wider">Lịch Bảo Trì Định Kỳ</span>
            <Droplets size={18} className="text-cyan-400" />
          </div>
          <div className="text-3xl font-black text-cyan-400">
            {kpis.totalSchedules} <span className="text-sm font-medium text-slate-500">đợt</span>
          </div>
          <div className="text-xs text-cyan-300/70 font-medium mt-2">
            Vệ sinh tấm pin & siết ốc kết cấu
          </div>
        </div>

        <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-4">
            <span className="text-xs font-bold uppercase tracking-wider">Hiệu Suất Vận Hành (PR)</span>
            <Activity size={18} className="text-emerald-400" />
          </div>
          <div className="text-3xl font-black text-emerald-400">
            83.6%
          </div>
          <div className="text-xs text-emerald-400/80 font-bold mt-2">
            Đạt chuẩn thiết kế PVsyst
          </div>
        </div>

        <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-4">
            <span className="text-xs font-bold uppercase tracking-wider">Trung Tâm RMA SAJ</span>
            <Wrench size={18} className="text-purple-400" />
          </div>
          <div className="text-3xl font-black text-purple-400">
            24/7
          </div>
          <div className="text-xs text-purple-300/70 font-medium mt-2">
            Sẵn sàng linh kiện bo mạch thay thế
          </div>
        </div>
      </div>

      {/* Main SCADA & Maintenance Tabs */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col min-h-[500px]">
        {/* Tab Headers */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 px-6 pt-4 gap-2">
          <button 
            onClick={() => setActiveTab('scada')}
            className={`px-6 py-3 text-sm font-bold rounded-t-2xl transition-colors flex items-center gap-2 ${
              activeTab === 'scada' 
                ? 'bg-slate-900 text-cyan-400 border-t border-l border-r border-slate-800 -mb-[1px]' 
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Activity size={16} /> Cảnh Báo Inverter & Lưới ({alarms.length})
          </button>
          <button 
            onClick={() => setActiveTab('pm')}
            className={`px-6 py-3 text-sm font-bold rounded-t-2xl transition-colors flex items-center gap-2 ${
              activeTab === 'pm' 
                ? 'bg-slate-900 text-cyan-400 border-t border-l border-r border-slate-800 -mb-[1px]' 
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Settings2 size={16} /> Lịch Bảo Trì & Rửa Pin ({pms.length})
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
          
          {/* CONTENT: ALARMS */}
          {activeTab === 'scada' && (
            <div className="space-y-4">
              <div className="grid grid-cols-12 gap-4 px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-950/50 rounded-xl">
                <div className="col-span-2">Mã Lỗi</div>
                <div className="col-span-4">Chi Tiết Sự Cố</div>
                <div className="col-span-2">Mức Độ</div>
                <div className="col-span-2">Trạng Thái</div>
                <div className="col-span-2 text-right">Thời Gian</div>
              </div>
              
              {loading ? (
                <div className="p-8 text-center"><Loader2 className="animate-spin inline text-cyan-500" size={24} /></div>
              ) : alarms.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-sm">Hệ thống SCADA không ghi nhận cảnh báo hoặc sự cố nào</div>
              ) : alarms.map(alm => (
                <div key={alm.id} className="grid grid-cols-12 gap-4 px-4 py-4 items-center bg-slate-800/50 border border-slate-700/50 rounded-xl hover:border-cyan-500/50 transition-colors">
                  <div className="col-span-2 font-bold text-sm text-white">{alm.id}</div>
                  <div className="col-span-4">
                    <div className="font-bold text-sm text-slate-200">{alm.fault}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{alm.site} • {alm.inverter}</div>
                  </div>
                  <div className="col-span-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                      alm.severity === 'critical' ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' :
                      alm.severity === 'high' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' :
                      'bg-slate-700 text-slate-300 border-slate-600'
                    }`}>
                      {alm.severity}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      {alm.status === 'active' ? <AlertCircle size={12} className="text-rose-400"/> : 
                       alm.status === 'investigating' ? <Settings2 size={12} className="text-amber-400"/> :
                       <ShieldCheck size={12} className="text-emerald-400"/>}
                      {alm.status}
                    </span>
                  </div>
                  <div className="col-span-2 text-right text-xs text-slate-400">
                    {alm.time || 'Vừa xong'}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* CONTENT: PREVENTIVE MAINTENANCE */}
          {activeTab === 'pm' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Kế hoạch bảo trì định kỳ</span>
                <Button size="sm" onClick={() => setIsAddPmOpen(true)} className="bg-cyan-600 text-white hover:bg-cyan-700 text-xs font-bold rounded-xl">
                  <Plus size={14} className="mr-1" /> Lên Lịch Mới
                </Button>
              </div>

              {loading ? (
                <div className="p-8 text-center"><Loader2 className="animate-spin inline text-cyan-500" size={24} /></div>
              ) : pms.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-sm">Chưa có lịch bảo trì định kỳ nào</div>
              ) : pms.map(pm => (
                <div key={pm.id} className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-5 flex flex-col md:flex-row gap-6 hover:border-cyan-500/30 transition-colors">
                  <div className="md:w-1/4 border-r border-slate-700 pr-4">
                    <div className="text-sm font-black text-white mb-1">{pm.id}</div>
                    <div className="text-xs text-slate-400 mb-2">Dự án: <span className="font-bold text-cyan-400">{pm.site}</span></div>
                    <span className="bg-slate-700 text-slate-300 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                      {pm.status}
                    </span>
                  </div>
                  <div className="md:w-2/4">
                    <div className="text-xs font-bold text-slate-500 uppercase mb-1">Nhiệm Vụ Bảo Trì</div>
                    <div className="text-sm font-medium text-slate-200">{pm.task}</div>
                    <div className="text-[11px] text-slate-400 mt-2 flex items-center gap-1">
                      <Fan size={12} /> Đơn vị thực hiện: {pm.team}
                    </div>
                  </div>
                  <div className="md:w-1/4 flex flex-col justify-center items-end gap-2">
                    <div className="text-xs text-slate-400">Ngày dự kiến: {pm.date}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>

      {/* MODAL: LẬP LỊCH BẢO TRÌ */}
      {isAddPmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 text-slate-900 dark:text-white">
          <div className="bg-slate-900 text-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-700 animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-gradient-to-r from-cyan-900 to-slate-900">
              <h3 className="text-base font-bold flex items-center gap-2">
                <Settings2 size={18} className="text-cyan-400" /> Lập Lịch Bảo Trì / Vệ Sinh Pin
              </h3>
              <button onClick={() => setIsAddPmOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreatePm} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Tên Dự Án / Nhà Máy *
                </label>
                <input
                  type="text"
                  required
                  value={pmSite}
                  onChange={(e) => setPmSite(e.target.value)}
                  placeholder="VD: Solar Farm Ninh Thuận 5 MWp..."
                  className="w-full px-3.5 py-2.5 border border-slate-700 rounded-xl bg-slate-800 text-white outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Hạng Mục Bảo Dưỡng
                </label>
                <select
                  value={pmTask}
                  onChange={(e) => setPmTask(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-700 rounded-xl bg-slate-800 text-white outline-none focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="Vệ sinh tấm pin Solar bằng Robot & Siết ốc giàn khung">Vệ sinh tấm pin Solar bằng Robot & Siết ốc giàn khung</option>
                  <option value="Bảo dưỡng định kỳ Inverter SAJ & Tủ phân phối AC">Bảo dưỡng định kỳ Inverter SAJ & Tủ phân phối AC</option>
                  <option value="Đo điện trở đất & Kiểm định hệ thống chống sét">Đo điện trở đất & Kiểm định hệ thống chống sét</option>
                  <option value="Quét camera nhiệt FLIR phát hiện Hotspot pin">Quét camera nhiệt FLIR phát hiện Hotspot pin</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Ngày Triển Khai
                  </label>
                  <input
                    type="date"
                    value={pmDate}
                    onChange={(e) => setPmDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-700 rounded-xl bg-slate-800 text-white outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Đội Phụ Trách
                  </label>
                  <input
                    type="text"
                    value={pmTeam}
                    onChange={(e) => setPmTeam(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-700 rounded-xl bg-slate-800 text-white outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
                <Button type="button" variant="ghost" onClick={() => setIsAddPmOpen(false)} className="text-slate-400 hover:text-white">
                  Hủy
                </Button>
                <Button type="submit" disabled={isSubmitting} className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold">
                  {isSubmitting ? 'Đang lưu...' : 'Lưu Lịch'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RMA Ticket Modal */}
      {isRmaOpen && (
        <SajRmaTicketModal
          isOpen={isRmaOpen}
          onClose={() => setIsRmaOpen(false)}
        />
      )}

      {/* FLIR Thermal Scan Modal */}
      {isFlirOpen && (
        <FlirThermalScanModal
          isOpen={isFlirOpen}
          onClose={() => setIsFlirOpen(false)}
        />
      )}

    </div>
  );
};
