import React, { useState, useEffect } from 'react';
import { 
  Package, Search, Box, ArrowDownToLine, ArrowUpFromLine, 
  AlertOctagon, CheckSquare, Truck, BarChart2, ShieldAlert, 
  Loader2, Plus, X
} from 'lucide-react';
import { Button } from '../../../components/UI';
import { useData } from '../../../contexts/DataContext';
import { departmentWorkspaceService } from '../../../services/departmentWorkspaceService';
import { useNotifications } from '../../../contexts/NotificationContext';

interface WarehouseWorkspaceProps {
  products: any[];
}

export const WarehouseWorkspace: React.FC<WarehouseWorkspaceProps> = ({ products }) => {
  const { projects = [] } = useData();
  const { showToast } = useNotifications();
  const [activeTab, setActiveTab] = useState<'inbound' | 'outbound' | 'inventory'>('inventory');

  const [inventory, setInventory] = useState<any[]>([]);
  const [inbounds, setInbounds] = useState<any[]>([]);
  const [outbounds, setOutbounds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<any>({ totalItems: 0, inboundToday: 0, outboundToday: 0 });

  // Modal State
  const [isAddInboundOpen, setIsAddInboundOpen] = useState(false);
  const [isAddOutboundOpen, setIsAddOutboundOpen] = useState(false);
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Inbound Form
  const [inboundSource, setInboundSource] = useState('');
  const [inboundItems, setInboundItems] = useState('');
  const [inboundLines, setInboundLines] = useState<{ sku: string; qty: number }[]>([{ sku: '', qty: 1 }]);

  // Outbound Form
  const [outboundProject, setOutboundProject] = useState('');
  const [outboundProjectId, setOutboundProjectId] = useState('');
  const [outboundItems, setOutboundItems] = useState('');
  const [outboundRequester, setOutboundRequester] = useState('');
  const [outboundLines, setOutboundLines] = useState<{ sku: string; qty: number }[]>([{ sku: '', qty: 1 }]);
  const [whError, setWhError] = useState('');

  // Inventory Item Form
  const [itemSku, setItemSku] = useState('');
  const [itemName, setItemName] = useState('');
  const [itemCategory, setItemCategory] = useState('Tấm Pin Solar');
  const [itemStock, setItemStock] = useState<number>(0);
  const [itemMinStock, setItemMinStock] = useState<number>(0);
  const [itemUnit, setItemUnit] = useState('Tấm');
  const [itemSerials, setItemSerials] = useState('');
  const [serialEditId, setSerialEditId] = useState<string | null>(null);
  const [serialDraft, setSerialDraft] = useState('');
  const [adjustId, setAdjustId] = useState<string | null>(null);
  const [adjustValue, setAdjustValue] = useState<number | ''>('');

  // Kiểm kê: chốt số tồn thực tế (ghi đè, chênh lệch xem ở phiếu nhập/xuất).
  const handleAdjustStock = async (item: any) => {
    const v = Number(adjustValue);
    if (!Number.isFinite(v) || v < 0) return;
    try {
      await departmentWorkspaceService.updateRecord('dept-wh', 'inventory', item.id, {
        ...item,
        stock: v
      });
      setAdjustId(null);
      setAdjustValue('');
      fetchWhRecords();
      showToast({ type: 'success', title: 'Đã điều chỉnh tồn kho', message: `${item.sku}: ${item.stock} → ${v} ${item.unit}.` });
    } catch (err) {
      console.error('Error adjusting stock:', err);
      showToast({ type: 'error', title: 'Điều chỉnh thất bại', message: 'Vui lòng thử lại.' });
    }
  };

  const serialCount = (s: any) =>
    String(s || '').split(/[\n,;]+/).map(x => x.trim()).filter(Boolean).length;

  const fetchWhRecords = async () => {
    setLoading(true);
    try {
      const [inv, inb, outb, freshKpis] = await Promise.all([
        departmentWorkspaceService.getRecords('dept-wh', 'inventory'),
        departmentWorkspaceService.getRecords('dept-wh', 'inbound'),
        departmentWorkspaceService.getRecords('dept-wh', 'outbound'),
        departmentWorkspaceService.getKpis('dept-wh'),
      ]);
      setInventory(inv);
      setInbounds(inb);
      setOutbounds(outb);
      if (freshKpis) setKpis(freshKpis);
    } catch (err) {
      console.error('Error fetching warehouse records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWhRecords();
  }, []);

  const setLine = (
    setter: React.Dispatch<React.SetStateAction<{ sku: string; qty: number }[]>>,
    lines: { sku: string; qty: number }[],
    index: number,
    patch: Partial<{ sku: string; qty: number }>
  ) => setter(lines.map((l, i) => (i === index ? { ...l, ...patch } : l)));

  const findItem = (sku: string) => inventory.find((it: any) => it.sku === sku);

  const handleCreateInbound = async (e: React.FormEvent) => {
    e.preventDefault();
    setWhError('');
    const valid = inboundLines.filter(l => l.sku && Number(l.qty) > 0);
    if (!inboundSource.trim() || valid.length === 0) {
      setWhError('Nhập nguồn hàng và ít nhất 1 dòng vật tư (SKU + số lượng > 0).');
      return;
    }

    try {
      setIsSubmitting(true);
      const itemsText = valid.map(l => {
        const it = findItem(l.sku);
        return `${l.sku}${it ? ` (${it.name})` : ''} × ${Number(l.qty)}`;
      }).join('; ') + (inboundItems.trim() ? ` — Ghi chú: ${inboundItems.trim()}` : '');
      await departmentWorkspaceService.createRecord('dept-wh', 'inbound', {
        source: inboundSource.trim(),
        items: itemsText,
        date: new Date().toISOString().slice(0, 10),
        status: 'completed'
      });
      // Cộng tồn kho theo từng dòng SKU.
      for (const l of valid) {
        const it = findItem(l.sku);
        if (it) {
          await departmentWorkspaceService.updateRecord('dept-wh', 'inventory', it.id, {
            ...it,
            stock: Number(it.stock || 0) + Number(l.qty)
          });
        }
      }
      setIsAddInboundOpen(false);
      setInboundSource('');
      setInboundItems('');
      setInboundLines([{ sku: '', qty: 1 }]);
      fetchWhRecords();
    } catch (err) {
      console.error('Error creating inbound:', err);
      setWhError('Lưu phiếu nhập thất bại, vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateOutbound = async (e: React.FormEvent) => {
    e.preventDefault();
    setWhError('');
    const valid = outboundLines.filter(l => l.sku && Number(l.qty) > 0);
    if (!outboundProject.trim() || !outboundRequester.trim()) {
      setWhError('Nhập tên dự án và người nhận.');
      return;
    }
    if (valid.length === 0) {
      setWhError('Thêm ít nhất 1 dòng vật tư (SKU + số lượng > 0).');
      return;
    }
    // Chặn xuất vượt tồn.
    for (const l of valid) {
      const it = findItem(l.sku);
      const stock = Number(it?.stock || 0);
      if (!it || stock < Number(l.qty)) {
        setWhError(`SKU ${l.sku || '(trống)'} chỉ còn tồn ${stock} — không thể xuất ${l.qty}.`);
        return;
      }
    }

    try {
      setIsSubmitting(true);
      const itemsText = valid.map(l => {
        const it = findItem(l.sku);
        return `${l.sku}${it ? ` (${it.name})` : ''} × ${Number(l.qty)}`;
      }).join('; ') + (outboundItems.trim() ? ` — Ghi chú: ${outboundItems.trim()}` : '');
      await departmentWorkspaceService.createRecord('dept-wh', 'outbound', {
        project: outboundProject.trim(),
        items: itemsText,
        date: new Date().toISOString().slice(0, 10),
        status: 'shipped',
        requestedBy: outboundRequester.trim(),
        projectId: outboundProjectId || projects.find((p: any) => p.name === outboundProject.trim())?.id || null
      });
      // Trừ tồn kho theo từng dòng SKU.
      for (const l of valid) {
        const it = findItem(l.sku);
        if (it) {
          await departmentWorkspaceService.updateRecord('dept-wh', 'inventory', it.id, {
            ...it,
            stock: Number(it.stock || 0) - Number(l.qty)
          });
        }
      }
      setIsAddOutboundOpen(false);
      setOutboundProject('');
      setOutboundProjectId('');
      setOutboundItems('');
      setOutboundRequester('');
      setOutboundLines([{ sku: '', qty: 1 }]);
      fetchWhRecords();
    } catch (err) {
      console.error('Error creating outbound:', err);
      setWhError('Lưu phiếu xuất thất bại, vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveSerials = async (item: any) => {
    try {
      await departmentWorkspaceService.updateRecord('dept-wh', 'inventory', item.id, {
        ...item,
        serials: serialDraft.trim()
      });
      setSerialEditId(null);
      setSerialDraft('');
      fetchWhRecords();
      showToast({ type: 'success', title: 'Đã lưu serial', message: `Cập nhật serial cho ${item.sku}.` });
    } catch (err) {
      console.error('Error saving serials:', err);
      showToast({ type: 'error', title: 'Lưu serial thất bại', message: 'Vui lòng thử lại.' });
    }
  };

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemSku.trim() || !itemName.trim()) return;

    try {
      setIsSubmitting(true);
      await departmentWorkspaceService.createRecord('dept-wh', 'inventory', {
        sku: itemSku.trim(),
        name: itemName.trim(),
        category: itemCategory,
        stock: Math.max(0, Number(itemStock) || 0),
        minStock: Math.max(0, Number(itemMinStock) || 0),
        unit: itemUnit.trim() || 'Cái',
        image: '',
        serials: itemSerials.trim()
      });
      setIsAddItemOpen(false);
      setItemSku('');
      setItemName('');
      setItemStock(0);
      setItemMinStock(0);
      setItemSerials('');
      fetchWhRecords();
    } catch (err) {
      console.error('Error adding item:', err);
      showToast({ type: 'error', title: 'Thêm mã hàng thất bại', message: 'Vui lòng thử lại.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('vi-VN').format(num || 0);
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-300">
      {/* 1. HEADER & KPI DASHBOARD */}
      <div className="bg-gradient-to-r from-amber-800 via-amber-700 to-slate-900 text-white p-8 rounded-3xl border border-amber-600 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-amber-400/20 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 bg-amber-500/20 rounded-xl border border-amber-400/30 backdrop-blur-sm">
                <Box className="text-amber-300" size={28} />
              </div>
              <h2 className="text-3xl font-black text-white tracking-tight">Warehouse & Logistics</h2>
            </div>
            <p className="text-amber-100 text-sm max-w-2xl leading-relaxed">
              Trung tâm điều phối hàng hóa. Quản lý nhập xuất kho, kiểm kê tồn kho và cảnh báo vật tư thiếu hụt cho các dự án điện mặt trời.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button 
              onClick={() => setIsAddInboundOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2.5 shadow-lg rounded-xl transition-transform hover:scale-105"
            >
              <ArrowDownToLine size={16} className="mr-1.5" /> Nhập Kho
            </Button>
            <Button 
              onClick={() => setIsAddOutboundOpen(true)}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs px-4 py-2.5 shadow-lg rounded-xl transition-transform hover:scale-105"
            >
              <ArrowUpFromLine size={16} className="mr-1.5" /> Xuất Kho
            </Button>
            <Button 
              onClick={() => setIsAddItemOpen(true)}
              className="bg-white/10 hover:bg-white/20 text-white font-bold text-xs px-4 py-2.5 border border-white/20 rounded-xl backdrop-blur-md transition-transform hover:scale-105"
            >
              <Plus size={16} className="mr-1.5" /> Thêm Mã Hàng
            </Button>
          </div>
        </div>
      </div>

      {/* 2. STATS ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between text-gray-500 mb-4 relative z-10">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Mặt Hàng Tồn Kho</span>
            <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-blue-600">
              <Package size={20} />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-800 dark:text-white relative z-10">
            {kpis.totalItems ?? inventory.length} <span className="text-lg font-medium text-slate-500">mã SKU</span>
          </div>
          <div className="text-xs text-blue-600 font-bold mt-2 flex items-center gap-1 relative z-10">
            Tấm pin AIKO, Inverter SAJ, Cáp DC & Phụ kiện
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between text-gray-500 mb-4 relative z-10">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Phiếu Nhập Kho Gần Đây</span>
            <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg text-emerald-600">
              <ArrowDownToLine size={20} />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-800 dark:text-white relative z-10">
            {kpis.inboundToday ?? inbounds.length} <span className="text-lg font-medium text-slate-500">phiếu</span>
          </div>
          <div className="text-xs text-emerald-600 font-bold mt-2 flex items-center gap-1 relative z-10">
            Từ các lô hàng nhập cảng và nhà sản xuất
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between text-gray-500 mb-4 relative z-10">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Phiếu Xuất Cấp Cho Dự Án</span>
            <div className="p-2 bg-amber-50 dark:bg-amber-900/30 rounded-lg text-amber-600">
              <Truck size={20} />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-800 dark:text-white relative z-10">
            {kpis.outboundToday ?? outbounds.length} <span className="text-lg font-medium text-slate-500">lô xuất</span>
          </div>
          <div className="text-xs text-amber-600 font-bold mt-2 flex items-center gap-1 relative z-10">
            Phục vụ các công trình EPC Solar đang thi công
          </div>
        </div>
      </div>

      {/* 3. TABS CONTROLLER */}
      <div className="bg-white dark:bg-slate-800 p-2 rounded-2xl border border-gray-200 dark:border-slate-700 flex gap-2">
        <button
          onClick={() => setActiveTab('inventory')}
          className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
            activeTab === 'inventory'
              ? 'bg-amber-600 text-white shadow-lg shadow-amber-500/20'
              : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'
          }`}
        >
          <Box size={16} /> Danh Mục Tồn Kho ({inventory.length})
        </button>
        <button
          onClick={() => setActiveTab('inbound')}
          className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
            activeTab === 'inbound'
              ? 'bg-amber-600 text-white shadow-lg shadow-amber-500/20'
              : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'
          }`}
        >
          <ArrowDownToLine size={16} /> Lịch Sử Nhập Kho ({inbounds.length})
        </button>
        <button
          onClick={() => setActiveTab('outbound')}
          className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
            activeTab === 'outbound'
              ? 'bg-amber-600 text-white shadow-lg shadow-amber-500/20'
              : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'
          }`}
        >
          <ArrowUpFromLine size={16} /> Lịch Sử Xuất Kho ({outbounds.length})
        </button>
      </div>

      {/* 4. TAB CONTENTS */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-2">
          <Loader2 className="animate-spin text-amber-600" size={28} />
          <span className="text-xs">Đang tải dữ liệu Kho bãi...</span>
        </div>
      ) : activeTab === 'inventory' ? (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">
              Danh Mục Vật Tư Tồn Kho Thiết Bị Solar
            </h3>
            <Button size="sm" onClick={() => setIsAddItemOpen(true)} className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl">
              <Plus size={14} className="mr-1" /> Thêm Mặt Hàng
            </Button>
          </div>

          {inventory.length === 0 ? (
            <div className="py-16 text-center bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-gray-200 dark:border-slate-700 space-y-2">
              <Box size={24} className="mx-auto text-slate-400" />
              <div className="text-sm font-bold text-slate-800 dark:text-white">Kho hàng đang trống</div>
              <p className="text-xs text-slate-400">Nhập các mặt hàng tấm pin AIKO, Inverter SAJ và phụ kiện lắp đặt.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {inventory.map(item => {
                const stock = Number(item.stock) || 0;
                const min = Number(item.minStock) || 0;
                const out = stock === 0;
                const low = !out && stock <= min;
                return (
                <div key={item.id} className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-gray-200 dark:border-slate-700 shadow-sm space-y-2">
                  <div className="flex justify-between items-start gap-2">
                    <span className="font-mono text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded">{item.sku}</span>
                    <div className="flex items-center gap-1">
                      {out && <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-rose-100 text-rose-700">Hết hàng</span>}
                      {low && <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-700">Sắp hết (≤ {min})</span>}
                    </div>
                  </div>
                  <div className="text-xs text-slate-400">{item.category}</div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">{item.name}</h4>
                  <div className="border-t border-gray-100 dark:border-slate-700 pt-2 flex justify-between items-center text-xs">
                    <span className="text-slate-400">Tồn kho:</span>
                    <span className="flex items-center gap-2">
                      <span className={`font-black text-sm ${out ? 'text-rose-600' : low ? 'text-amber-600' : 'text-slate-900 dark:text-white'}`}>{formatNumber(stock)} {item.unit}</span>
                      <button
                        onClick={() => { setAdjustId(item.id); setAdjustValue(stock); }}
                        title="Kiểm kê: chốt số tồn thực tế"
                        className="font-bold text-amber-600 hover:text-amber-700"
                      >
                        Điều chỉnh
                      </button>
                    </span>
                  </div>
                  {adjustId === item.id && (
                    <div className="flex gap-2 items-center">
                      <input
                        type="number"
                        min={0}
                        value={adjustValue}
                        onChange={(e) => setAdjustValue(e.target.value === '' ? '' : Number(e.target.value))}
                        placeholder="Số tồn thực tế"
                        className="flex-1 px-3 py-1.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-xs outline-none focus:ring-2 focus:ring-amber-500"
                      />
                      <button onClick={() => handleAdjustStock(item)} className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white">
                        Lưu
                      </button>
                      <button onClick={() => setAdjustId(null)} className="text-xs font-bold text-slate-400 hover:text-slate-600">
                        Hủy
                      </button>
                    </div>
                  )}
                  <div className="border-t border-gray-100 dark:border-slate-700 pt-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Serial đã lưu: <span className="font-bold text-slate-700 dark:text-slate-200">{serialCount(item.serials)}</span></span>
                      <button
                        onClick={() => { setSerialEditId(item.id); setSerialDraft(item.serials || ''); }}
                        className="font-bold text-amber-600 hover:text-amber-700"
                      >
                        Sửa serial
                      </button>
                    </div>
                    {serialEditId === item.id ? (
                      <div className="mt-2 space-y-2">
                        <textarea
                          rows={3}
                          value={serialDraft}
                          onChange={(e) => setSerialDraft(e.target.value)}
                          placeholder="Mỗi serial một dòng (VD: AIKO650-0001...)"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-xs outline-none focus:ring-2 focus:ring-amber-500"
                        />
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => setSerialEditId(null)} className="text-xs font-bold text-slate-400 hover:text-slate-600">
                            Hủy
                          </button>
                          <button onClick={() => handleSaveSerials(item)} className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white">
                            Lưu serial
                          </button>
                        </div>
                      </div>
                    ) : (
                      item.serials && (
                        <div className="mt-1 text-[11px] text-slate-500 line-clamp-2" title={item.serials}>
                          {item.serials}
                        </div>
                      )
                    )}
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </div>
      ) : activeTab === 'inbound' ? (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">
              Lịch Sử Các Phiếu Nhập Kho (Inbound)
            </h3>
            <Button size="sm" onClick={() => setIsAddInboundOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl">
              <Plus size={14} className="mr-1" /> Nhập Kho Mới
            </Button>
          </div>

          {inbounds.length === 0 ? (
            <div className="py-16 text-center bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-gray-200 dark:border-slate-700 space-y-2">
              <ArrowDownToLine size={24} className="mx-auto text-slate-400" />
              <div className="text-sm font-bold text-slate-800 dark:text-white">Chưa có phiếu nhập kho nào</div>
            </div>
          ) : (
            <div className="space-y-3">
              {inbounds.map(inb => (
                <div key={inb.id} className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-gray-200 dark:border-slate-700 shadow-sm flex justify-between items-center">
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">Nguồn: {inb.source}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">{inb.items}</p>
                  </div>
                  <span className="text-xs text-slate-400">{inb.date}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">
              Lịch Sử Các Phiếu Xuất Kho Cấp Cho Công Trình (Outbound)
            </h3>
            <Button size="sm" onClick={() => setIsAddOutboundOpen(true)} className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl">
              <Plus size={14} className="mr-1" /> Xuất Kho Mới
            </Button>
          </div>

          {outbounds.length === 0 ? (
            <div className="py-16 text-center bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-gray-200 dark:border-slate-700 space-y-2">
              <ArrowUpFromLine size={24} className="mx-auto text-slate-400" />
              <div className="text-sm font-bold text-slate-800 dark:text-white">Chưa có phiếu xuất kho nào</div>
            </div>
          ) : (
            <div className="space-y-3">
              {outbounds.map(outb => (
                <div key={outb.id} className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-gray-200 dark:border-slate-700 shadow-sm flex justify-between items-center">
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">Dự án: {outb.project}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">{outb.items}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-400">{outb.date}</div>
                    <div className="text-[11px] text-amber-600 font-bold">{outb.requestedBy}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL: NHẬP KHO */}
      {isAddInboundOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200 dark:border-slate-700 animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gradient-to-r from-emerald-700 to-teal-800 text-white">
              <h3 className="text-base font-bold flex items-center gap-2">
                <ArrowDownToLine size={18} /> Tạo Phiếu Nhập Kho (Inbound)
              </h3>
              <button onClick={() => setIsAddInboundOpen(false)} className="text-white/80 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateInbound} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Nguồn Hàng / Nhà Cung Cấp / Container *
                </label>
                <input
                  type="text"
                  required
                  value={inboundSource}
                  onChange={(e) => setInboundSource(e.target.value)}
                  placeholder="VD: Cảng Cát Lái - Container AIKO Solar..."
                  className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Dòng Vật Tư Nhập (SKU × Số Lượng) *
                </label>
                <div className="space-y-2">
                  {inboundLines.map((l, i) => (
                    <div key={i} className="flex gap-2">
                      <select
                        value={l.sku}
                        onChange={(e) => setLine(setInboundLines, inboundLines, i, { sku: e.target.value })}
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="">— Chọn SKU —</option>
                        {inventory.map((it: any) => (
                          <option key={it.id} value={it.sku}>{it.sku} — {it.name} (tồn {it.stock})</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min={1}
                        value={l.qty}
                        onChange={(e) => setLine(setInboundLines, inboundLines, i, { qty: Number(e.target.value) })}
                        className="w-20 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      {inboundLines.length > 1 && (
                        <button type="button" onClick={() => setInboundLines(inboundLines.filter((_, x) => x !== i))} className="px-2 text-rose-500 font-bold">✕</button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setInboundLines([...inboundLines, { sku: '', qty: 1 }])}
                  className="mt-2 text-xs font-bold text-emerald-600 hover:text-emerald-700"
                >
                  + Thêm dòng vật tư
                </button>
                {inventory.length === 0 && (
                  <div className="text-[11px] text-amber-600 mt-1">Kho chưa có mã hàng — hãy "Thêm Mã Hàng" trước.</div>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Ghi Chú Thêm
                </label>
                <textarea
                  rows={2}
                  value={inboundItems}
                  onChange={(e) => setInboundItems(e.target.value)}
                  placeholder="VD: Lô hàng về cảng, số container..."
                  className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {whError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold rounded-xl">
                  {whError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 dark:border-slate-700">
                <Button type="button" variant="ghost" onClick={() => setIsAddInboundOpen(false)}>
                  Hủy
                </Button>
                <Button type="submit" disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                  {isSubmitting ? 'Đang lưu...' : 'Lưu Phiếu Nhập'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: XUẤT KHO */}
      {isAddOutboundOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200 dark:border-slate-700 animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gradient-to-r from-amber-700 to-orange-800 text-white">
              <h3 className="text-base font-bold flex items-center gap-2">
                <ArrowUpFromLine size={18} /> Tạo Phiếu Xuất Kho Cấp Công Trình
              </h3>
              <button onClick={() => setIsAddOutboundOpen(false)} className="text-white/80 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateOutbound} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Dự Án Tiếp Nhận *
                </label>
                {projects.length > 0 ? (
                  <select
                    value={outboundProjectId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setOutboundProjectId(id);
                      const found = projects.find((p: any) => p.id === id);
                      if (found) setOutboundProject(found.name);
                    }}
                    className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="">— Chọn dự án —</option>
                    {projects.map((p: any) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    required
                    value={outboundProject}
                    onChange={(e) => setOutboundProject(e.target.value)}
                    placeholder="VD: Dự án Nhà máy Dệt Tân Bình 1.2 MWp..."
                    className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                  />
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Dòng Vật Tư Xuất (SKU × Số Lượng) *
                </label>
                <div className="space-y-2">
                  {outboundLines.map((l, i) => (
                    <div key={i} className="flex gap-2">
                      <select
                        value={l.sku}
                        onChange={(e) => setLine(setOutboundLines, outboundLines, i, { sku: e.target.value })}
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                      >
                        <option value="">— Chọn SKU —</option>
                        {inventory.map((it: any) => (
                          <option key={it.id} value={it.sku}>{it.sku} — {it.name} (tồn {it.stock})</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min={1}
                        value={l.qty}
                        onChange={(e) => setLine(setOutboundLines, outboundLines, i, { qty: Number(e.target.value) })}
                        className="w-20 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                      />
                      {outboundLines.length > 1 && (
                        <button type="button" onClick={() => setOutboundLines(outboundLines.filter((_, x) => x !== i))} className="px-2 text-rose-500 font-bold">✕</button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setOutboundLines([...outboundLines, { sku: '', qty: 1 }])}
                  className="mt-2 text-xs font-bold text-amber-600 hover:text-amber-700"
                >
                  + Thêm dòng vật tư
                </button>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Ghi Chú Thêm
                </label>
                <textarea
                  rows={2}
                  value={outboundItems}
                  onChange={(e) => setOutboundItems(e.target.value)}
                  placeholder="VD: Xuất cho tổ đội khung giàn..."
                  className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {whError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold rounded-xl">
                  {whError}
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Người Nhận / Kỹ Sư Chỉ Huy *
                </label>
                <input
                  type="text"
                  required
                  value={outboundRequester}
                  onChange={(e) => setOutboundRequester(e.target.value)}
                  placeholder="VD: Chỉ huy trưởng công trình..."
                  className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 dark:border-slate-700">
                <Button type="button" variant="ghost" onClick={() => setIsAddOutboundOpen(false)}>
                  Hủy
                </Button>
                <Button type="submit" disabled={isSubmitting} className="bg-amber-600 hover:bg-amber-700 text-white font-bold">
                  {isSubmitting ? 'Đang lưu...' : 'Lưu Phiếu Xuất'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: THÊM MÃ HÀNG */}
      {isAddItemOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200 dark:border-slate-700 animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Plus size={18} className="text-amber-600" /> Thêm Mã Vật Tư Tồn Kho
              </h3>
              <button onClick={() => setIsAddItemOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleCreateItem} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Mã SKU *
                  </label>
                  <input
                    type="text"
                    required
                    value={itemSku}
                    onChange={(e) => setItemSku(e.target.value)}
                    placeholder="VD: AK-650W"
                    className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Nhóm Chuyên Mục
                  </label>
                  <select
                    value={itemCategory}
                    onChange={(e) => setItemCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="Tấm Pin Solar">Tấm Pin Solar</option>
                    <option value="Biến Tần Inverter">Biến Tần Inverter</option>
                    <option value="Cáp Điện & Phụ Kiện">Cáp Điện & Phụ Kiện</option>
                    <option value="Khung Nhôm & Kết Cấu">Khung Nhôm & Kết Cấu</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Tên Mặt Hàng / Quy Cách *
                </label>
                <input
                  type="text"
                  required
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder="VD: Tấm pin năng lượng mặt trời AIKO 650Wp..."
                  className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Serial Thiết Bị (mỗi serial một dòng)
                </label>
                <textarea
                  rows={3}
                  value={itemSerials}
                  onChange={(e) => setItemSerials(e.target.value)}
                  placeholder="VD: AIKO650-0001&#10;AIKO650-0002..."
                  className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Số Lượng Tồn
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={itemStock}
                    onChange={(e) => setItemStock(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Định Mức Tối Thiểu
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={itemMinStock}
                    onChange={(e) => setItemMinStock(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Đơn Vị Tính
                  </label>
                  <input
                    type="text"
                    value={itemUnit}
                    onChange={(e) => setItemUnit(e.target.value)}
                    placeholder="Tấm / Bộ / Cuộn"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 dark:border-slate-700">
                <Button type="button" variant="ghost" onClick={() => setIsAddItemOpen(false)}>
                  Hủy
                </Button>
                <Button type="submit" disabled={isSubmitting} className="bg-amber-600 hover:bg-amber-700 text-white font-bold">
                  {isSubmitting ? 'Đang lưu...' : 'Lưu Mặt Hàng'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
