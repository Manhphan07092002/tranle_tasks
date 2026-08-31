import React, { useState, useEffect } from 'react';
import { X, Save, FileText } from 'lucide-react';
import { Contract, ContractProduct } from '../../services/contractService';

interface ExportInvoiceModalProps {
  contract: Contract | null;
  onClose: () => void;
  onSave: (contractId: string, updatedProducts: ContractProduct[], invoiceNumber: string, invoiceDate: string) => Promise<void>;
}

export const ExportInvoiceModal: React.FC<ExportInvoiceModalProps> = ({ contract, onClose, onSave }) => {
  const [products, setProducts] = useState<ContractProduct[]>([]);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (contract?.products) {
      setProducts(JSON.parse(JSON.stringify(contract.products)));
      setInvoiceNumber(contract.invoiceNumber || '');
      setInvoiceDate(contract.invoiceDate || new Date().toISOString().split('T')[0]);
      setError(null);
    }
  }, [contract]);

  if (!contract) return null;

  const handleInvoiceQuantityChange = (index: number, val: string) => {
    const newQty = Number(val.replace(/\D/g, '')) || 0;
    const maxQty = products[index].quantity;
    const safeQty = Math.min(newQty, maxQty);
    
    const newProducts = [...products];
    newProducts[index].invoicedQuantity = safeQty;
    setProducts(newProducts);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await onSave(contract.id, products, invoiceNumber, invoiceDate);
      onClose();
    } catch (error: any) {
      setError(error.message || 'Có lỗi xảy ra khi lưu xuất hóa đơn');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <FileText className="text-purple-500" />
            Xuất hóa đơn theo hợp đồng
          </h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSave} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-5 flex-1 overflow-y-auto space-y-5">
            <div>
              <p className="text-sm font-bold text-gray-700">Hợp đồng: <span className="text-purple-600">{contract.contractNumber}</span></p>
              <p className="text-xs text-gray-500 mt-1">Khách hàng: {contract.clientName}</p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 text-red-700 rounded-xl text-sm font-medium flex items-center gap-2 border border-red-200">
                <X size={16} className="flex-shrink-0" />
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">SỐ HÓA ĐƠN</label>
                <input required value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} placeholder="VD: 0001234"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white text-gray-800" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">NGÀY XUẤT HÓA ĐƠN</label>
                <input type="date" required value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white text-gray-800" />
              </div>
            </div>

            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="p-3 font-bold text-gray-600">Sản phẩm</th>
                    <th className="p-3 font-bold text-gray-600 text-center w-24">Tổng SL</th>
                    <th className="p-3 font-bold text-purple-600 text-center w-32">Đã xuất HĐ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {products.map((p, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                      <td className="p-3">
                        <p className="font-bold text-gray-800">{p.name}</p>
                        <p className="text-xs text-gray-500">Đơn giá: {p.unitPrice.toLocaleString('vi-VN')} ₫</p>
                      </td>
                      <td className="p-3 text-center font-bold text-gray-700">{p.quantity}</td>
                      <td className="p-3">
                        <input 
                          type="number"
                          min="0"
                          max={p.quantity}
                          value={p.invoicedQuantity !== undefined ? p.invoicedQuantity : 0}
                          onChange={e => handleInvoiceQuantityChange(idx, e.target.value)}
                          className="w-full px-2 py-1.5 border border-purple-300 rounded text-center focus:ring-2 focus:ring-purple-500 font-bold text-purple-700"
                        />
                      </td>
                    </tr>
                  ))}
                  {products.length === 0 && (
                    <tr>
                      <td colSpan={3} className="p-4 text-center text-gray-500">Hợp đồng này chưa có sản phẩm nào.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
          </div>
          
          <div className="p-5 border-t border-gray-100 flex gap-3 bg-gray-50">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl font-bold transition-colors">
              Hủy bỏ
            </button>
            <button type="submit" disabled={loading || products.length === 0 || !invoiceNumber} className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2.5 rounded-xl font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-purple-500/30">
              <Save size={18} /> {loading ? 'Đang lưu...' : 'Lưu Hóa đơn'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
