import React from 'react';
import { FileText, Package, X, PlusCircle, Trash2, Pencil } from 'lucide-react';

interface ContractProductsTableProps {
  form: any;
  isInput: boolean;
  isFormLocked: boolean;
  editingProductIdx: number | null;
  setEditingProductIdx: React.Dispatch<React.SetStateAction<number | null>>;
  newProduct: any;
  setNewProduct: React.Dispatch<React.SetStateAction<any>>;
  catalogProducts: any[];
  contracts: any[];
  handleNumericInputChange: (e: React.ChangeEvent<HTMLInputElement>, onChange: (val: string) => void) => void;
  handleAddProduct: () => void;
  handleEditProduct: (idx: number) => void;
  handleRemoveProduct: (idx: number) => void;
  borderColor: string;
  ringColor: string;
  btnColor: string;
  showWarehousePicker: boolean;
  setShowWarehousePicker: (v: boolean) => void;
  showInputPicker: boolean;
  setShowInputPicker: (v: boolean) => void;
}

export function ContractProductsTable({
  form,
  isInput,
  isFormLocked,
  editingProductIdx,
  setEditingProductIdx,
  newProduct,
  setNewProduct,
  catalogProducts,
  contracts,
  handleNumericInputChange,
  handleAddProduct,
  handleEditProduct,
  handleRemoveProduct,
  borderColor,
  ringColor,
  btnColor,
  showWarehousePicker,
  setShowWarehousePicker,
  showInputPicker,
  setShowInputPicker,
}: ContractProductsTableProps) {
  return (
    <fieldset disabled={isFormLocked} className="group-disabled">
      <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
        <div className="flex justify-between items-center mb-3">
          <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider">Chi tiết sản phẩm / Dịch vụ</label>
          {!isInput && !isFormLocked && (
            <div className="flex gap-2">
              <button
                onClick={() => setShowInputPicker(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg text-xs font-bold transition-colors border border-blue-200"
              >
                <FileText size={14} /> Chọn từ HĐ Mua vào
              </button>
              <button
                onClick={() => setShowWarehousePicker(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-lg text-xs font-bold transition-colors border border-emerald-200"
              >
                <Package size={14} /> Chọn từ kho
              </button>
            </div>
          )}
        </div>
        <div className="overflow-x-auto mb-4 border border-gray-200 rounded-lg">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-gray-100 text-gray-600 text-[11px] uppercase tracking-wider">
                <th className="p-3 font-bold border-b border-gray-200 text-center w-12">STT</th>
                <th className="p-3 font-bold border-b border-gray-200 min-w-[200px]">Tên sản phẩm *</th>
                <th className="p-3 font-bold border-b border-gray-200 w-24">ĐVT</th>
                <th className="p-3 font-bold border-b border-gray-200 w-32">Xuất xứ</th>
                <th className="p-3 font-bold border-b border-gray-200 w-20 text-center">SL *</th>
                <th className="p-3 font-bold border-b border-gray-200 w-36 text-right">Đơn giá (VNĐ) *</th>
                <th className="p-3 font-bold border-b border-gray-200 w-20 text-center">Thuế (%)</th>
                <th className="p-3 font-bold border-b border-gray-200 w-36 text-right">Thành tiền (VNĐ)</th>
                {!isFormLocked && <th className="p-3 font-bold border-b border-gray-200 w-24 text-center">Thao tác</th>}
              </tr>
            </thead>
            <tbody className="bg-white">
              {form.products.map((p: any, idx: number) => {
                const isEditing = !isFormLocked && editingProductIdx === idx;
                const activeBg = isInput ? 'bg-blue-50/40 border-blue-200' : 'bg-emerald-50/40 border-emerald-200';

                if (isEditing) {
                  return (
                    <tr key={idx} className={`border-b transition-colors ${activeBg}`}>
                      <td className="p-3 text-sm font-bold text-center align-middle" style={{ color: isInput ? '#2563eb' : '#059669' }}>
                        {idx + 1}
                      </td>
                      <td className="p-2 align-middle">
                        <input
                          value={newProduct.name}
                          onChange={e => {
                            const val = e.target.value;
                            const updates: any = { name: val };
                            if (val) {
                              const catalogMatch = catalogProducts.find(prod => prod.name.trim().toLowerCase() === val.trim().toLowerCase());
                              const historyMatch = contracts.flatMap(c => c.products || []).find(prod => prod.name?.trim().toLowerCase() === val.trim().toLowerCase());
                              const match = catalogMatch || historyMatch;
                              if (match) {
                                if (!newProduct.unit) updates.unit = match.unit || '';
                                if (!newProduct.origin) updates.origin = match.origin || '';
                                if (!newProduct.unitPrice) {
                                  let priceVal = '';
                                  if ('importPrice' in match || 'salePrice' in match) {
                                    if (form.contractType === 'input' && match.importPrice) priceVal = String(match.importPrice);
                                    else if (form.contractType !== 'input' && match.salePrice) priceVal = String(match.salePrice);
                                    else if (match.defaultPrice !== undefined) priceVal = String(match.defaultPrice);
                                  } else if ('unitPrice' in match) {
                                    priceVal = String(match.unitPrice);
                                  }
                                  if (priceVal) {
                                    updates.unitPrice = Number(priceVal.replace(/\D/g, '')).toLocaleString('vi-VN');
                                  }
                                }
                              }
                            }
                            setNewProduct({ ...newProduct, ...updates });
                          }}
                          placeholder="Nhập tên SP..."
                          list="product-name-suggestions"
                          className={`w-full px-2 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-1 bg-white font-bold ${borderColor} ${ringColor}`}
                        />
                        <datalist id="product-name-suggestions">
                          {Array.from(new Set([
                            ...catalogProducts.map(p => p.name),
                            ...contracts.flatMap(c => c.products || []).map((p: any) => p.name)
                          ].filter(Boolean))).sort().map(name => (
                            <option key={name} value={name} />
                          ))}
                        </datalist>
                      </td>
                      <td className="p-2 align-middle">
                        <input
                          value={newProduct.unit}
                          onChange={e => setNewProduct({ ...newProduct, unit: e.target.value })}
                          placeholder="VD: Cái"
                          list="product-unit-suggestions"
                          className={`w-full px-2 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-1 bg-white ${borderColor} ${ringColor}`}
                        />
                      </td>
                      <td className="p-2 align-middle">
                        <input
                          value={newProduct.origin}
                          onChange={e => setNewProduct({ ...newProduct, origin: e.target.value })}
                          placeholder="VD: VN"
                          list="product-origin-suggestions"
                          className={`w-full px-2 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-1 bg-white ${borderColor} ${ringColor}`}
                        />
                      </td>
                      <td className="p-2 align-middle">
                        <input
                          type="number"
                          min="1"
                          value={newProduct.quantity}
                          onChange={e => setNewProduct({ ...newProduct, quantity: e.target.value })}
                          placeholder="1"
                          className={`w-full px-2 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-1 bg-white text-center font-semibold ${borderColor} ${ringColor}`}
                        />
                      </td>
                      <td className="p-2 align-middle">
                        <input
                          type="text"
                          value={newProduct.unitPrice || ''}
                          onChange={e => handleNumericInputChange(e, val => setNewProduct({ ...newProduct, unitPrice: val }))}
                          placeholder="1.000.000"
                          list="product-price-suggestions"
                          className={`w-full px-2 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-1 bg-white text-right font-bold ${borderColor} ${ringColor}`}
                        />
                      </td>
                      <td className="p-2 align-middle">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={newProduct.vatRate}
                          onChange={e => setNewProduct({ ...newProduct, vatRate: e.target.value })}
                          placeholder="8"
                          className={`w-full px-2 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-1 bg-white text-center font-medium ${borderColor} ${ringColor}`}
                        />
                      </td>
                      <td className="p-2 align-middle">
                        <input
                          type="text"
                          readOnly
                          disabled
                          value={((Number(newProduct.quantity) || 1) * (Number(newProduct.unitPrice?.replace(/\D/g, '')) || 0)).toLocaleString('vi-VN')}
                          className={`w-full px-2 py-1.5 text-sm border border-transparent rounded-md font-extrabold text-right cursor-not-allowed ${
                            isInput ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
                          }`}
                        />
                      </td>
                      <td className="p-2 text-center align-middle">
                        <div className="flex gap-1 justify-center">
                          <button
                            onClick={handleAddProduct}
                            disabled={!newProduct.name || !newProduct.unitPrice}
                            className={`px-3 py-1.5 text-xs font-bold text-white rounded-md disabled:opacity-50 transition-colors flex items-center justify-center shadow-sm ${btnColor}`}
                            title="Lưu"
                          >
                            <PlusCircle size={12} className="mr-1" /> Lưu
                          </button>
                          <button
                            onClick={() => {
                              setNewProduct({ name: '', unit: '', quantity: '1', origin: '', unitPrice: '', vatRate: '8' });
                              setEditingProductIdx(null);
                            }}
                            className="p-1.5 text-xs font-bold text-gray-600 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors flex items-center justify-center shadow-sm"
                            title="Hủy"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={idx} className={`border-b border-gray-100 transition-colors ${
                    p.isBuyingPriceFallback
                      ? 'bg-amber-50/70 hover:bg-amber-100/80 dark:bg-amber-950/20 border-amber-100'
                      : 'hover:bg-gray-50'
                  }`}>
                    <td className="p-3 text-sm text-gray-500 font-medium text-center">{idx + 1}</td>
                    <td className="p-3 text-sm font-bold text-gray-800">
                      <div>{p.name}</div>
                      {p.isBuyingPriceFallback && (
                        <div className="mt-1 text-[10px] font-bold text-amber-600 animate-pulse">
                          ⚠️ Giá đề xuất từ HĐ Mua (Chưa có giá bán gợi ý)
                        </div>
                      )}
                      {p.sourceProductId && (
                        <span className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700">
                          <Package size={10} /> Kho
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-sm text-gray-600">{p.unit || '-'}</td>
                    <td className="p-3 text-sm text-gray-600">{p.origin || '-'}</td>
                    <td className="p-3 text-sm font-semibold text-gray-700 text-center">{p.quantity}</td>
                    <td className="p-3 text-sm font-medium text-gray-600 text-right">
                      <div>{p.unitPrice.toLocaleString('vi-VN')}</div>
                      {p.isBuyingPriceFallback && (
                        <div className="text-[10px] font-bold text-amber-500 animate-pulse mt-0.5">
                          Cần cập nhật giá bán!
                        </div>
                    )}
                      </td>
                    <td className="p-3 text-sm font-medium text-gray-600 text-center">{p.vatRate ?? 8}</td>
                    <td className="p-3 text-sm font-bold text-emerald-600 text-right">{p.total.toLocaleString('vi-VN')}</td>
                    {!isFormLocked && (
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleEditProduct(idx)}
                            className="p-1.5 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                            title="Sửa"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => handleRemoveProduct(idx)}
                            className="p-1.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
                            title="Xóa"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        </div>
      </fieldset>
    );
  }