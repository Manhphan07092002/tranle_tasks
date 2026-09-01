import React, { useState, useEffect } from 'react';
import { 
  HardHat, ShieldAlert, CheckCircle2, Camera, UserSquare2, 
  MapPin, AlertTriangle, Play, ClipboardCheck, ArrowRight, 
  Zap, Loader2, Plus, Star, Award, ShieldCheck
} from 'lucide-react';
import { Button } from '../../../components/UI';
import { DailySiteLogModal } from '../../../components/epc/DailySiteLogModal';
import { departmentWorkspaceService } from '../../../services/departmentWorkspaceService';

interface EpcWorkspaceProps {
  projects: any[];
}

export const EpcWorkspace: React.FC<EpcWorkspaceProps> = ({ projects }) => {
  const [isSiteLogOpen, setIsSiteLogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'kanban' | 'subcontractor' | 'hse'>('kanban');
  const [subcontractors, setSubcontractors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<any>({ activeProjects: 0, totalWorkers: 0, inboundCount: 0 });

  // Add Subcontractor Modal State
  const [isAddSubOpen, setIsAddSubOpen] = useState(false);
  const [subName, setSubName] = useState('');
  const [subTask, setSubTask] = useState('Lắp đặt khung giàn & Tấm pin');
  const [subRating, setSubRating] = useState<number>(5);
  const [subStatus, setSubStatus] = useState('Đang thi công');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchEpcData = async () => {
    if (activeTab === 'subcontractor') {
      setLoading(true);
      try {
        const data = await departmentWorkspaceService.getRecords('dept-epc', 'subcontractor');
        setSubcontractors(data);
      } catch (err) {
        console.error('Error fetching records:', err);
      } finally {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    departmentWorkspaceService.getKpis('dept-epc').then(setKpis).catch(console.error);
  }, []);

  useEffect(() => {
    fetchEpcData();
  }, [activeTab]);

  const handleCreateSubcontractor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subName.trim()) return;

    try {
      setIsSubmitting(true);
      await departmentWorkspaceService.createRecord('dept-epc', 'subcontractor', {
        name: subName.trim(),
        task: subTask,
        rating: Number(subRating),
        status: subStatus
      });
      setIsAddSubOpen(false);
      setSubName('');
      fetchEpcData();
    } catch (err) {
      console.error('Error adding subcontractor:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

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
            100% <span className="text-sm font-medium text-slate-500">Không Sự Cố</span>
          </div>
          <div className="text-xs text-slate-400 font-medium mt-2 flex items-center gap-1 relative z-10">
            Tuân thủ PCCC & An toàn điện cao áp
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
      </div>

      {/* 4. TAB CONTENTS */}
      {activeTab === 'kanban' ? (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">
              Danh Sách Các Dự Án Đang Thi Công Thực Địa
            </h3>
            <Button size="sm" onClick={() => setIsSiteLogOpen(true)} className="bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl">
              <Camera size={14} className="mr-1" /> Ghi Nhật Ký
            </Button>
          </div>

          {projects.length === 0 ? (
            <div className="py-16 text-center bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-gray-200 dark:border-slate-700 space-y-2">
              <HardHat size={24} className="mx-auto text-slate-400" />
              <div className="text-sm font-bold text-slate-800 dark:text-white">Chưa có dự án nào trong giai đoạn thi công</div>
              <p className="text-xs text-slate-400">Các hợp đồng sau khi chốt sẽ chuyển sang khối EPC để khởi công.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projects.map(p => (
                <div key={p.id} className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-gray-200 dark:border-slate-700 shadow-sm space-y-3">
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">{p.name}</span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700">{p.status || 'Thi công'}</span>
                  </div>
                  <div className="text-xs text-slate-500">{p.description || `Tiến độ thi công: ${p.progress || 0}%`}</div>
                  <div className="w-full bg-gray-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                    <div className="bg-amber-500 h-full rounded-full transition-all" style={{ width: `${p.progress || 0}%` }} />
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

      {/* 6. DAILY SITE LOG MODAL */}
      {isSiteLogOpen && (
        <DailySiteLogModal
          isOpen={isSiteLogOpen}
          onClose={() => setIsSiteLogOpen(false)}
        />
      )}

    </div>
  );
};
