import React, { useState, useEffect } from 'react';
import { 
  ShoppingCart, FileText, Award, Package, Truck, Anchor, 
  CheckCircle2, Clock, AlertTriangle, ArrowRight, DollarSign,
  ClipboardList, Loader2, Plus, X
} from 'lucide-react';
import { Button } from '../../../components/UI';
import { departmentWorkspaceService } from '../../../services/departmentWorkspaceService';

export const ProcurementWorkspace: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'pr' | 'po'>('po');

  const [prs, setPrs] = useState<any[]>([]);
  const [pos, setPos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<any>({ pendingPrs: 0, pendingPos: 0 });

  // Modal State
  const [isAddPoOpen, setIsAddPoOpen] = useState(false);
  const [isAddPrOpen, setIsAddPrOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New PO State
  const [poSupplier, setPoSupplier] = useState('');
  const [poValue, setPoValue] = useState<number | ''>('');
  const [poItems, setPoItems] = useState('');
  const [poEta, setPoEta] = useState('');

  // New PR State
  const [prProject, setPrProject] = useState('');
  const [prItems, setPrItems] = useState('');
  const [prPriority, setPrPriority] = useState('HIGH');

  const fetchProcRecords = async () => {
    setLoading(true);
    try {
      if (activeTab === 'pr') {
        const data = await departmentWorkspaceService.getRecords('dept-procurement', 'prs');
        setPrs(data);
      } else if (activeTab === 'po') {
        const data = await departmentWorkspaceService.getRecords('dept-procurement', 'pos');
        setPos(data);
      }
    } catch (err) {
      console.error('Error fetching procurement records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    departmentWorkspaceService.getKpis('dept-procurement').then(setKpis).catch(console.error);
  }, []);

  useEffect(() => {
    fetchProcRecords();
  }, [activeTab]);

  const handleCreatePo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!poSupplier.trim()) return;

    try {
      setIsSubmitting(true);
      await departmentWorkspaceService.createRecord('dept-procurement', 'pos', {
        supplier: poSupplier.trim(),
        value: Number(poValue),
        items: poItems,
        stage: 'Xác nhận đơn hàng',
        progress: 25,
        eta: poEta,
        status: 'open'
      });
      setIsAddPoOpen(false);
      setPoSupplier('');
      fetchProcRecords();
    } catch (err) {
      console.error('Error creating PO:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreatePr = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prProject.trim()) return;

    try {
      setIsSubmitting(true);
      await departmentWorkspaceService.createRecord('dept-procurement', 'prs', {
        project: prProject.trim(),
        items: prItems,
        date: new Date().toISOString().split('T')[0],
        status: 'pending',
        priority: prPriority
      });
      setIsAddPrOpen(false);
      setPrProject('');
      fetchProcRecords();
    } catch (err) {
      console.error('Error creating PR:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatVND = (num: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num || 0);
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-300">
      {/* 1. HEADER & KPI */}
      <div className="bg-gradient-to-br from-indigo-900 via-slate-800 to-blue-900 text-white p-8 rounded-3xl border border-indigo-700 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 bg-blue-500/20 rounded-xl border border-blue-400/30 backdrop-blur-sm">
                <ShoppingCart className="text-blue-300" size={28} />
              </div>
              <h2 className="text-3xl font-black text-white tracking-tight">Procurement & SCM</h2>
            </div>
            <p className="text-indigo-200 text-sm max-w-2xl leading-relaxed">
              Quản trị chuỗi cung ứng, tìm kiếm nhà cung cấp, đấu thầu, phát hành Đơn đặt hàng (PO) và kiểm soát tiến độ Logistics / Nhập khẩu hàng hóa.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button 
              onClick={() => setIsAddPoOpen(true)}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-4 py-2.5 shadow-lg shadow-blue-500/20 rounded-xl transition-transform hover:scale-105"
            >
              <Plus size={16} className="mr-1.5" /> Tạo PO Mới
            </Button>
            <Button 
              onClick={() => setIsAddPrOpen(true)}
              className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs px-4 py-2.5 shadow-lg rounded-xl transition-transform hover:scale-105"
            >
              <Plus size={16} className="mr-1.5" /> Tạo PR Mới
            </Button>
          </div>
        </div>
      </div>

      {/* 2. STATS ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between text-gray-500 mb-4 relative z-10">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Đơn Đặt Hàng PO Mở</span>
            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg text-indigo-600">
              <DollarSign size={20} />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-800 dark:text-white relative z-10">
            {kpis.pendingPos} <span className="text-lg font-medium text-slate-500">đơn PO</span>
          </div>
          <div className="text-xs text-slate-400 font-medium mt-2 flex items-center gap-1 relative z-10">
            Đang theo dõi tiến độ tàu biển / Vận chuyển ETA
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between text-gray-500 mb-4 relative z-10">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Yêu Cầu Mua Hàng (PR Chờ Duyệt)</span>
            <div className="p-2 bg-amber-50 dark:bg-amber-900/30 rounded-lg text-amber-600">
              <ClipboardList size={20} />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-800 dark:text-white relative z-10">
            {kpis.pendingPrs} <span className="text-lg font-medium text-slate-500">phiếu PR</span>
          </div>
          <div className="text-xs text-slate-400 font-medium mt-2 flex items-center gap-1 relative z-10">
            Từ các ban chỉ huy công trường EPC
          </div>
        </div>
      </div>

      {/* 3. TABS CONTROLLER */}
      <div className="bg-white dark:bg-slate-800 p-2 rounded-2xl border border-gray-200 dark:border-slate-700 flex gap-2">
        <button
          onClick={() => setActiveTab('po')}
          className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
            activeTab === 'po'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
              : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'
          }`}
        >
          <Truck size={16} /> Đơn Đặt Hàng PO & Logistics ({pos.length})
        </button>
        <button
          onClick={() => setActiveTab('pr')}
          className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
            activeTab === 'pr'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
              : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'
          }`}
        >
          <ClipboardList size={16} /> Yêu Cầu Mua Hàng PR ({prs.length})
        </button>
      </div>

      {/* 4. TAB CONTENTS */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-2">
          <Loader2 className="animate-spin text-indigo-600" size={28} />
          <span className="text-xs">Đang tải dữ liệu Mua hàng...</span>
        </div>
      ) : activeTab === 'po' ? (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">
              Theo Dõi Tiến Độ Đơn Đặt Hàng PO & Vận Chuyển ETA
            </h3>
            <Button size="sm" onClick={() => setIsAddPoOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl">
              <Plus size={14} className="mr-1" /> Thêm PO
            </Button>
          </div>

          {pos.length === 0 ? (
            <div className="py-16 text-center bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-gray-200 dark:border-slate-700 space-y-2">
              <Truck size={24} className="mx-auto text-slate-400" />
              <div className="text-sm font-bold text-slate-800 dark:text-white">Chưa có đơn đặt hàng PO nào</div>
              <p className="text-xs text-slate-400">Phát hành đơn đặt hàng gửi nhà cung cấp tấm pin, biến tần và phụ kiện.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pos.map(po => (
                <div key={po.id} className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-gray-200 dark:border-slate-700 shadow-sm space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">{po.supplier}</h4>
                      <span className="text-xs font-bold text-indigo-600">{formatVND(Number(po.value))} • {po.stage}</span>
                    </div>
                    <span className="text-xs font-bold text-slate-400">ETA: {po.eta}</span>
                  </div>
                  <div className="text-xs text-slate-500">{po.items}</div>
                  <div className="w-full bg-gray-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                    <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${po.progress || 25}%` }} />
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
              Phiếu Đề Xuất Mua Hàng Từ Dự Án (Purchase Requisition)
            </h3>
            <Button size="sm" onClick={() => setIsAddPrOpen(true)} className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl">
              <Plus size={14} className="mr-1" /> Thêm PR
            </Button>
          </div>

          {prs.length === 0 ? (
            <div className="py-16 text-center bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-gray-200 dark:border-slate-700 space-y-2">
              <ClipboardList size={24} className="mx-auto text-slate-400" />
              <div className="text-sm font-bold text-slate-800 dark:text-white">Chưa có yêu cầu mua hàng PR nào</div>
              <p className="text-xs text-slate-400">Các đề xuất vật tư từ công trình EPC sẽ hiển thị tại đây.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {prs.map(pr => (
                <div key={pr.id} className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-gray-200 dark:border-slate-700 shadow-sm space-y-2">
                  <div className="flex justify-between items-start">
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">{pr.project}</h4>
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700">{pr.priority}</span>
                  </div>
                  <div className="text-xs text-slate-500">{pr.items}</div>
                  <div className="border-t border-gray-100 dark:border-slate-700 pt-2 flex justify-between items-center text-xs text-slate-400">
                    <span>Ngày tạo: {pr.date}</span>
                    <span className="font-bold text-amber-600 capitalize">{pr.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL: TẠO PO */}
      {isAddPoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200 dark:border-slate-700 animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gradient-to-r from-indigo-800 to-blue-800 text-white">
              <h3 className="text-base font-bold flex items-center gap-2">
                <ShoppingCart size={18} /> Phát Hành Đơn Đặt Hàng (PO)
              </h3>
              <button onClick={() => setIsAddPoOpen(false)} className="text-white/80 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreatePo} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Nhà Cung Cấp / Hãng Sản Xuất *
                </label>
                <input
                  type="text"
                  required
                  value={poSupplier}
                  onChange={(e) => setPoSupplier(e.target.value)}
                  placeholder="VD: AIKO Solar Energy / SAJ Electric..."
                  className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Danh Mục Vật Tư / Thiết Bị
                </label>
                <input
                  type="text"
                  value={poItems}
                  onChange={(e) => setPoItems(e.target.value)}
                  placeholder="VD: 500x Tấm pin AIKO 650Wp..."
                  className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Giá Trị Đơn Hàng (VND)
                  </label>
                  <input
                    type="number"
                    value={poValue}
                    onChange={(e) => setPoValue(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Tiến Độ Dự Kiến (ETA)
                  </label>
                  <input
                    type="text"
                    value={poEta}
                    onChange={(e) => setPoEta(e.target.value)}
                    placeholder="VD: 10 ngày"
                    className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 dark:border-slate-700">
                <Button type="button" variant="ghost" onClick={() => setIsAddPoOpen(false)}>
                  Hủy
                </Button>
                <Button type="submit" disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
                  {isSubmitting ? 'Đang lưu...' : 'Lưu Đơn PO'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: TẠO PR */}
      {isAddPrOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200 dark:border-slate-700 animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gradient-to-r from-amber-700 to-orange-800 text-white">
              <h3 className="text-base font-bold flex items-center gap-2">
                <ClipboardList size={18} /> Tạo Phiếu Đề Xuất Mua Hàng (PR)
              </h3>
              <button onClick={() => setIsAddPrOpen(false)} className="text-white/80 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreatePr} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Tên Dự Án Cần Mua Vật Tư *
                </label>
                <input
                  type="text"
                  required
                  value={prProject}
                  onChange={(e) => setPrProject(e.target.value)}
                  placeholder="VD: Dự án Solar Nhà máy Dệt Tân Bình..."
                  className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Quy Cách & Danh Mục Vật Tư
                </label>
                <textarea
                  rows={3}
                  value={prItems}
                  onChange={(e) => setPrItems(e.target.value)}
                  placeholder="Mô tả số lượng, chủng loại..."
                  className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Mức Độ Cấp Thiết
                </label>
                <select
                  value={prPriority}
                  onChange={(e) => setPrPriority(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="URGENT">Khẩn Cấp</option>
                  <option value="HIGH">Cao</option>
                  <option value="MEDIUM">Bình Thường</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 dark:border-slate-700">
                <Button type="button" variant="ghost" onClick={() => setIsAddPrOpen(false)}>
                  Hủy
                </Button>
                <Button type="submit" disabled={isSubmitting} className="bg-amber-600 hover:bg-amber-700 text-white font-bold">
                  {isSubmitting ? 'Đang lưu...' : 'Gửi Đề Xuất PR'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
