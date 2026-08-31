import React, { useMemo, useState } from 'react';
import { Package, Search, FileText, Calendar, DollarSign, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { Contract } from '../../services/contractService';
import { Product } from '../../services/productService';

interface HistoryTabProps {
  contracts: Contract[];
  products: Product[];
}

interface InvoicedProductItem {
  id: string;
  contractId: string;
  contractNumber: string;
  clientName: string;
  productName: string;
  sku: string;
  unit: string;
  invoicedQuantity: number;
  unitPrice: number;
  totalPrice: number;
  invoiceNumber: string;
  invoiceDate: string;
  contractType: 'input' | 'output';
}

export const HistoryTab: React.FC<HistoryTabProps> = ({ contracts, products }) => {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'output' | 'input'>('all');

  const invoicedItems = useMemo(() => {
    const items: InvoicedProductItem[] = [];
    contracts.forEach(c => {
      if (!c.products) return;
      c.products.forEach((cp, idx) => {
        // Fallback to cp.exportedQuantity or cp.quantity if the contract has invoiceNumber
        const invoicedQty = cp.invoicedQuantity || (c.invoiceNumber ? (cp.exportedQuantity || cp.quantity) : 0) || 0;
        if (invoicedQty > 0) {
          // Find matching warehouse product for importCode
          const matchedWarehouseProd = products.find(p => 
            p.id === cp.sourceProductId || 
            p.name.trim().toLowerCase() === cp.name.trim().toLowerCase()
          );
          const sku = matchedWarehouseProd?.importCode || '-';
          
          items.push({
            id: `${c.id}-${idx}-${cp.name}`,
            contractId: c.id,
            contractNumber: c.contractNumber,
            clientName: c.contractType === 'input' ? (c.supplierName || 'Nội bộ') : (c.clientName || 'Nội bộ'),
            productName: cp.name,
            sku,
            unit: cp.unit || '-',
            invoicedQuantity: invoicedQty,
            unitPrice: cp.unitPrice || 0,
            totalPrice: invoicedQty * (cp.unitPrice || 0),
            invoiceNumber: c.invoiceNumber || '-',
            invoiceDate: c.invoiceDate || '',
            contractType: c.contractType || 'output'
          });
        }
      });
    });
    
    // Sort by invoiceDate descending, then invoiceNumber descending
    return items.sort((a, b) => {
      if (!a.invoiceDate && b.invoiceDate) return 1;
      if (a.invoiceDate && !b.invoiceDate) return -1;
      if (a.invoiceDate && b.invoiceDate) {
        const dateCompare = b.invoiceDate.localeCompare(a.invoiceDate);
        if (dateCompare !== 0) return dateCompare;
      }
      return b.invoiceNumber.localeCompare(a.invoiceNumber);
    });
  }, [contracts, products]);

  // Filter items based on search query and type filter
  const filteredItems = useMemo(() => {
    return invoicedItems.filter(item => {
      const matchesSearch = 
        item.productName.toLowerCase().includes(search.toLowerCase()) ||
        item.contractNumber.toLowerCase().includes(search.toLowerCase()) ||
        item.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
        item.clientName.toLowerCase().includes(search.toLowerCase()) ||
        item.sku.toLowerCase().includes(search.toLowerCase());
      
      const matchesType = typeFilter === 'all' || item.contractType === typeFilter;
      
      return matchesSearch && matchesType;
    });
  }, [invoicedItems, search, typeFilter]);

  // Calculations for KPI summaries
  const stats = useMemo(() => {
    const outputItems = invoicedItems.filter(i => i.contractType === 'output');
    const inputItems = invoicedItems.filter(i => i.contractType === 'input');

    const totalOutputQty = outputItems.reduce((sum, i) => sum + i.invoicedQuantity, 0);
    const totalInputQty = inputItems.reduce((sum, i) => sum + i.invoicedQuantity, 0);

    const totalOutputValue = outputItems.reduce((sum, i) => sum + i.totalPrice, 0);
    const totalInputValue = inputItems.reduce((sum, i) => sum + i.totalPrice, 0);

    const latestInvoice = invoicedItems[0] || null;

    return {
      uniqueProducts: new Set(invoicedItems.map(i => i.productName)).size,
      totalOutputQty,
      totalInputQty,
      totalOutputValue,
      totalInputValue,
      latestInvoice
    };
  }, [invoicedItems]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-4 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-purple-100 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 rounded-xl">
            <Package size={20} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Số mặt hàng xuất HĐ</p>
            <p className="text-xl font-black text-gray-900 dark:text-slate-100">{stats.uniqueProducts}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">{invoicedItems.length} bản ghi</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-4 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-xl">
            <ArrowUpRight size={20} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Hóa đơn bán hàng (Xuất)</p>
            <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">
              {stats.totalOutputValue.toLocaleString('vi-VN')} ₫
            </p>
            <p className="text-[11px] text-gray-400 mt-0.5">SL: {stats.totalOutputQty.toLocaleString('vi-VN')}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-4 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-indigo-100 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl">
            <ArrowDownLeft size={20} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Hóa đơn nhập hàng (Mua)</p>
            <p className="text-xl font-black text-indigo-600 dark:text-indigo-400">
              {stats.totalInputValue.toLocaleString('vi-VN')} ₫
            </p>
            <p className="text-[11px] text-gray-400 mt-0.5">SL: {stats.totalInputQty.toLocaleString('vi-VN')}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-4 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 rounded-xl">
            <Calendar size={20} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Hóa đơn mới nhất</p>
            {stats.latestInvoice ? (
              <>
                <p className="text-sm font-black text-gray-900 dark:text-slate-100 truncate max-w-[180px]">
                  Số: {stats.latestInvoice.invoiceNumber}
                </p>
                <p className="text-[11px] text-amber-600 dark:text-amber-400 font-bold mt-0.5">
                  Ngày: {stats.latestInvoice.invoiceDate ? new Date(stats.latestInvoice.invoiceDate).toLocaleDateString('vi-VN') : '-'}
                </p>
              </>
            ) : (
              <p className="text-sm font-bold text-gray-400">Chưa có dữ liệu</p>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">
        {/* Table Header Controls */}
        <div className="p-5 border-b border-gray-100 dark:border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-50/50 dark:bg-slate-700/30">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <h2 className="text-lg font-bold text-gray-800 dark:text-slate-100 flex items-center gap-2">
              <FileText className="text-purple-500" /> Dữ liệu hàng hóa đã xuất hóa đơn
            </h2>
            
            {/* Filter buttons */}
            <div className="inline-flex p-0.5 bg-gray-100 dark:bg-slate-700 rounded-lg text-xs font-semibold">
              <button 
                onClick={() => setTypeFilter('all')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  typeFilter === 'all' 
                    ? 'bg-white dark:bg-slate-600 text-gray-850 dark:text-slate-100 shadow-sm' 
                    : 'text-gray-500 dark:text-slate-400 hover:text-gray-700'
                }`}
              >
                Tất cả
              </button>
              <button 
                onClick={() => setTypeFilter('output')}
                className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 ${
                  typeFilter === 'output' 
                    ? 'bg-emerald-500 text-white shadow-sm font-bold' 
                    : 'text-gray-500 dark:text-slate-400 hover:text-emerald-500'
                }`}
              >
                <ArrowUpRight size={12} /> Bán (Xuất)
              </button>
              <button 
                onClick={() => setTypeFilter('input')}
                className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 ${
                  typeFilter === 'input' 
                    ? 'bg-indigo-500 text-white shadow-sm font-bold' 
                    : 'text-gray-500 dark:text-slate-400 hover:text-indigo-500'
                }`}
              >
                <ArrowDownLeft size={12} /> Mua (Nhập)
              </button>
            </div>
          </div>

          <div className="relative w-full md:w-80">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Tìm kiếm sản phẩm, hợp đồng, hóa đơn..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-850 dark:text-slate-100 transition-shadow"
            />
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-gray-50 dark:bg-slate-700/50 border-b border-gray-100 dark:border-slate-700">
                <th className="p-4 font-bold text-gray-500 dark:text-slate-400 text-xs uppercase w-12 text-center">STT</th>
                <th className="p-4 font-bold text-gray-500 dark:text-slate-400 text-xs uppercase w-20 text-center">Loại HĐ</th>
                <th className="p-4 font-bold text-gray-500 dark:text-slate-400 text-xs uppercase w-32">Mã HĐ</th>
                <th className="p-4 font-bold text-gray-500 dark:text-slate-400 text-xs uppercase min-w-[200px]">Sản phẩm / SKU</th>
                <th className="p-4 font-bold text-gray-500 dark:text-slate-400 text-xs uppercase">Đối tác</th>
                <th className="p-4 font-bold text-gray-500 dark:text-slate-400 text-xs uppercase text-center w-24">Số lượng</th>
                <th className="p-4 font-bold text-gray-500 dark:text-slate-400 text-xs uppercase text-right w-32">Đơn giá</th>
                <th className="p-4 font-bold text-purple-600 text-xs uppercase text-right w-36">Thành tiền</th>
                <th className="p-4 font-bold text-gray-500 dark:text-slate-400 text-xs uppercase w-36">Hóa đơn số / Ngày</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-slate-700/50">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-12 text-center">
                    <FileText size={40} className="mx-auto mb-3 text-gray-300 dark:text-slate-600" />
                    <p className="font-bold text-gray-500 dark:text-slate-400 mb-1">Chưa có lịch sử xuất hóa đơn</p>
                    <p className="text-sm text-gray-400 dark:text-slate-550">Thực hiện xuất hóa đơn trong chi tiết hợp đồng để ghi nhận thông tin</p>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-gray-50/80 dark:hover:bg-slate-700/20 transition-colors">
                    <td className="p-4 text-center text-sm font-medium text-gray-400">{idx + 1}</td>
                    <td className="p-4 text-center">
                      {item.contractType === 'output' ? (
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
                          <ArrowUpRight size={10} /> Bán
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-400">
                          <ArrowDownLeft size={10} /> Mua
                        </span>
                      )}
                    </td>
                    <td className="p-4 font-bold text-gray-700 dark:text-slate-350 text-sm">
                      {item.contractNumber}
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-gray-800 dark:text-slate-200">{item.productName}</div>
                      <div className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                        Mã NK/SKU: <span className="font-semibold text-gray-700 dark:text-slate-300">{item.sku}</span> | ĐVT: {item.unit}
                      </div>
                    </td>
                    <td className="p-4 text-sm text-gray-600 dark:text-slate-400 font-medium">
                      {item.clientName}
                    </td>
                    <td className="p-4 text-center font-black text-gray-850 dark:text-slate-100 text-sm">
                      {item.invoicedQuantity.toLocaleString('vi-VN')}
                    </td>
                    <td className="p-4 text-right text-sm text-gray-500 dark:text-slate-400 font-medium">
                      {item.unitPrice.toLocaleString('vi-VN')} ₫
                    </td>
                    <td className="p-4 text-right font-black text-purple-600 dark:text-purple-400 text-sm">
                      {item.totalPrice.toLocaleString('vi-VN')} ₫
                    </td>
                    <td className="p-4">
                      <div className="text-sm font-bold text-gray-700 dark:text-slate-300">
                        HD-{item.invoiceNumber}
                      </div>
                      {item.invoiceDate && (
                        <div className="text-[11px] text-gray-400 dark:text-slate-450 font-normal mt-0.5">
                          {new Date(item.invoiceDate).toLocaleDateString('vi-VN')}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
