import React, { useState, useMemo } from 'react';
import { Search, X, Check, FileText, AlertTriangle, Package, ChevronDown, ChevronRight } from 'lucide-react';
import { Contract, ContractProduct } from '../../services/contractService';

interface InputContractPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  contracts: Contract[];
  allContracts?: Contract[]; // All contracts to compute remaining stock
  editingContractId?: string; // Current contract being edited (exclude from calculation)
  onSelect: (products: ContractProduct[], contractId: string) => void;
}

export const InputContractPickerModal: React.FC<InputContractPickerModalProps> = ({
  isOpen,
  onClose,
  contracts,
  allContracts,
  editingContractId,
  onSelect,
}) => {
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedQty, setSelectedQty] = useState<Record<string, number>>({}); // productName → qty

  const inputContracts = contracts.filter(c => c.contractType === 'input' && c.status !== 'cancelled');

  const filteredContracts = inputContracts.filter(c =>
    (c.contractNumber?.toLowerCase().includes(search.toLowerCase()) || '') ||
    (c.contractName?.toLowerCase().includes(search.toLowerCase()) || '') ||
    (c.clientName?.toLowerCase().includes(search.toLowerCase()) || '')
  );

  // Compute remaining stock for each product name
  const remainingMap = useMemo(() => {
    const sourceContracts = allContracts || contracts;

    // Total imported from input contracts
    const importedMap = new Map<string, number>();
    sourceContracts
      .filter(c => c.contractType === 'input' && c.status !== 'cancelled')
      .forEach(c => {
        (c.products || []).forEach(cp => {
          const key = cp.name.trim().toLowerCase();
          importedMap.set(key, (importedMap.get(key) || 0) + (cp.quantity || 0));
        });
      });

    // Total already in output contracts (excluding current editing contract)
    const exportedMap = new Map<string, number>();
    sourceContracts
      .filter(c => c.contractType === 'output' && c.status !== 'cancelled' && c.id !== editingContractId)
      .forEach(c => {
        (c.products || []).forEach(cp => {
          const key = cp.name.trim().toLowerCase();
          exportedMap.set(key, (exportedMap.get(key) || 0) + (cp.quantity || 0));
        });
      });

    const result = new Map<string, number>();
    importedMap.forEach((qty, key) => {
      result.set(key, qty - (exportedMap.get(key) || 0));
    });
    return result;
  }, [allContracts, contracts, editingContractId]);

  const getRemaining = (productName: string) => {
    return remainingMap.get(productName.trim().toLowerCase()) ?? Infinity;
  };

  const handleToggleExpand = (contractId: string) => {
    if (expandedId === contractId) {
      setExpandedId(null);
    } else {
      setExpandedId(contractId);
      // Pre-fill quantities with remaining (capped at contract qty)
      const contract = inputContracts.find(c => c.id === contractId);
      if (contract?.products) {
        const newQty: Record<string, number> = {};
        contract.products.forEach(p => {
          const rem = getRemaining(p.name);
          const max = Math.min(p.quantity || 0, rem > 0 ? rem : 0);
          if (max > 0) newQty[p.name] = max;
        });
        setSelectedQty(newQty);
      }
    }
  };

  const handleQtyChange = (productName: string, val: string, contractQty: number) => {
    const rem = getRemaining(productName);
    const max = Math.min(contractQty, Math.max(0, rem));
    const qty = Math.max(0, Math.min(Number(val) || 0, max));
    setSelectedQty(prev => {
      const next = { ...prev };
      if (qty === 0) delete next[productName];
      else next[productName] = qty;
      return next;
    });
  };

  const handleConfirm = () => {
    if (!expandedId) return;
    const contract = inputContracts.find(c => c.id === expandedId);
    if (!contract?.products) return;

    const selectedProducts: ContractProduct[] = contract.products
      .filter(p => selectedQty[p.name] && selectedQty[p.name] > 0)
      .map(p => ({ ...p, quantity: selectedQty[p.name] }));

    if (selectedProducts.length > 0) {
      onSelect(selectedProducts, contract.id);
    }
    onClose();
    setSelectedId(null);
    setSelectedQty({});
    setExpandedId(null);
  };

  const [, setSelectedId] = useState<string | null>(null);

  const totalSelected = Object.values(selectedQty).reduce((s, v) => s + v, 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-3xl flex flex-col max-h-[85vh]">
        <div className="p-4 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between bg-gray-50 dark:bg-slate-800/80 rounded-t-2xl">
          <h2 className="text-xl font-bold text-gray-800 dark:text-slate-100 flex items-center gap-2">
            <FileText className="text-blue-500" /> Chọn từ Hợp đồng mua vào
          </h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 rounded-full hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 border-b border-gray-100 dark:border-slate-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Tìm kiếm số hợp đồng, tên, đối tác..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700/50 focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-700 text-gray-800 dark:text-slate-100"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-3">
            {filteredContracts.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                Không tìm thấy Hợp đồng mua vào nào.
              </div>
            ) : (
              filteredContracts.map((c) => {
                const isExpanded = expandedId === c.id;
                // Check if any product has remaining stock
                const hasStock = (c.products || []).some(p => getRemaining(p.name) > 0);

                return (
                  <div
                    key={c.id}
                    className={`border rounded-xl transition-all overflow-hidden ${
                      isExpanded ? 'border-blue-400 shadow-sm' : 'border-gray-200 hover:border-blue-300'
                    } ${!hasStock ? 'opacity-60' : ''}`}
                  >
                    {/* Contract Header */}
                    <div
                      onClick={() => hasStock && handleToggleExpand(c.id)}
                      className={`p-4 cursor-pointer ${isExpanded ? 'bg-blue-50' : 'bg-white hover:bg-gray-50'} ${!hasStock ? 'cursor-not-allowed' : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {isExpanded ? <ChevronDown size={16} className="text-blue-500" /> : <ChevronRight size={16} className="text-gray-400" />}
                          <div>
                            <div className="font-bold text-gray-800">{c.contractNumber || 'Chưa có số'}</div>
                            <div className="text-sm text-gray-600">{c.contractName}</div>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-sm font-bold text-blue-600">{(c.postTaxValue || 0).toLocaleString('vi-VN')} ₫</div>
                          <div className="text-xs text-gray-500">{new Date(c.createdAt).toLocaleDateString('vi-VN')}</div>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 mt-1 ml-7">Đối tác: <span className="font-semibold text-gray-700">{c.clientName}</span></div>
                      {!hasStock && (
                        <div className="mt-2 ml-7 flex items-center gap-1.5 text-xs font-bold text-rose-600">
                          <AlertTriangle size={12} /> Hết hàng — Tất cả sản phẩm đã phân bổ cho HĐ Bán khác
                        </div>
                      )}
                    </div>

                    {/* Expanded Product List */}
                    {isExpanded && (
                      <div className="border-t border-blue-100 bg-white">
                        <div className="px-4 py-2 bg-blue-50/50 border-b border-blue-100">
                          <p className="text-xs font-bold text-blue-700 uppercase tracking-wider">Chọn số lượng cần lấy (capped theo tồn kho thực tế)</p>
                        </div>
                        <div className="divide-y divide-gray-50">
                          {(c.products || []).map((p, i) => {
                            const remaining = getRemaining(p.name);
                            const available = Math.min(p.quantity || 0, Math.max(0, remaining));
                            const isOutOfStock = remaining <= 0;
                            const isPartial = remaining > 0 && remaining < (p.quantity || 0);

                            return (
                              <div key={i} className={`flex items-center gap-3 px-4 py-3 ${isOutOfStock ? 'bg-rose-50/50 opacity-60' : ''}`}>
                                <Package size={14} className={isOutOfStock ? 'text-rose-300' : 'text-emerald-500'} />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-gray-800 truncate">{p.name}</p>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-xs text-gray-500">HĐ: {p.quantity} {p.unit}</span>
                                    {isOutOfStock ? (
                                      <span className="text-[10px] font-bold px-1.5 py-0.5 bg-rose-100 text-rose-700 rounded-full flex items-center gap-1">
                                        <AlertTriangle size={9} /> Hết tồn kho
                                      </span>
                                    ) : isPartial ? (
                                      <span className="text-[10px] font-bold px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full flex items-center gap-1">
                                        <AlertTriangle size={9} /> Còn {remaining} / {p.quantity}
                                      </span>
                                    ) : (
                                      <span className="text-[10px] font-bold px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-full">
                                        Còn đủ ({remaining})
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <span className="text-xs text-gray-500">SL lấy:</span>
                                  <input
                                    type="number"
                                    min={0}
                                    max={available}
                                    disabled={isOutOfStock}
                                    value={selectedQty[p.name] ?? ''}
                                    onChange={e => handleQtyChange(p.name, e.target.value, p.quantity || 0)}
                                    placeholder="0"
                                    className={`w-20 px-2 py-1.5 border rounded text-center text-sm font-bold focus:ring-2 focus:ring-blue-500 ${
                                      isOutOfStock
                                        ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                                        : 'border-blue-300 bg-blue-50/50 text-blue-700'
                                    }`}
                                  />
                                  {available > 0 && (
                                    <button
                                      onClick={() => handleQtyChange(p.name, String(available), p.quantity || 0)}
                                      className="text-[10px] font-bold text-blue-500 hover:text-blue-700 underline"
                                    >
                                      Max
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Insufficient stock warning */}
                        {(c.products || []).some(p => getRemaining(p.name) < (p.quantity || 0)) && (
                          <div className="mx-4 mb-3 mt-1 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                            <AlertTriangle size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-amber-700 font-medium">
                              Một số sản phẩm không đủ số lượng yêu cầu. Chọn thêm từ kho khác hoặc tạo thêm HĐ Mua.
                              Số lượng lấy đã được giới hạn theo tồn kho thực tế.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="p-4 border-t border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-800/80 rounded-b-2xl gap-3">
          <div className="text-sm text-gray-600">
            {expandedId && totalSelected > 0 ? (
              <span>Đã chọn <span className="font-bold text-blue-600">{totalSelected}</span> sản phẩm để lấy</span>
            ) : (
              <span className="text-gray-400">Mở rộng một HĐ Mua để chọn sản phẩm</span>
            )}
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="px-6 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl font-bold transition-colors">
              Hủy bỏ
            </button>
            <button
              onClick={handleConfirm}
              disabled={!expandedId || totalSelected === 0}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30"
            >
              <Check size={18} /> Xác nhận ({totalSelected})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
