import React, { useState, useEffect } from 'react';
import { 
  Cpu, FileSpreadsheet, Compass, Calculator, Ruler, Map, 
  Settings, PenTool, ClipboardList, CheckCircle2, AlertCircle, 
  Play, Loader2, Plus, Zap, Layers, Sparkles, X
} from 'lucide-react';
import { Button } from '../../../components/UI';
import { WorkQueue } from '../../../components/workflow/WorkQueue';
import { DepartmentRequestPanel } from '../../../components/workflow/DepartmentRequestPanel';
import { departmentWorkspaceService } from '../../../services/departmentWorkspaceService';

interface EngineeringWorkspaceProps {
  onOpenFastQuote: () => void;
}

export const EngineeringWorkspace: React.FC<EngineeringWorkspaceProps> = ({
  onOpenFastQuote
}) => {
  const [activeTab, setActiveTab] = useState<'requests' | 'design'>('requests');
  const [requests, setRequests] = useState<any[]>([]);
  const [designs, setDesigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<any>({ pendingRequests: 0, inDesign: 0, completedBom: 0, urgentRequests: 0 });

  // Modals state
  const [isAddRequestOpen, setIsAddRequestOpen] = useState(false);
  const [isSizingCalcOpen, setIsSizingCalcOpen] = useState(false);
  const [isAddDesignOpen, setIsAddDesignOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New Request Form
  const [reqProject, setReqProject] = useState('');
  const [reqType, setReqType] = useState('Khảo Sát Mái');
  const [reqPriority, setReqPriority] = useState('HIGH');
  const [reqDate, setReqDate] = useState(new Date().toISOString().split('T')[0]);

  // New Design Form
  const [designName, setDesignName] = useState('');
  const [designCapacity, setDesignCapacity] = useState('');
  const [designStage, setDesignStage] = useState('Bản vẽ 1 sợi SLD');
  const [actionStatusMessage, setActionStatusMessage] = useState<string | null>(null);

  // PV String Sizing State (AIKO 650Wp & SAJ Inverter)
  const [panelWattage, setPanelWattage] = useState<number>(650);
  const [panelVoc, setPanelVoc] = useState<number>(54.2);
  const [panelVmp, setPanelVmp] = useState<number>(45.1);
  const [inverterCapKw, setInverterCapKw] = useState<number>(100);
  const [panelsPerString, setPanelsPerString] = useState<number>(18);
  const [numStrings, setNumStrings] = useState<number>(10);

  const fetchEngRecords = async () => {
    setLoading(true);
    try {
      if (activeTab === 'requests') {
        const data = await departmentWorkspaceService.getRecords('dept-eng', 'requests');
        setRequests(data);
      } else if (activeTab === 'design') {
        const data = await departmentWorkspaceService.getRecords('dept-eng', 'design');
        setDesigns(data);
      }
    } catch (err) {
      console.error('Error fetching records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    departmentWorkspaceService.getKpis('dept-eng').then(setKpis).catch(console.error);
  }, []);

  useEffect(() => {
    fetchEngRecords();
  }, [activeTab]);

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqProject.trim()) return;

    try {
      setIsSubmitting(true);
      await departmentWorkspaceService.createRecord('dept-eng', 'requests', {
        project: reqProject.trim(),
        type: reqType,
        priority: reqPriority,
        date: reqDate,
        status: 'pending'
      });
      setIsAddRequestOpen(false);
      setReqProject('');
      fetchEngRecords();
    } catch (err) {
      console.error('Error creating request:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateDesign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!designName.trim()) return;

    try {
      setIsSubmitting(true);
      await departmentWorkspaceService.createRecord('dept-eng', 'design', {
        name: designName.trim(),
        capacity: designCapacity,
        stage: designStage,
        progress: 10,
        tasks: ['Khảo sát hiện trường', 'Mô phỏng PVsyst', 'Vẽ AutoCAD SLD', 'Bóc tách BOM'],
        status: 'active'
      });
      setIsAddDesignOpen(false);
      setDesignName('');
      fetchEngRecords();
    } catch (err) {
      console.error('Error creating design:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Sizing Calculations
  const totalPanels = panelsPerString * numStrings;
  const totalDcCapacityKwp = (totalPanels * panelWattage) / 1000;
  const stringVoc = Math.round(panelsPerString * panelVoc * 1.1 * 10) / 10; // Cold weather factor
  const stringVmp = Math.round(panelsPerString * panelVmp * 10) / 10;
  const dcAcRatio = Math.round((totalDcCapacityKwp / inverterCapKw) * 100) / 100;

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-300">
      {/* 1. HEADER & KPI */}
      <div className="bg-gradient-to-r from-teal-900 via-teal-800 to-slate-900 text-white p-8 rounded-3xl border border-teal-700 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-teal-400/20 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 bg-teal-500/20 rounded-xl border border-teal-400/30 backdrop-blur-sm">
                <Cpu className="text-teal-300" size={28} />
              </div>
              <h2 className="text-3xl font-black text-white tracking-tight">Engineering Studio</h2>
            </div>
            <p className="text-teal-100 text-sm max-w-2xl leading-relaxed">
              Trung tâm thiết kế & Kỹ thuật điện mặt trời. Tiếp nhận yêu cầu khảo sát (Site Survey), mô phỏng PVsyst, thiết kế AutoCAD SLD và bóc tách dự toán vật tư (BOM/BOQ).
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={() => setIsAddRequestOpen(true)}
              className="bg-teal-500 hover:bg-teal-400 text-slate-900 font-black text-xs px-4 py-2.5 shadow-lg shadow-teal-500/20 rounded-xl transition-transform hover:scale-105"
            >
              <Plus size={16} className="mr-1.5" />
              Yêu Cầu Khảo Sát
            </Button>
            <Button
              onClick={() => setIsSizingCalcOpen(true)}
              className="bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-transform hover:scale-105"
            >
              <Zap size={16} className="mr-1.5" />
              Tính Chuỗi Pin & Inverter
            </Button>
            <Button
              onClick={onOpenFastQuote}
              className="bg-white/10 hover:bg-white/20 text-white font-bold text-xs px-4 py-2.5 border border-white/20 rounded-xl backdrop-blur-md transition-transform hover:scale-105"
            >
              <Calculator size={16} className="mr-1.5" />
              Báo Giá Nhanh
            </Button>
          </div>
        </div>
      </div>

      {/* 2. STATS ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between text-gray-500 mb-4 relative z-10">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Yêu Cầu Khảo Sát (Pending)</span>
            <div className="p-2 bg-rose-50 dark:bg-rose-900/30 rounded-lg text-rose-600">
              <Map size={20} />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-800 dark:text-white relative z-10">
            {kpis.pendingRequests} <span className="text-lg font-medium text-slate-500">dự án</span>
          </div>
          <div className="text-xs text-slate-400 font-medium mt-2 flex items-center gap-1 relative z-10">
            {kpis.urgentRequests > 0 ? <><AlertCircle size={12} className="text-rose-500" /> {kpis.urgentRequests} yêu cầu Khẩn</> : 'Không có yêu cầu khẩn'}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between text-gray-500 mb-4 relative z-10">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Đang Thiết Kế (In Design)</span>
            <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-blue-600">
              <PenTool size={20} />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-800 dark:text-white relative z-10">
            {kpis.inDesign} <span className="text-lg font-medium text-slate-500">hồ sơ</span>
          </div>
          <div className="text-xs text-slate-400 font-medium mt-2 flex items-center gap-1 relative z-10">
            AutoCAD SLD, PVsyst & Bóc tách BOM
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between text-gray-500 mb-4 relative z-10">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Đã Hoàn Thành BOM</span>
            <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg text-emerald-600">
              <FileSpreadsheet size={20} />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-800 dark:text-white relative z-10">
            {kpis.completedBom} <span className="text-lg font-medium text-slate-500">bộ</span>
          </div>
          <div className="text-xs text-slate-400 font-medium mt-2 flex items-center gap-1 relative z-10">
            Sẵn sàng chuyển sang phòng Mua hàng & Kho
          </div>
        </div>
      </div>

      {actionStatusMessage && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-bold rounded-2xl flex items-center justify-between animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />
            <span>{actionStatusMessage}</span>
          </div>
          <button onClick={() => setActionStatusMessage(null)} className="text-emerald-600 dark:text-emerald-400 hover:opacity-75">✕</button>
        </div>
      )}

      {/* 3. TABS CONTROLLER */}
      <div className="bg-white dark:bg-slate-800 p-2 rounded-2xl border border-gray-200 dark:border-slate-700 flex gap-2">
        <button
          onClick={() => setActiveTab('requests')}
          className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
            activeTab === 'requests'
              ? 'bg-teal-600 text-white shadow-lg shadow-teal-500/20'
              : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'
          }`}
        >
          <Map size={16} /> Yêu Cầu Khảo Sát & Thiết Kế ({requests.length})
        </button>
        <button
          onClick={() => setActiveTab('design')}
          className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
            activeTab === 'design'
              ? 'bg-teal-600 text-white shadow-lg shadow-teal-500/20'
              : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'
          }`}
        >
          <PenTool size={16} /> Hồ Sơ Thiết Kế & BOM ({designs.length})
        </button>
      </div>

      {/* 4. TAB CONTENTS */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-2">
          <Loader2 className="animate-spin text-teal-600" size={28} />
          <span className="text-xs">Đang tải dữ liệu Kỹ thuật...</span>
        </div>
      ) : activeTab === 'requests' ? (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">
              Danh Sách Yêu Cầu Khảo Sát Hiện Trường
            </h3>
            <Button size="sm" onClick={() => setIsAddRequestOpen(true)} className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl">
              <Plus size={14} className="mr-1" /> Thêm Yêu Cầu
            </Button>
          </div>

          {requests.length === 0 ? (
            <div className="py-16 text-center bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-gray-200 dark:border-slate-700 space-y-2">
              <Map size={24} className="mx-auto text-slate-400" />
              <div className="text-sm font-bold text-slate-800 dark:text-white">Chưa có yêu cầu khảo sát nào</div>
              <p className="text-xs text-slate-400">Các yêu cầu khảo sát hiện trường từ phòng Kinh Doanh sẽ hiển thị tại đây.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {requests.map(req => (
                <div key={req.id} className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-gray-200 dark:border-slate-700 shadow-sm space-y-3">
                  <div className="flex justify-between items-start">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-teal-50 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300">
                      {req.type}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      req.priority === 'URGENT' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {req.priority}
                    </span>
                  </div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">{req.project}</h4>
                  <div className="text-xs text-slate-400 flex items-center justify-between border-t border-gray-100 dark:border-slate-700 pt-2">
                    <span>Hẹn khảo sát: {req.date}</span>
                    <span className="text-teal-600 font-bold capitalize">{req.status}</span>
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
              Tiến Độ Hồ Sơ Thiết Kế Kỹ Thuật (AutoCAD, PVsyst, BOM)
            </h3>
            <Button size="sm" onClick={() => setIsAddDesignOpen(true)} className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl">
              <Plus size={14} className="mr-1" /> Khởi Tạo Hồ Sơ
            </Button>
          </div>

          {designs.length === 0 ? (
            <div className="py-16 text-center bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-gray-200 dark:border-slate-700 space-y-2">
              <PenTool size={24} className="mx-auto text-slate-400" />
              <div className="text-sm font-bold text-slate-800 dark:text-white">Chưa có hồ sơ thiết kế nào</div>
              <p className="text-xs text-slate-400">Khởi tạo hồ sơ thiết kế kỹ thuật và bóc tách BOM cho các dự án EPC Solar.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {designs.map(des => (
                <div key={des.id} className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-gray-200 dark:border-slate-700 shadow-sm space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">{des.name}</h4>
                      <span className="text-xs text-teal-600 font-bold">{des.capacity} • {des.stage}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={async () => {
                          try {
                            await departmentWorkspaceService.convertDesignToPr({
                              designId: des.id,
                              projectName: des.name,
                            });
                            setActionStatusMessage(`Đã tự động gửi phiếu đề xuất mua hàng (PR) cho dự án "${des.name}" sang phòng Mua Hàng!`);
                            setTimeout(() => setActionStatusMessage(null), 4000);
                          } catch (err) {
                            console.error('Error generating PR:', err);
                          }
                        }}
                        className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-bold transition-colors flex items-center gap-1"
                      >
                        <FileSpreadsheet size={12} /> Tạo Đơn Mua Hàng (PR)
                      </button>
                      <span className="text-sm font-black text-slate-800 dark:text-white">{des.progress}%</span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                    <div className="bg-teal-500 h-full rounded-full transition-all" style={{ width: `${des.progress}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 5. MODAL: TẠO YÊU CẦU KHẢO SÁT */}
      {isAddRequestOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200 dark:border-slate-700 animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gradient-to-r from-teal-700 to-slate-800 text-white">
              <h3 className="text-base font-bold flex items-center gap-2">
                <Map size={18} /> Tạo Yêu Cầu Khảo Sát / Thiết Kế
              </h3>
              <button onClick={() => setIsAddRequestOpen(false)} className="text-white/80 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateRequest} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Tên Dự Án / Địa Điểm Khảo Sát *
                </label>
                <input
                  type="text"
                  required
                  value={reqProject}
                  onChange={(e) => setReqProject(e.target.value)}
                  placeholder="VD: Nhà máy May Hòa Thọ Đà Nẵng 1.2 MWp..."
                  className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Loại Yêu Cầu
                  </label>
                  <select
                    value={reqType}
                    onChange={(e) => setReqType(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="Khảo Sát Mái">Khảo Sát Mái</option>
                    <option value="Bản Vẽ 1 Sợi SLD">Bản Vẽ 1 Sợi SLD</option>
                    <option value="Mô Phỏng PVsyst">Mô Phỏng PVsyst</option>
                    <option value="Bóc Tách BOM Vật Tư">Bóc Tách BOM Vật Tư</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Mức Độ Ưu Tiên
                  </label>
                  <select
                    value={reqPriority}
                    onChange={(e) => setReqPriority(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="URGENT">Khẩn Cấp</option>
                    <option value="HIGH">Cao</option>
                    <option value="MEDIUM">Trung Bình</option>
                    <option value="LOW">Thấp</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Ngày Hẹn Khảo Sát
                </label>
                <input
                  type="date"
                  value={reqDate}
                  onChange={(e) => setReqDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 dark:border-slate-700">
                <Button type="button" variant="ghost" onClick={() => setIsAddRequestOpen(false)}>
                  Hủy
                </Button>
                <Button type="submit" disabled={isSubmitting} className="bg-teal-600 hover:bg-teal-700 text-white font-bold">
                  {isSubmitting ? 'Đang lưu...' : 'Gửi Yêu Cầu'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. MODAL: PV STRING & INVERTER SIZING CALCULATOR */}
      {isSizingCalcOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-200 dark:border-slate-700 animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gradient-to-r from-teal-700 via-teal-800 to-emerald-800 text-white">
              <h3 className="text-base font-bold flex items-center gap-2">
                <Zap size={20} /> Bộ Tính Chuỗi Pin Solar & Chọn Biến Tần SAJ
              </h3>
              <button onClick={() => setIsSizingCalcOpen(false)} className="text-white/80 hover:text-white">✕</button>
            </div>

            <div className="p-6 space-y-5 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Công Suất Pin (Wp)
                  </label>
                  <input
                    type="number"
                    value={panelWattage}
                    onChange={(e) => setPanelWattage(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-teal-500 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Điện Áp Hở Mạch Voc (V)
                  </label>
                  <input
                    type="number"
                    step={0.1}
                    value={panelVoc}
                    onChange={(e) => setPanelVoc(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-teal-500 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Inverter SAJ (kW)
                  </label>
                  <input
                    type="number"
                    value={inverterCapKw}
                    onChange={(e) => setInverterCapKw(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-teal-500 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Số Tấm Mỗi Chuỗi (Panels/String)
                  </label>
                  <input
                    type="number"
                    value={panelsPerString}
                    onChange={(e) => setPanelsPerString(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-teal-500 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Tổng Số Chuỗi (Strings)
                  </label>
                  <input
                    type="number"
                    value={numStrings}
                    onChange={(e) => setNumStrings(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-teal-500 font-bold"
                  />
                </div>
              </div>

              {/* CALCULATION RESULTS */}
              <div className="bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/40 rounded-2xl p-5 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 dark:text-slate-300 font-semibold">Tổng Số Tấm Pin AIKO:</span>
                  <span className="font-black text-sm text-slate-900 dark:text-white">{totalPanels} tấm</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 dark:text-slate-300 font-semibold">Tổng Công Suất DC:</span>
                  <span className="font-black text-sm text-teal-600 dark:text-teal-400">{totalDcCapacityKwp} kWp</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 dark:text-slate-300 font-semibold">Điện Áp Cực Đại Chuỗi Voc (-10°C):</span>
                  <span className={`font-black text-sm ${stringVoc > 1000 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {stringVoc} V {stringVoc > 1000 ? '(Vượt quá 1000V MPPT!)' : '(An toàn < 1000V)'}
                  </span>
                </div>
                <div className="flex justify-between items-center border-t border-teal-200 dark:border-teal-800/40 pt-3">
                  <span className="text-slate-700 dark:text-slate-300 font-bold">Hệ Số Quá Tải DC/AC Overload:</span>
                  <span className="font-black text-lg text-teal-700 dark:text-teal-300">{dcAcRatio}x (Chuẩn 1.25x - 1.35x)</span>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button onClick={() => setIsSizingCalcOpen(false)} className="bg-teal-600 hover:bg-teal-700 text-white font-bold">
                  Đóng Bảng Tính
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. MODAL: KHỞI TẠO HỒ SƠ THIẾT KẾ */}
      {isAddDesignOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200 dark:border-slate-700 animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gradient-to-r from-teal-700 to-slate-800 text-white">
              <h3 className="text-base font-bold flex items-center gap-2">
                <PenTool size={18} /> Khởi Tạo Hồ Sơ Kỹ Thuật & BOM
              </h3>
              <button onClick={() => setIsAddDesignOpen(false)} className="text-white/80 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateDesign} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Tên Hồ Sơ / Dự Án *
                </label>
                <input
                  type="text"
                  required
                  value={designName}
                  onChange={(e) => setDesignName(e.target.value)}
                  placeholder="VD: Bản vẽ kỹ thuật SLD & Mô phỏng PVsyst Nhà máy Tân Bình..."
                  className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Công Suất
                  </label>
                  <input
                    type="text"
                    value={designCapacity}
                    onChange={(e) => setDesignCapacity(e.target.value)}
                    placeholder="VD: 500 kWp"
                    className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Giai Đoạn
                  </label>
                  <select
                    value={designStage}
                    onChange={(e) => setDesignStage(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="Bản vẽ 1 sợi SLD">Bản vẽ 1 sợi SLD</option>
                    <option value="Mô phỏng PVsyst">Mô phỏng PVsyst</option>
                    <option value="Bóc tách BOM & Dự toán">Bóc tách BOM & Dự toán</option>
                    <option value="Hồ sơ nghiệm thu EVN">Hồ sơ nghiệm thu EVN</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 dark:border-slate-700">
                <Button type="button" variant="ghost" onClick={() => setIsAddDesignOpen(false)}>
                  Hủy
                </Button>
                <Button type="submit" disabled={isSubmitting} className="bg-teal-600 hover:bg-teal-700 text-white font-bold">
                  {isSubmitting ? 'Đang lưu...' : 'Lưu Hồ Sơ'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
