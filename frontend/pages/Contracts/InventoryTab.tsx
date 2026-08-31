import React, { useMemo, useState } from 'react';
import { Package, Search, AlertTriangle } from 'lucide-react';
import { Contract } from '../../services/contractService';
import { Product } from '../../services/productService';

interface InventoryTabProps {
  contracts: Contract[];
  products: Product[];
}

export const InventoryTab: React.FC<InventoryTabProps> = ({ contracts, products }) => {
  const [search, setSearch] = useState('');

  const inventoryData = useMemo(() => {
    return products.map(p => {
      const totalImported = p.importQuantity || 0;
      const relatedContracts: { contractNumber: string; clientName: string; exportedQty: number }[] = [];

      contracts
        .filter(c => c.contractType === 'output' && c.status !== 'cancelled')
        .forEach(c => {
          (c.products || []).forEach(cp => {
            // Check if this sold item explicitly links to this specific warehouse lot
            const matchesLot =
              (cp.sourceProductId && cp.sourceProductId === p.id) ||
              (cp.importCode && cp.importCode === p.importCode);

            // Fallback for legacy data or other flows:
            // Match by name if the output contract c is linked to the source input contract of this lot
            let matchesFallback = false;
            if (!matchesLot && cp.name?.trim().toLowerCase() === p.name.trim().toLowerCase()) {
              const baseCode = p.importCode?.replace(/-\d+$/, '').trim();
              const srcContract = contracts.find(ic => ic.contractType === 'input' && ic.contractNumber?.trim() === baseCode);
              if (srcContract && c.linkedInputContractIds?.includes(srcContract.id)) {
                matchesFallback = true;
              }
            }

            if (matchesLot || matchesFallback) {
              const qty = cp.quantity || 0;
              if (qty > 0) {
                relatedContracts.push({
                  contractNumber: c.contractNumber || c.id,
                  clientName: c.clientName || '',
                  exportedQty: qty
                });
              }
            }
          });
        });

      const totalExported = relatedContracts.reduce((s, rc) => s + rc.exportedQty, 0);
      const remaining = totalImported - totalExported;

      return {
        ...p,
        totalImported,
        totalExported,
        remaining,
        relatedContracts
      };
    });
  }, [products, contracts]);

  const filteredData = inventoryData.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.importCode?.toLowerCase().includes(search.toLowerCase())
  );

  const overAllocated = filteredData.filter(p => p.remaining < 0).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Tổng sản phẩm</p>
          <p className="text-2xl font-black text-gray-900">{inventoryData.length}</p>
          <p className="text-[11px] text-gray-400 mt-1">{filteredData.length} hiển thị</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Tổng nhập kho</p>
          <p className="text-2xl font-black text-gray-900">{inventoryData.reduce((s, p) => s + p.totalImported, 0).toLocaleString('vi-VN')}</p>
          <p className="text-[11px] text-gray-400 mt-1">Từ HĐ Mua</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1">Đã phân bổ</p>
          <p className="text-2xl font-black text-emerald-600">{inventoryData.reduce((s, p) => s + p.totalExported, 0).toLocaleString('vi-VN')}</p>
          <p className="text-[11px] text-gray-400 mt-1">Từ HĐ Bán</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-1">Tồn kho</p>
          <p className="text-2xl font-black text-blue-600">{inventoryData.reduce((s, p) => s + Math.max(0, p.remaining), 0).toLocaleString('vi-VN')}</p>
          {overAllocated > 0 && (
            <p className="text-[11px] text-rose-500 mt-1 font-bold flex items-center gap-1">
              <AlertTriangle size={10} /> {overAllocated} SP bán vượt tồn
            </p>
          )}
        </div>
      </div>

      {/* Over-allocated warning */}
      {overAllocated > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl px-5 py-4 flex items-start gap-3">
          <AlertTriangle size={18} className="text-rose-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-rose-700">Cảnh báo: Bán vượt tồn kho</p>
            <p className="text-xs text-rose-600 mt-0.5">
              Có {overAllocated} sản phẩm đã phân bổ vượt số lượng nhập từ hợp đồng mua.
              Vui lòng kiểm tra lại các hợp đồng bán liên quan.
            </p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gray-50/50">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Package className="text-emerald-500" /> Hàng đã phân bổ
          </h2>
          <div className="relative w-full sm:w-80">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm kiếm sản phẩm..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="p-4 font-bold text-gray-500 text-xs uppercase w-12 text-center">STT</th>
                <th className="p-4 font-bold text-gray-500 text-xs uppercase min-w-[180px]">Sản phẩm</th>
                <th className="p-4 font-bold text-gray-500 text-xs uppercase text-center w-24">Tổng mua</th>
                <th className="p-4 font-bold text-emerald-600 text-xs uppercase text-center w-28">Đã phân bổ</th>
                <th className="p-4 font-bold text-blue-600 text-xs uppercase text-center w-24">Tồn kho</th>
                <th className="p-4 font-bold text-gray-500 text-xs uppercase">HĐ Bán liên quan</th>
                <th className="p-4 font-bold text-gray-500 text-xs uppercase w-32">Tiến trình</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center">
                    <Package size={40} className="mx-auto mb-3 text-gray-300" />
                    <p className="font-bold text-gray-500 mb-1">Không tìm thấy sản phẩm</p>
                    <p className="text-sm text-gray-400">Tạo HĐ Mua có sản phẩm để bắt đầu theo dõi tồn kho</p>
                  </td>
                </tr>
              ) : (
                filteredData.map((p, idx) => {
                  const percentAllocated = p.totalImported > 0
                    ? Math.min(100, Math.round((p.totalExported / p.totalImported) * 100))
                    : 0;
                  const isOverAllocated = p.remaining < 0;

                  return (
                    <tr key={p.id} className={`hover:bg-gray-50/80 transition-colors ${isOverAllocated ? 'bg-rose-50/40' : ''}`}>
                      <td className="p-4 text-center text-sm font-medium text-gray-400">{idx + 1}</td>
                      <td className="p-4">
                        <div className="font-bold text-gray-800">{p.name}</div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {p.importCode ? `SKU: ${p.importCode} | ` : ''}ĐVT: {p.unit || '-'}
                        </div>
                      </td>
                      <td className="p-4 text-center font-bold text-gray-600 text-sm">
                        {p.totalImported.toLocaleString('vi-VN')}
                      </td>
                      <td className="p-4 text-center font-bold text-emerald-600 text-sm">
                        {p.totalExported.toLocaleString('vi-VN')}
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                          isOverAllocated ? 'bg-rose-100 text-rose-700 border border-rose-200' :
                          p.remaining <= 5 ? 'bg-amber-100 text-amber-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {isOverAllocated && '⚠ '}{p.remaining}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1.5">
                          {p.relatedContracts.map((rc, i) => (
                            <div key={i} className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-gray-200 rounded-md text-xs" title={rc.clientName}>
                              <span className="font-semibold text-gray-700">{rc.contractNumber}</span>
                              <span className="text-emerald-600 font-bold">({rc.exportedQty})</span>
                            </div>
                          ))}
                          {p.relatedContracts.length === 0 && (
                            <span className="text-xs text-gray-400 italic">Chưa phân bổ</span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="w-full bg-gray-100 rounded-full h-2.5 mt-1">
                          <div
                            className={`h-2.5 rounded-full transition-all duration-500 ${
                              isOverAllocated ? 'bg-rose-500' :
                              percentAllocated >= 100 ? 'bg-emerald-500' :
                              percentAllocated >= 70 ? 'bg-blue-500' :
                              percentAllocated >= 30 ? 'bg-amber-500' :
                              'bg-gray-300'
                            }`}
                            style={{ width: `${Math.min(100, percentAllocated)}%` }}
                          ></div>
                        </div>
                        <div className={`text-[10px] text-right mt-1 font-bold ${isOverAllocated ? 'text-rose-500' : 'text-gray-500'}`}>
                          {percentAllocated}%{isOverAllocated ? ' (Vượt)' : ''}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
