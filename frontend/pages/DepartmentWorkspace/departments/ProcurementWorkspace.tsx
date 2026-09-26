import React, { useState, useEffect } from 'react';
import { 
  ShoppingCart, FileText, Award, Package, Truck, Anchor, 
  CheckCircle2, Clock, AlertTriangle, ArrowRight, DollarSign,
  ClipboardList, Loader2, Plus, X
} from 'lucide-react';
import { Button } from '../../../components/UI';
import { departmentWorkspaceService } from '../../../services/departmentWorkspaceService';
import { useNotifications } from '../../../contexts/NotificationContext';
import { statusLabel } from '../../../utils/workspaceStatus';

export const ProcurementWorkspace: React.FC = () => {
  const { showToast } = useNotifications();
  const [activeTab, setActiveTab] = useState<'pr' | 'po' | 'suppliers' | 'rfq'>('po');

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
  const [procError, setProcError] = useState('');

  // RFQ State
  const [rfqs, setRfqs] = useState<any[]>([]);
  const [supplierQuotes, setSupplierQuotes] = useState<any[]>([]);
  const [isAddRfqOpen, setIsAddRfqOpen] = useState(false);
  const [isAddQuoteOpen, setIsAddQuoteOpen] = useState(false);
  const [quoteRfq, setQuoteRfq] = useState<any>(null);
  const [rfqTitle, setRfqTitle] = useState('');
  const [rfqItems, setRfqItems] = useState('');
  const [rfqDeadline, setRfqDeadline] = useState('');
  const [qSupplier, setQSupplier] = useState('');
  const [qPrice, setQPrice] = useState<number | ''>('');
  const [qWarranty, setQWarranty] = useState('');
  const [qLeadTime, setQLeadTime] = useState('');

  const fetchProcRecords = async () => {
    setLoading(true);
    try {
      const [prData, poData, rfqData, quoteData, freshKpis] = await Promise.all([
        departmentWorkspaceService.getRecords('dept-proc', 'prs'),
        departmentWorkspaceService.getRecords('dept-proc', 'pos'),
        departmentWorkspaceService.getRecords('dept-proc', 'rfqs'),
        departmentWorkspaceService.getRecords('dept-proc', 'supplier_quotes'),
        departmentWorkspaceService.getKpis('dept-proc'),
      ]);
      setPrs(prData);
      setPos(poData);
      setRfqs(rfqData);
      setSupplierQuotes(quoteData);
      if (freshKpis) setKpis(freshKpis);
    } catch (err) {
      console.error('Error fetching procurement records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProcRecords();
  }, []);

  const handleCreatePo = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcError('');
    const value = Number(poValue);
    if (!poSupplier.trim()) return;
    // Chặn PO 0đ / âm / rỗng — cột DB NOT NULL nhưng 0 vẫn lọt nên phải chặn ở form.
    if (!Number.isFinite(value) || value <= 0) {
      setProcError('Giá trị đơn hàng phải là số tiền lớn hơn 0 (VNĐ).');
      return;
    }
    if (!poEta) {
      setProcError('Chọn ngày ETA dự kiến về kho.');
      return;
    }

    try {
      setIsSubmitting(true);
      const created = await departmentWorkspaceService.createRecord('dept-proc', 'pos', {
        supplier: poSupplier.trim(),
        value,
        items: poItems.trim(),
        stage: 'Xác nhận đơn hàng',
        progress: 25,
        eta: poEta,
        status: 'open'
      });
      // PO giá trị cao -> tự trình duyệt Giám đốc + Pháp chế qua trung tâm phê duyệt.
      if (value > HIGH_VALUE_THRESHOLD) {
        try {
          await departmentWorkspaceService.requestApproval({
            entityType: 'procurement_pos',
            entityId: created?.id,
            title: `PO ${poSupplier.trim()} — ${formatVND(value)} cần duyệt cấp cao`,
            amount: value,
            reason: `PO vượt ngưỡng ${formatVND(HIGH_VALUE_THRESHOLD)}`
          });
          showToast({ type: 'info', title: 'Đã trình duyệt cấp cao', message: 'PO vượt ngưỡng đã gửi Giám đốc + Pháp chế.' });
        } catch (e) {
          console.error(e);
        }
      }
      setIsAddPoOpen(false);
      setPoSupplier('');
      setPoValue('');
      setPoItems('');
      setPoEta('');
      fetchProcRecords();
    } catch (err) {
      console.error('Error creating PO:', err);
      setProcError('Lưu PO thất bại, vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Chuỗi PR -> PO: sinh PO nháp giữ prId (chống trùng ở backend).
  // Tiến giai đoạn PO kèm progress tự động (hết kẹt 25% mãi).
  const PO_STAGES = [
    { stage: 'Xác nhận đơn hàng', progress: 25 },
    { stage: 'Đặt cọc', progress: 50 },
    { stage: 'Đang vận chuyển', progress: 75 },
    { stage: 'Đã về kho', progress: 100 },
  ];
  const nextPoStage = (po: any) => {
    const i = PO_STAGES.findIndex(s => s.stage === po.stage);
    if (i >= 0 && i < PO_STAGES.length - 1) return PO_STAGES[i + 1];
    if (i < 0) return PO_STAGES[0];
    return null;
  };

  const handleAdvancePo = async (po: any) => {
    const next = nextPoStage(po);
    if (!next) return;
    try {
      await departmentWorkspaceService.updateRecord('dept-proc', 'pos', po.id, {
        ...po,
        stage: next.stage,
        progress: next.progress,
        status: next.progress >= 100 ? 'delivered' : po.status
      });
      fetchProcRecords();
    } catch (err) {
      console.error('Error advancing PO:', err);
      showToast({ type: 'error', title: 'Chuyển giai đoạn thất bại', message: 'Vui lòng thử lại.' });
    }
  };

  const handlePrToPo = async (pr: any) => {
    try {
      setIsSubmitting(true);
      const res = await departmentWorkspaceService.prToPo(pr.id);
      showToast({ type: 'success', title: 'Đã chuyển thành PO', message: res?.message || 'PO nháp đã được tạo.' });
      fetchProcRecords();
    } catch (err) {
      console.error('Error converting PR to PO:', err);
      showToast({ type: 'error', title: 'Chuyển PR thất bại', message: 'Vui lòng thử lại.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Chuỗi PO -> nhập kho chờ (Warehouse chuẩn bị tiếp nhận).
  const handlePoToInbound = async (po: any) => {
    try {
      setIsSubmitting(true);
      const res = await departmentWorkspaceService.poToInbound(po.id);
      showToast({ type: 'success', title: 'Đã báo nhập kho', message: res?.message || 'Kho đã nhận được báo hàng về.' });
      fetchProcRecords();
    } catch (err) {
      console.error('Error reporting inbound:', err);
      showToast({ type: 'error', title: 'Báo nhập kho thất bại', message: 'Vui lòng thử lại.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // RFQ: chào giá cạnh tranh + trao thầu (sinh PO cho NCC thắng).
  const handleCreateRfq = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rfqTitle.trim()) return;
    try {
      setIsSubmitting(true);
      await departmentWorkspaceService.createRecord('dept-proc', 'rfqs', {
        title: rfqTitle.trim(),
        items: rfqItems.trim(),
        deadline: rfqDeadline || new Date().toISOString().slice(0, 10),
        status: 'open'
      });
      setIsAddRfqOpen(false);
      setRfqTitle('');
      setRfqItems('');
      setRfqDeadline('');
      fetchProcRecords();
    } catch (err) {
      console.error('Error creating RFQ:', err);
      showToast({ type: 'error', title: 'Tạo RFQ thất bại', message: 'Vui lòng thử lại.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    const price = Number(qPrice);
    if (!quoteRfq || !qSupplier.trim() || !Number.isFinite(price) || price <= 0) return;
    try {
      setIsSubmitting(true);
      await departmentWorkspaceService.createRecord('dept-proc', 'supplier_quotes', {
        rfqId: quoteRfq.id,
        supplier: qSupplier.trim(),
        price,
        warranty: qWarranty.trim(),
        leadTime: qLeadTime.trim(),
        status: 'submitted'
      });
      setIsAddQuoteOpen(false);
      setQuoteRfq(null);
      setQSupplier('');
      setQPrice('');
      setQWarranty('');
      setQLeadTime('');
      fetchProcRecords();
    } catch (err) {
      console.error('Error creating quote:', err);
      showToast({ type: 'error', title: 'Lưu báo giá thất bại', message: 'Vui lòng thử lại.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAwardQuote = async (rfq: any, q: any) => {
    try {
      setIsSubmitting(true);
      for (const other of supplierQuotes.filter((x: any) => x.rfqId === rfq.id)) {
        if (other.id !== q.id && other.status !== 'awarded') {
          await departmentWorkspaceService.updateRecord('dept-proc', 'supplier_quotes', other.id, {
            ...other,
            status: 'rejected'
          });
        }
      }
      await departmentWorkspaceService.updateRecord('dept-proc', 'supplier_quotes', q.id, {
        ...q,
        status: 'awarded'
      });
      await departmentWorkspaceService.createRecord('dept-proc', 'pos', {
        supplier: q.supplier,
        value: Number(q.price) || 0,
        items: rfq.items,
        stage: 'Trúng RFQ',
        progress: 10,
        eta: '',
        status: 'open'
      });
      await departmentWorkspaceService.updateRecord('dept-proc', 'rfqs', rfq.id, {
        ...rfq,
        status: 'awarded'
      });
      showToast({ type: 'success', title: 'Đã trao thầu', message: `PO đã sinh cho ${q.supplier}.` });
      fetchProcRecords();
    } catch (err) {
      console.error('Error awarding quote:', err);
      showToast({ type: 'error', title: 'Trao thầu thất bại', message: 'Vui lòng thử lại.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreatePr = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prProject.trim()) return;

    try {
      setIsSubmitting(true);
      await departmentWorkspaceService.createRecord('dept-proc', 'prs', {
        project: prProject.trim(),
        items: prItems.trim(),
        date: new Date().toISOString().slice(0, 10),
        status: 'pending',
        priority: prPriority
      });
      setIsAddPrOpen(false);
      setPrProject('');
      setPrItems('');
      setPrPriority('HIGH');
      fetchProcRecords();
    } catch (err) {
      console.error('Error creating PR:', err);
      showToast({ type: 'error', title: 'Tạo PR thất bại', message: 'Vui lòng thử lại.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatVND = (num: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num || 0);
  };
  // Ngưỡng duyệt chéo: PO vượt ngưỡng tự trình Giám đốc + Pháp chế (khớp backend).
  const HIGH_VALUE_THRESHOLD = 2000000000;

  // Tổng hợp nhà cung cấp từ PO: tổng giá trị, số đơn, tiến độ TB, ETA mới nhất.
  const supplierStats = (() => {
    const map = new Map<string, { count: number; total: number; progressSum: number; lastEta: string; open: number }>();
    pos.forEach((p: any) => {
      const key = String(p.supplier || '—').trim() || '—';
      const cur = map.get(key) || { count: 0, total: 0, progressSum: 0, lastEta: '', open: 0 };
      cur.count += 1;
      cur.total += Number(p.value) || 0;
      cur.progressSum += Number(p.progress) || 0;
      if (p.status === 'open') cur.open += 1;
      if (p.eta && p.eta > cur.lastEta) cur.lastEta = p.eta;
      map.set(key, cur);
    });
    return [...map.entries()]
      .map(([name, s]) => ({ name, ...s, avg: s.count > 0 ? Math.round(s.progressSum / s.count) : 0 }))
      .sort((a, b) => b.total - a.total);
  })();

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
            {kpis.pendingPos ?? pos.filter(p => p.status === 'open').length} <span className="text-lg font-medium text-slate-500">đơn PO</span>
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
            {kpis.pendingPrs ?? prs.filter(p => p.status === 'pending').length} <span className="text-lg font-medium text-slate-500">phiếu PR</span>
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
        <button
          onClick={() => setActiveTab('suppliers')}
          className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
            activeTab === 'suppliers'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
              : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'
          }`}
        >
          <Award size={16} /> Nhà Cung Cấp ({supplierStats.length})
        </button>
        <button
          onClick={() => setActiveTab('rfq')}
          className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
            activeTab === 'rfq'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
              : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'
          }`}
        >
          <FileText size={16} /> Chào Giá RFQ ({rfqs.length})
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
                    <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${po.progress ?? 25}%` }} />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handlePoToInbound(po)} disabled={isSubmitting} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl">
                      Báo nhập kho chờ
                    </Button>
                    {nextPoStage(po) && (
                      <Button size="sm" onClick={() => handleAdvancePo(po)} disabled={isSubmitting} variant="ghost" className="text-xs font-bold rounded-xl">
                        Tiếp: {nextPoStage(po)?.stage}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : activeTab === 'pr' ? (
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
                    <span className="font-bold text-amber-600 capitalize">{statusLabel(pr.status)}</span>
                  </div>
                  <Button size="sm" onClick={() => handlePrToPo(pr)} disabled={isSubmitting} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl">
                    Chuyển thành PO
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : activeTab === 'suppliers' ? (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">
              Hồ Sơ Nhà Cung Cấp (Tổng Hợp Từ PO)
            </h3>
          </div>

          {supplierStats.length === 0 ? (
            <div className="py-16 text-center bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-gray-200 dark:border-slate-700 space-y-2">
              <Award size={24} className="mx-auto text-slate-400" />
              <div className="text-sm font-bold text-slate-800 dark:text-white">Chưa có nhà cung cấp nào</div>
              <p className="text-xs text-slate-400">Phát hành PO để hệ thống tự tổng hợp hồ sơ NCC.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {supplierStats.map(s => (
                <div key={s.name} className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-gray-200 dark:border-slate-700 shadow-sm space-y-2">
                  <div className="flex justify-between items-start gap-2">
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">{s.name}</h4>
                    <span className="text-xs font-black text-indigo-600 whitespace-nowrap">{formatVND(s.total)}</span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                    <span>{s.count} đơn PO • {s.open} đang mở</span>
                    <span>ETA mới nhất: {s.lastEta || '—'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                      <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${s.avg}%` }} />
                    </div>
                    <span className="text-xs font-bold text-slate-500">{s.avg}%</span>
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
              Yêu Cầu Chào Giá Cạnh Tranh (RFQ)
            </h3>
            <Button size="sm" onClick={() => setIsAddRfqOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl">
              <Plus size={14} className="mr-1" /> Tạo RFQ
            </Button>
          </div>

          {rfqs.length === 0 ? (
            <div className="py-16 text-center bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-gray-200 dark:border-slate-700 space-y-2">
              <FileText size={24} className="mx-auto text-slate-400" />
              <div className="text-sm font-bold text-slate-800 dark:text-white">Chưa có RFQ nào</div>
              <p className="text-xs text-slate-400">Tạo yêu cầu chào giá để so sánh NCC trước khi phát hành PO.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {rfqs.map(rfq => {
                const qs = supplierQuotes
                  .filter((q: any) => q.rfqId === rfq.id)
                  .sort((a: any, b: any) => (Number(a.price) || 0) - (Number(b.price) || 0));
                const best = qs.length > 0 ? qs[0] : null;
                return (
                <div key={rfq.id} className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-gray-200 dark:border-slate-700 shadow-sm space-y-3">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">{rfq.title}</h4>
                      <div className="text-xs text-slate-500 mt-0.5">{rfq.items} • Hạn: {rfq.deadline}</div>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 ${
                      rfq.status === 'awarded' ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700'
                    }`}>
                      {rfq.status === 'awarded' ? 'Đã trao thầu' : 'Đang chào giá'}
                    </span>
                  </div>

                  {qs.length === 0 ? (
                    <div className="text-xs text-slate-400">Chưa có NCC nào báo giá.</div>
                  ) : (
                    <div className="space-y-2">
                      {qs.map((q: any) => (
                        <div key={q.id} className={`flex flex-wrap justify-between items-center gap-2 p-3 rounded-2xl border text-xs ${
                          best && q.id === best.id
                            ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800'
                            : 'bg-gray-50 dark:bg-slate-700/30 border-gray-100 dark:border-slate-700'
                        }`}>
                          <div>
                            <span className="font-bold text-slate-800 dark:text-white">{q.supplier}</span>
                            {best && q.id === best.id && (
                              <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500 text-white">GIÁ TỐT NHẤT</span>
                            )}
                            <div className="text-slate-500 mt-0.5">Bảo hành: {q.warranty || '—'} • Giao hàng: {q.leadTime || '—'}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-sm text-indigo-600">{formatVND(Number(q.price) || 0)}</span>
                            {rfq.status !== 'awarded' && q.status !== 'rejected' && (
                              <Button size="sm" onClick={() => handleAwardQuote(rfq, q)} disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl">
                                Trao thầu
                              </Button>
                            )}
                            {q.status === 'awarded' && (
                              <span className="text-[11px] font-bold text-emerald-600">Đã trúng</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {rfq.status !== 'awarded' && (
                    <Button size="sm" variant="ghost" onClick={() => { setQuoteRfq(rfq); setIsAddQuoteOpen(true); }} className="text-xs font-bold rounded-xl">
                      <Plus size={14} className="mr-1" /> Thêm báo giá NCC
                    </Button>
                  )}
                </div>
                );
              })}
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
                    Giá Trị Đơn Hàng (VNĐ) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={poValue}
                    onChange={(e) => setPoValue(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="VD: 8500000000"
                    className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Ngày ETA Dự Kiến Về Kho *
                  </label>
                  <input
                    type="date"
                    required
                    value={poEta}
                    onChange={(e) => setPoEta(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {procError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold rounded-xl">
                  {procError}
                </div>
              )}

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

      {/* MODAL: TẠO RFQ */}
      {isAddRfqOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200 dark:border-slate-700 animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gradient-to-r from-indigo-800 to-blue-800 text-white">
              <h3 className="text-base font-bold flex items-center gap-2">
                <FileText size={18} /> Tạo Yêu Cầu Chào Giá (RFQ)
              </h3>
              <button onClick={() => setIsAddRfqOpen(false)} className="text-white/80 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateRfq} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Tiêu Đề RFQ *
                </label>
                <input
                  type="text"
                  required
                  value={rfqTitle}
                  onChange={(e) => setRfqTitle(e.target.value)}
                  placeholder="VD: Chào giá 500x tấm pin AIKO 650Wp..."
                  className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Danh Mục Hàng Hóa
                </label>
                <textarea
                  rows={2}
                  value={rfqItems}
                  onChange={(e) => setRfqItems(e.target.value)}
                  placeholder="VD: 500x AIKO 650Wp, 5x SAJ C6-100K..."
                  className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Hạn Chót Nhận Báo Giá
                </label>
                <input
                  type="date"
                  value={rfqDeadline}
                  onChange={(e) => setRfqDeadline(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 dark:border-slate-700">
                <Button type="button" variant="ghost" onClick={() => setIsAddRfqOpen(false)}>
                  Hủy
                </Button>
                <Button type="submit" disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
                  {isSubmitting ? 'Đang lưu...' : 'Tạo RFQ'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: THÊM BÁO GIÁ NCC */}
      {isAddQuoteOpen && quoteRfq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200 dark:border-slate-700 animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gradient-to-r from-emerald-700 to-teal-800 text-white">
              <h3 className="text-base font-bold">
                Báo Giá NCC — {quoteRfq.title}
              </h3>
              <button onClick={() => { setIsAddQuoteOpen(false); setQuoteRfq(null); }} className="text-white/80 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateQuote} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Nhà Cung Cấp *
                </label>
                <input
                  type="text"
                  required
                  value={qSupplier}
                  onChange={(e) => setQSupplier(e.target.value)}
                  placeholder="VD: AIKO Solar Energy..."
                  className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Giá Chào (VNĐ) *
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={qPrice}
                  onChange={(e) => setQPrice(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="VD: 8200000000"
                  className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Bảo Hành
                  </label>
                  <input
                    type="text"
                    value={qWarranty}
                    onChange={(e) => setQWarranty(e.target.value)}
                    placeholder="VD: 12 năm / 25 năm hiệu suất"
                    className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Thời Gian Giao
                  </label>
                  <input
                    type="text"
                    value={qLeadTime}
                    onChange={(e) => setQLeadTime(e.target.value)}
                    placeholder="VD: 30 ngày"
                    className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 dark:border-slate-700">
                <Button type="button" variant="ghost" onClick={() => { setIsAddQuoteOpen(false); setQuoteRfq(null); }}>
                  Hủy
                </Button>
                <Button type="submit" disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                  {isSubmitting ? 'Đang lưu...' : 'Lưu Báo Giá'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
