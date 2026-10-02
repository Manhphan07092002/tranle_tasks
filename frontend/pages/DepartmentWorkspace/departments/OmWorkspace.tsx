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
import { useNotifications } from '../../../contexts/NotificationContext';
import { statusLabel } from '../../../utils/workspaceStatus';
import { useSlaPolicies, isSlaBreached } from '../hooks/useSla';
import { expectedKwh, hasPvsyst, prPercent } from './omPr';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export const OmWorkspace: React.FC = () => {
  const { showToast } = useNotifications();
  const slaPolicies = useSlaPolicies();
  const [isRmaOpen, setIsRmaOpen] = useState(false);
  const [isFlirOpen, setIsFlirOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'scada' | 'pm' | 'production'>('scada');
  const [alarms, setAlarms] = useState<any[]>([]);
  const [pms, setPms] = useState<any[]>([]);
  const [productions, setProductions] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [prodSiteFilter, setProdSiteFilter] = useState('all');
  const [isAddProdOpen, setIsAddProdOpen] = useState(false);
  const [isAddSiteOpen, setIsAddSiteOpen] = useState(false);
  const [siteName, setSiteName] = useState('');
  const [siteCapacity, setSiteCapacity] = useState<number | ''>('');
  const [siteLocation, setSiteLocation] = useState('');
  const [siteSunHours, setSiteSunHours] = useState<number | ''>(4.5);
  const [siteWarranty, setSiteWarranty] = useState('');
  const [sitePvsyst, setSitePvsyst] = useState<number | ''>('');
  const [prodSite, setProdSite] = useState('');
  const [prodDate, setProdDate] = useState(new Date().toISOString().slice(0, 10));
  const [prodKwh, setProdKwh] = useState<number | ''>('');
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<any>({ activeAlarms: 0, criticalAlarms: 0, totalSchedules: 0 });

  // Add PM Modal State
  const [isAddPmOpen, setIsAddPmOpen] = useState(false);
  const [pmSite, setPmSite] = useState('');
  const [pmTask, setPmTask] = useState('Vệ sinh tấm pin Solar bằng Robot & Siết ốc giàn khung');
  const [pmDate, setPmDate] = useState(new Date().toISOString().split('T')[0]);
  const [pmTeam, setPmTeam] = useState('Đội O&M Miền Nam');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchOmRecords = async () => {
    setLoading(true);
    try {
      const [alarmData, pmData, prodData, siteData, freshKpis] = await Promise.all([
        departmentWorkspaceService.getRecords('dept-om', 'alarms'),
        departmentWorkspaceService.getRecords('dept-om', 'pm'),
        departmentWorkspaceService.getRecords('dept-om', 'production'),
        departmentWorkspaceService.getRecords('dept-om', 'sites'),
        departmentWorkspaceService.getKpis('dept-om')
      ]);
      setAlarms(alarmData);
      setPms(pmData);
      setProductions(prodData);
      setSites(siteData);
      if (freshKpis) setKpis(freshKpis);
    } catch (err) {
      console.error('Error fetching om records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOmRecords();
  }, []);

  const handleCreatePm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pmSite.trim() || !pmTask) return;

    try {
      setIsSubmitting(true);
      await departmentWorkspaceService.createRecord('dept-om', 'pm', {
        site: pmSite.trim(),
        task: pmTask,
        date: pmDate || new Date().toISOString().slice(0, 10),
        team: pmTeam.trim() || 'Đội O&M Miền Nam',
        status: 'scheduled'
      });
      setIsAddPmOpen(false);
      setPmSite('');
      setPmTask('Vệ sinh tấm pin Solar bằng Robot & Siết ốc giàn khung');
      setPmDate(new Date().toISOString().slice(0, 10));
      setPmTeam('Đội O&M Miền Nam');
      fetchOmRecords();
    } catch (err) {
      console.error('Error creating PM schedule:', err);
      showToast({ type: 'error', title: 'Lập lịch thất bại', message: 'Vui lòng thử lại.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAckAlarm = async (alm: any) => {
    try {
      await departmentWorkspaceService.updateRecord('dept-om', 'alarms', alm.id, {
        ...alm,
        status: 'investigating'
      });
      fetchOmRecords();
    } catch (err) {
      console.error('Error acknowledging alarm:', err);
      showToast({ type: 'error', title: 'Tiếp nhận cảnh báo thất bại', message: 'Vui lòng thử lại.' });
    }
  };

  const handleResolveAlarm = async (alm: any) => {
    try {
      await departmentWorkspaceService.updateRecord('dept-om', 'alarms', alm.id, {
        ...alm,
        status: 'resolved'
      });
      fetchOmRecords();
    } catch (err) {
      console.error('Error resolving alarm:', err);
      showToast({ type: 'error', title: 'Xử lý cảnh báo thất bại', message: 'Vui lòng thử lại.' });
    }
  };

  const handleCompletePm = async (pm: any) => {
    try {
      await departmentWorkspaceService.updateRecord('dept-om', 'pm', pm.id, {
        ...pm,
        status: 'done'
      });
      fetchOmRecords();
    } catch (err) {
      console.error('Error completing PM:', err);
      showToast({ type: 'error', title: 'Hoàn thành bảo trì thất bại', message: 'Vui lòng thử lại.' });
    }
  };

  const isAlarmOpen = (a: any) => a.status === 'active' || a.status === 'investigating';

  const handleCreateSite = async (e: React.FormEvent) => {
    e.preventDefault();
    const cap = Number(siteCapacity);
    if (!siteName.trim() || !Number.isFinite(cap) || cap <= 0) return;

    try {
      setIsSubmitting(true);
      await departmentWorkspaceService.createRecord('dept-om', 'sites', {
        name: siteName.trim(),
        capacityKwp: cap,
        location: siteLocation.trim(),
        sunHours: Number(siteSunHours) || 4.5,
        warrantyExpiry: siteWarranty || null,
        pvsystExpectedKwh: Number(sitePvsyst) > 0 ? Number(sitePvsyst) : null
      });
      setIsAddSiteOpen(false);
      setSiteName('');
      setSiteCapacity('');
      setSiteLocation('');
      setSiteSunHours(4.5);
      setSiteWarranty('');
      setSitePvsyst('');
      fetchOmRecords();
    } catch (err) {
      console.error('Error creating site:', err);
      showToast({ type: 'error', title: 'Thêm trạm thất bại', message: 'Vui lòng thử lại.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateProduction = async (e: React.FormEvent) => {
    e.preventDefault();
    const kwh = Number(prodKwh);
    if (!prodSite.trim() || !Number.isFinite(kwh) || kwh < 0) return;

    try {
      setIsSubmitting(true);
      await departmentWorkspaceService.createRecord('dept-om', 'production', {
        site: prodSite.trim(),
        date: prodDate || new Date().toISOString().slice(0, 10),
        kwh
      });
      setIsAddProdOpen(false);
      setProdSite('');
      setProdDate(new Date().toISOString().slice(0, 10));
      setProdKwh('');
      fetchOmRecords();
    } catch (err) {
      console.error('Error logging production:', err);
      showToast({ type: 'error', title: 'Ghi sản lượng thất bại', message: 'Vui lòng thử lại.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const prodSites = sites.length > 0
    ? sites.map((s: any) => s.name)
    : [...new Set(productions.map((p: any) => p.site))];

  // PR thực: suất sản lượng (kWh/kWp) + cảnh báo khi ngày mới nhất < 70% TB 7 ngày trước.
  const todayStr = new Date().toISOString().slice(0, 10);
  const sitePrStats = prodSites.map((name: string) => {
    const site = sites.find((s: any) => s.name === name);
    const cap = Number(site?.capacityKwp) || 0;
    const rows = productions
      .filter((p: any) => p.site === name)
      .slice()
      .sort((a: any, b: any) => String(b.date).localeCompare(String(a.date)));
    const latest = rows[0];
    const prev = rows.slice(1, 8);
    const avg = prev.length >= 2
      ? prev.reduce((s: number, p: any) => s + (Number(p.kwh) || 0), 0) / prev.length
      : null;
    const latestKwh = latest ? Number(latest.kwh) || 0 : 0;
    const low = avg !== null && avg > 0 && latestKwh < avg * 0.7;
    // PR% = sản lượng thực / kỳ vọng (ưu tiên PVsyst nhập tay, fallback công suất × giờ nắng).
    const expected = expectedKwh(site);
    const pr = latest ? prPercent(latestKwh, expected) : null;
    // Bảo hành còn lại (ngày).
    let warrantyLeft: number | null = null;
    if (site?.warrantyExpiry) {
      const diff = Math.ceil((new Date(site.warrantyExpiry).getTime() - new Date(`${todayStr}T00:00:00`).getTime()) / 86400000);
      warrantyLeft = Number.isFinite(diff) ? diff : null;
    }
    return {
      name,
      capacity: cap,
      latestKwh,
      latestDate: latest?.date || '—',
      yield: cap > 0 ? Math.round((latestKwh / cap) * 100) / 100 : null,
      avg: avg !== null ? Math.round(avg) : null,
      low,
      pr,
      pvsyst: hasPvsyst(site),
      expected: expected > 0 ? Math.round(expected) : null,
      warrantyLeft,
    };
  });
  const chartData = productions
    .filter((p: any) => prodSiteFilter === 'all' || p.site === prodSiteFilter)
    .slice()
    .sort((a: any, b: any) => String(a.date).localeCompare(String(b.date)))
    .slice(-14)
    .map((p: any) => ({ date: String(p.date).slice(5), kwh: Number(p.kwh) || 0 }));
  const resolvedAlarms = alarms.filter(a => !isAlarmOpen(a));
  const resolveRate = alarms.length > 0 ? Math.round((resolvedAlarms.length / alarms.length) * 100) : null;
  const donePms = pms.filter(p => p.status === 'done' || p.status === 'completed');
  const pmDoneRate = pms.length > 0 ? Math.round((donePms.length / pms.length) * 100) : null;

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
            <span className="text-xs font-bold uppercase tracking-wider">Tỷ Lệ Xử Lý Cảnh Báo</span>
            <Activity size={18} className="text-emerald-400" />
          </div>
          <div className="text-3xl font-black text-emerald-400">
            {resolveRate === null ? '—' : `${resolveRate}%`}
          </div>
          <div className="text-xs text-emerald-400/80 font-bold mt-2">
            {resolvedAlarms.length}/{alarms.length} cảnh báo đã xử lý xong
          </div>
        </div>

        <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-4">
            <span className="text-xs font-bold uppercase tracking-wider">Bảo Trì Hoàn Thành</span>
            <Wrench size={18} className="text-purple-400" />
          </div>
          <div className="text-3xl font-black text-purple-400">
            {pmDoneRate === null ? '—' : `${pmDoneRate}%`}
          </div>
          <div className="text-xs text-purple-300/70 font-medium mt-2">
            {donePms.length}/{pms.length} đợt bảo trì đã xong
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
          <button 
            onClick={() => setActiveTab('production')}
            className={`px-6 py-3 text-sm font-bold rounded-t-2xl transition-colors flex items-center gap-2 ${
              activeTab === 'production' 
                ? 'bg-slate-900 text-cyan-400 border-t border-l border-r border-slate-800 -mb-[1px]' 
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Sun size={16} /> Sản Lượng kWh ({productions.length})
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
                      {statusLabel(alm.severity)}
                    </span>
                    {isAlarmOpen(alm) && isSlaBreached('om', alm, slaPolicies) && (
                      <span className="ml-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-500/20 text-rose-400 border border-rose-500/30">
                        Quá SLA
                      </span>
                    )}
                  </div>
                  <div className="col-span-2">
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      {alm.status === 'active' ? <AlertCircle size={12} className="text-rose-400"/> : 
                       alm.status === 'investigating' ? <Settings2 size={12} className="text-amber-400"/> :
                       <ShieldCheck size={12} className="text-emerald-400"/>}
                      {statusLabel(alm.status)}
                    </span>
                    {isAlarmOpen(alm) && (
                      <div className="flex gap-1 mt-1.5">
                        {alm.status === 'active' && (
                          <button
                            onClick={() => handleAckAlarm(alm)}
                            className="px-2 py-1 rounded-lg text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30"
                          >
                            Tiếp nhận
                          </button>
                        )}
                        <button
                          onClick={() => handleResolveAlarm(alm)}
                          className="px-2 py-1 rounded-lg text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30"
                        >
                          Xong
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="col-span-2 text-right text-xs text-slate-400">
                    {alm.time ? String(alm.time).slice(0, 10) : '—'}
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
                      {statusLabel(pm.status)}
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
                    {pm.status === 'scheduled' && (
                      <button
                        onClick={() => handleCompletePm(pm)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white"
                      >
                        Hoàn thành
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* CONTENT: PRODUCTION */}
          {activeTab === 'production' && (
            <div className="space-y-4">
              <div className="flex flex-wrap justify-between items-center gap-2">
                <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                  Sản Lượng Phát Điện Theo Ngày (kWh)
                </h3>
                <div className="flex items-center gap-2">
                  <select
                    value={prodSiteFilter}
                    onChange={(e) => setProdSiteFilter(e.target.value)}
                    className="px-3 py-2 border border-slate-700 rounded-xl bg-slate-800 text-white text-xs outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="all">Tất cả site</option>
                    {prodSites.map((s: string) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <Button size="sm" onClick={() => setIsAddSiteOpen(true)} variant="ghost" className="text-white text-xs font-bold rounded-xl">
                    + Trạm
                  </Button>
                  <Button size="sm" onClick={() => setIsAddProdOpen(true)} className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-xl">
                    <Plus size={14} className="mr-1" /> Ghi Sản Lượng
                  </Button>
                </div>
              </div>

              {/* PR thực theo trạm: suất kWh/kWp + cảnh báo thấp */}
              {sitePrStats.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {sitePrStats.map((s) => (
                    <div key={s.name} className={`p-4 rounded-2xl border ${
                      s.low
                        ? 'bg-rose-950/40 border-rose-500/40'
                        : 'bg-slate-950/50 border-slate-800'
                    }`}>
                      <div className="flex justify-between items-center gap-2">
                        <span className="font-bold text-sm text-slate-200 truncate">{s.name}</span>
                        {s.low ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-500/20 text-rose-300 border border-rose-500/30 shrink-0">
                            Sản lượng thấp
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                            Ổn định
                          </span>
                        )}
                      </div>
                      <div className="flex gap-4 mt-2 text-xs text-slate-400">
                        <span>Công suất: <span className="font-bold text-slate-200">{s.capacity > 0 ? `${s.capacity} kWp` : '—'}</span></span>
                        <span>Mới nhất: <span className="font-bold text-cyan-400">{s.latestKwh.toLocaleString('vi-VN')} kWh ({s.latestDate})</span></span>
                      </div>
                      <div className="flex gap-4 mt-1 text-xs text-slate-400">
                        <span>Suất: <span className="font-bold text-slate-200">{s.yield !== null ? `${s.yield} kWh/kWp` : '—'}</span></span>
                        <span>TB 7 ngày: <span className="font-bold text-slate-200">{s.avg !== null ? `${s.avg.toLocaleString('vi-VN')} kWh` : '—'}</span></span>
                        {s.pvsyst && <span>Kỳ vọng PVsyst: <span className="font-bold text-violet-300">{s.expected !== null ? `${s.expected.toLocaleString('vi-VN')} kWh` : '—'}</span></span>}
                      </div>
                      <div className="flex gap-4 mt-1 text-xs text-slate-400">
                        <span>PR thực: {s.pr === null ? (
                          <span className="font-bold text-slate-200">—</span>
                        ) : (
                          <span className={`font-black ${s.pr >= 75 ? 'text-emerald-300' : s.pr >= 50 ? 'text-amber-300' : 'text-rose-300'}`}>{s.pr}%</span>
                        )}</span>
                        {s.warrantyLeft !== null && (
                          <span>Bảo hành: {s.warrantyLeft < 0 ? (
                            <span className="font-bold text-rose-300">hết hạn</span>
                          ) : s.warrantyLeft <= 90 ? (
                            <span className="font-bold text-amber-300">còn {s.warrantyLeft} ngày</span>
                          ) : (
                            <span className="font-bold text-slate-200">còn {s.warrantyLeft} ngày</span>
                          )}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {chartData.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-sm">Chưa có số liệu sản lượng — ghi nhận kWh hằng ngày từ SCADA</div>
              ) : (
                <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-4">
                  <ResponsiveContainer width="100%" height={240}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: 12, fontSize: 12 }}
                        formatter={(v: any) => [`${Number(v).toLocaleString('vi-VN')} kWh`, 'Sản lượng']}
                      />
                      <Line type="monotone" dataKey="kwh" stroke="#22d3ee" strokeWidth={2.5} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              <div className="space-y-2">
                {productions
                  .filter((p: any) => prodSiteFilter === 'all' || p.site === prodSiteFilter)
                  .slice()
                  .sort((a: any, b: any) => String(b.date).localeCompare(String(a.date)))
                  .slice(0, 10)
                  .map((p: any) => (
                    <div key={p.id} className="flex justify-between items-center px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-sm">
                      <span className="font-bold text-slate-200">{p.site}</span>
                      <span className="text-xs text-slate-400">{p.date}</span>
                      <span className="font-black text-cyan-400">{Number(p.kwh).toLocaleString('vi-VN')} kWh</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* MODAL: THÊM TRẠM GIÁM SÁT */}
      {isAddSiteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 text-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-700 animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-gradient-to-r from-cyan-900 to-slate-900">
              <h3 className="text-base font-bold">Thêm Trạm Giám Sát Sản Lượng</h3>
              <button onClick={() => setIsAddSiteOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateSite} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Tên Site / Nhà Máy *
                </label>
                <input
                  type="text"
                  required
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                  placeholder="VD: Solar Farm Ninh Thuận 5 MWp..."
                  className="w-full px-3.5 py-2.5 border border-slate-700 rounded-xl bg-slate-800 text-white outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Công Suất (kWp) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={siteCapacity}
                    onChange={(e) => setSiteCapacity(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="VD: 5000"
                    className="w-full px-3.5 py-2.5 border border-slate-700 rounded-xl bg-slate-800 text-white outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Địa Điểm
                  </label>
                  <input
                    type="text"
                    value={siteLocation}
                    onChange={(e) => setSiteLocation(e.target.value)}
                    placeholder="VD: Ninh Thuận"
                    className="w-full px-3.5 py-2.5 border border-slate-700 rounded-xl bg-slate-800 text-white outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Giờ Nắng Chuẩn/ngày
                  </label>
                  <input
                    type="number"
                    min={0.5}
                    max={10}
                    step={0.1}
                    value={siteSunHours}
                    onChange={(e) => setSiteSunHours(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="VD: 4.5"
                    className="w-full px-3.5 py-2.5 border border-slate-700 rounded-xl bg-slate-800 text-white outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Hết Hạn Bảo Hành
                  </label>
                  <input
                    type="date"
                    value={siteWarranty}
                    onChange={(e) => setSiteWarranty(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-700 rounded-xl bg-slate-800 text-white outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Kỳ Vọng PVsyst (kWh/ngày) — không bắt buộc
                </label>
                <input
                  type="number"
                  min={0}
                  value={sitePvsyst}
                  onChange={(e) => setSitePvsyst(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="VD: 22000 (bỏ trống = dùng công suất × giờ nắng)"
                  className="w-full px-3.5 py-2.5 border border-slate-700 rounded-xl bg-slate-800 text-white outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
                <Button type="button" variant="ghost" onClick={() => setIsAddSiteOpen(false)} className="text-slate-400 hover:text-white">
                  Hủy
                </Button>
                <Button type="submit" disabled={isSubmitting} className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold">
                  {isSubmitting ? 'Đang lưu...' : 'Lưu Trạm'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: GHI SẢN LƯỢNG */}
      {isAddProdOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 text-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-700 animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-gradient-to-r from-cyan-900 to-slate-900">
              <h3 className="text-base font-bold flex items-center gap-2">
                <Sun size={18} className="text-cyan-400" /> Ghi Sản Lượng Ngày (kWh)
              </h3>
              <button onClick={() => setIsAddProdOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateProduction} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Site / Nhà Máy *
                </label>
                {sites.length > 0 ? (
                  <select
                    value={prodSite}
                    onChange={(e) => setProdSite(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-700 rounded-xl bg-slate-800 text-white outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="">— Chọn site —</option>
                    {sites.map((s: any) => (
                      <option key={s.id} value={s.name}>{s.name}{s.capacityKwp ? ` (${s.capacityKwp} kWp)` : ''}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    required
                    value={prodSite}
                    onChange={(e) => setProdSite(e.target.value)}
                    placeholder="VD: Solar Farm Ninh Thuận 5 MWp..."
                    className="w-full px-3.5 py-2.5 border border-slate-700 rounded-xl bg-slate-800 text-white outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Ngày Ghi Nhận
                  </label>
                  <input
                    type="date"
                    value={prodDate}
                    onChange={(e) => setProdDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-700 rounded-xl bg-slate-800 text-white outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Sản Lượng (kWh) *
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={prodKwh}
                    onChange={(e) => setProdKwh(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="VD: 24500"
                    className="w-full px-3.5 py-2.5 border border-slate-700 rounded-xl bg-slate-800 text-white outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
                <Button type="button" variant="ghost" onClick={() => setIsAddProdOpen(false)} className="text-slate-400 hover:text-white">
                  Hủy
                </Button>
                <Button type="submit" disabled={isSubmitting} className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold">
                  {isSubmitting ? 'Đang lưu...' : 'Lưu Sản Lượng'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

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
