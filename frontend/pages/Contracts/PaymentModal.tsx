import React, { useState, useEffect } from 'react';
import { X, Wallet, TrendingUp, AlertCircle, Save, Calendar, Trash2, CreditCard, Coins, MessageSquare } from 'lucide-react';
import { Contract, ContractPayment } from '../../services/contractService';
import { Button } from '../../components/UI';
import { fmtMoney } from './contractUtils';

interface PaymentModalProps {
  contract: Contract | null;
  onClose: () => void;
  onSave: (contractId: string, updatedPayments: ContractPayment[], updatedPaidAmount: number) => Promise<void>;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({ contract, onClose, onSave }) => {
  const [amount, setAmount] = useState<string>('');
  const [percentage, setPercentage] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [method, setMethod] = useState<'cash' | 'transfer' | 'other'>('transfer');
  const [note, setNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Payments local list state to allow temporary deletions or updates in the modal session
  const [paymentsList, setPaymentsList] = useState<ContractPayment[]>([]);

  const cursorRef = React.useRef<{ element: HTMLInputElement; digitsBeforeCursor: number } | null>(null);

  React.useLayoutEffect(() => {
    if (cursorRef.current) {
      const { element, digitsBeforeCursor } = cursorRef.current;
      if (document.activeElement === element) {
        const value = element.value;
        let newPos = 0;
        let digitCount = 0;
        while (newPos < value.length && digitCount < digitsBeforeCursor) {
          if (/\d/.test(value[newPos])) {
            digitCount++;
          }
          newPos++;
        }
        element.setSelectionRange(newPos, newPos);
      }
      cursorRef.current = null;
    }
  });

  const handleNumericInputChange = React.useCallback((
    e: React.ChangeEvent<HTMLInputElement>,
    onChange: (val: string) => void
  ) => {
    const input = e.target;
    const rawValue = input.value;
    const cleanValue = rawValue.replace(/\D/g, '');
    const formatted = cleanValue ? Number(cleanValue).toLocaleString('vi-VN') : '';

    const selectionStart = input.selectionStart || 0;

    let digitsBeforeCursor = 0;
    for (let i = 0; i < selectionStart; i++) {
      if (/\d/.test(rawValue[i])) {
        digitsBeforeCursor++;
      }
    }

    cursorRef.current = {
      element: input,
      digitsBeforeCursor
    };

    onChange(formatted);
  }, []);

  useEffect(() => {
    if (contract) {
      setAmount('');
      setPercentage('');
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setMethod('transfer');
      setNote('');

      // Build initial list from contract, mapping legacy contracts with paidAmount but empty payments
      if (contract.payments && contract.payments.length > 0) {
        setPaymentsList(contract.payments);
      } else if (contract.paidAmount && contract.paidAmount > 0) {
        setPaymentsList([
          {
            id: 'legacy-payment',
            paymentDate: contract.signedDate || contract.createdAt?.split('T')[0] || new Date().toISOString().split('T')[0],
            amount: contract.paidAmount,
            method: 'transfer',
            note: 'Giao dịch ban đầu (Lịch sử hệ thống)'
          }
        ]);
      } else {
        setPaymentsList([]);
      }
    }
  }, [contract]);

  if (!contract) return null;

  const isLocked = contract.status === 'completed' || contract.status === 'cancelled' || contract.docAccountantStatus === 'confirmed';
  const pTax = contract.postTaxValue || 0;
  // Calculate paid amount from paymentsList (including legacy if mapped)
  const paid = paymentsList.reduce((sum, p) => sum + p.amount, 0);
  const debt = Math.max(0, pTax - paid);
  const isInput = contract.contractType === 'input';
  const numAmount = Number(amount.replace(/\D/g, '')) || 0;

  const handleAmountChange = (val: string) => {
    const raw = val.replace(/\D/g, '');
    const num = Number(raw) || 0;
    
    // Auto-correct if amount exceeds debt
    const finalNum = num > debt ? debt : num;
    
    setAmount(finalNum === 0 ? '' : finalNum.toLocaleString('vi-VN'));
    
    if (pTax > 0) {
      const pct = (finalNum / pTax) * 100;
      setPercentage(pct === 0 ? '' : pct % 1 === 0 ? pct.toString() : pct.toFixed(2));
    }
  };

  const handlePercentageChange = (val: string) => {
    // Allow numbers and one decimal point
    const raw = val.replace(/[^0-9.]/g, '');
    
    // Prevent multiple decimal points
    const parts = raw.split('.');
    let cleanVal = raw;
    if (parts.length > 2) {
      cleanVal = parts[0] + '.' + parts.slice(1).join('');
    }

    let num = Number(cleanVal) || 0;
    
    // Auto-correct if percentage exceeds remaining debt percentage
    const maxPct = pTax > 0 ? (debt / pTax) * 100 : 0;
    if (num > maxPct) num = maxPct;

    setPercentage(cleanVal === '' ? '' : cleanVal);

    if (pTax > 0 && cleanVal !== '') {
      const calculatedAmount = Math.round((num / 100) * pTax);
      setAmount(calculatedAmount === 0 ? '' : calculatedAmount.toLocaleString('vi-VN'));
    } else {
      setAmount('');
    }
  };

  const handleQuickPercent = (pct: number) => {
    const calculatedAmount = Math.round((pct / 100) * pTax);
    
    // Prevent exceeding debt
    const finalAmount = calculatedAmount > debt ? debt : calculatedAmount;
    
    setAmount(finalAmount.toLocaleString('vi-VN'));
    
    if (pTax > 0) {
      const actualPct = (finalAmount / pTax) * 100;
      setPercentage(actualPct % 1 === 0 ? actualPct.toString() : actualPct.toFixed(2));
    }
  };

  const handleQuickFull = () => {
    setAmount(debt.toLocaleString('vi-VN'));
    if (pTax > 0) {
      setPercentage(((debt / pTax) * 100).toFixed(2).replace(/\.00$/, ''));
    }
  };

  const handleDeletePayment = (paymentId: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa giao dịch thanh toán này? Tổng số tiền đã thanh toán sẽ được cập nhật lại.')) return;
    setPaymentsList(prev => prev.filter(p => p.id !== paymentId));
  };

  const handleSubmit = async () => {
    // Assemble new payment if input amount is valid, or simply submit updated payments list if deletions occurred
    let finalPayments = [...paymentsList];
    
    if (numAmount > 0) {
      const newPayment: ContractPayment = {
        id: crypto.randomUUID(),
        paymentDate: paymentDate || new Date().toISOString().split('T')[0],
        amount: numAmount,
        method,
        note: note.trim() || undefined
      };
      finalPayments.push(newPayment);
    }

    const finalPaidAmount = finalPayments.reduce((sum, p) => sum + p.amount, 0);

    setIsSubmitting(true);
    try {
      await onSave(contract.id, finalPayments, finalPaidAmount);
      onClose();
    } catch (error) {
      console.error('Failed to save payments:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const initialPaymentsRepresentation = contract.payments || (contract.paidAmount && contract.paidAmount > 0 ? [{ id: 'legacy-payment', paymentDate: contract.signedDate || contract.createdAt?.split('T')[0] || new Date().toISOString().split('T')[0], amount: contract.paidAmount, method: 'transfer', note: 'Giao dịch ban đầu (Lịch sử hệ thống)' }] : []);
  const hasChanges = numAmount > 0 || JSON.stringify(paymentsList) !== JSON.stringify(initialPaymentsRepresentation);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div 
        className="bg-white rounded-2xl shadow-xl w-full max-w-3xl mx-4 overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-emerald-600 border-b border-emerald-700 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 text-white rounded-lg">
              <Wallet size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{isInput ? 'Thanh toán & Chi phí hợp đồng' : 'Thu tiền & Tiến độ thanh toán'}</h2>
              <p className="text-xs text-emerald-100 font-medium">{contract.contractNumber} - {contract.clientName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-emerald-100 hover:text-white hover:bg-emerald-700 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Left Column: Summary and History (7/12 width) */}
          <div className="md:col-span-7 space-y-5 flex flex-col min-h-0">
            {/* Summary metrics card */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-3 border border-gray-200/60 shadow-sm">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Tóm tắt công nợ</h3>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-white p-2 rounded-lg border border-gray-100 shadow-sm">
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Sau thuế</p>
                  <p className="text-xs font-bold text-gray-800 truncate" title={fmtMoney(pTax)}>{fmtMoney(pTax)}</p>
                </div>
                <div className="bg-white p-2 rounded-lg border border-gray-100 shadow-sm">
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Đã thanh toán</p>
                  <p className="text-xs font-black text-emerald-600 truncate" title={fmtMoney(paid)}>{fmtMoney(paid)}</p>
                </div>
                <div className="bg-rose-50 p-2 rounded-lg border border-rose-100 shadow-sm">
                  <p className="text-[10px] font-bold text-rose-400 uppercase">Còn nợ</p>
                  <p className="text-xs font-black text-rose-600 truncate" title={fmtMoney(debt)}>{fmtMoney(debt)}</p>
                </div>
              </div>
            </div>

            {/* History Section */}
            <div className="flex-1 flex flex-col min-h-0 space-y-2.5">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                  📋 Lịch sử giao dịch ({paymentsList.length})
                </h3>
              </div>
              
              <div className="flex-1 overflow-y-auto border border-gray-200/70 rounded-xl bg-gray-50/30 p-3 space-y-2 min-h-[220px]">
                {paymentsList.map((p) => {
                  const methodText = p.method === 'cash' ? 'Tiền mặt' : p.method === 'transfer' ? 'Chuyển khoản' : 'Khác';
                  const methodColor = p.method === 'cash' ? 'bg-amber-100 text-amber-700 border-amber-200' : p.method === 'transfer' ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-gray-100 text-gray-700 border-gray-200';
                  
                  return (
                    <div 
                      key={p.id} 
                      className="bg-white p-3 rounded-lg border border-gray-200/70 hover:border-emerald-300 shadow-sm transition-all group flex items-start gap-3 relative"
                    >
                      <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg flex-shrink-0 mt-0.5">
                        {p.method === 'cash' ? <Coins size={16} /> : <CreditCard size={16} />}
                      </div>
                      
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex justify-between items-start gap-2">
                          <p className="text-xs font-black text-gray-800">{fmtMoney(p.amount)}</p>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${methodColor}`}>
                            {methodText}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-gray-500">
                          <Calendar size={10} />
                          <span>{p.paymentDate ? new Date(p.paymentDate).toLocaleDateString('vi-VN') : '-'}</span>
                        </div>
                        {p.note && (
                          <div className="flex items-start gap-1 p-1.5 bg-gray-50 text-gray-600 rounded text-[11px] font-medium leading-normal border border-gray-100">
                            <MessageSquare size={10} className="mt-0.5 text-gray-400 flex-shrink-0" />
                            <span className="break-words flex-1">{p.note}</span>
                          </div>
                        )}
                      </div>

                      {!isLocked && (
                        <button 
                          onClick={() => handleDeletePayment(p.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all absolute right-2 bottom-2 md:opacity-0 md:group-hover:opacity-100"
                          title="Xóa giao dịch này"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  );
                })}

                {paymentsList.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 text-gray-400">
                    <Wallet size={32} className="opacity-20 mb-2" />
                    <p className="text-xs italic">Chưa ghi nhận giao dịch thanh toán nào cho hợp đồng này</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: New Payment Form (5/12 width) */}
          <div className="md:col-span-5 space-y-4 border-t md:border-t-0 md:border-l border-gray-200 pt-5 md:pt-0 md:pl-5 flex flex-col justify-between">
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                ➕ Ghi nhận thanh toán mới
              </h3>

              {isLocked && (
                <div className="flex items-start gap-2.5 p-3 bg-amber-50 text-amber-800 rounded-xl border border-amber-200/70 shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
                  <AlertCircle size={16} className="mt-0.5 flex-shrink-0 text-amber-600 animate-pulse" />
                  <div className="space-y-1">
                    <p className="text-[11px] font-extrabold uppercase tracking-wider text-amber-700">Hợp đồng đã khóa</p>
                    <p className="text-[10px] font-medium leading-relaxed">
                      Hợp đồng đã hoàn thành, bị hủy hoặc đã được kế toán xác nhận. Không thể thêm mới hoặc sửa đổi lịch sử thanh toán.
                    </p>
                  </div>
                </div>
              )}

              {/* Amount and percentage fields */}
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 mb-1 uppercase tracking-wider">Số tiền (VNĐ)</label>
                  <input 
                    type="text" 
                    value={amount} 
                    onChange={e => handleNumericInputChange(e, val => handleAmountChange(val))}
                    placeholder="Nhập số tiền..."
                    disabled={isLocked}
                    className="w-full px-3.5 py-2 text-sm font-bold text-gray-900 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white shadow-sm disabled:bg-gray-100/70 disabled:text-gray-400 disabled:cursor-not-allowed"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 mb-1 uppercase tracking-wider flex items-center gap-1">
                      <TrendingUp size={11} className="text-emerald-500" /> Tỷ lệ (%)
                    </label>
                    <div className="relative">
                      <input 
                        type="text" 
                        value={percentage} 
                        onChange={e => handlePercentageChange(e.target.value)}
                        placeholder="VD: 30"
                        disabled={isLocked}
                        className="w-full pl-3 pr-6 py-2 text-sm font-bold text-emerald-700 border border-emerald-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-emerald-50/20 disabled:bg-gray-100/70 disabled:text-gray-400 disabled:border-gray-200 disabled:cursor-not-allowed"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">%</span>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 mb-1 uppercase tracking-wider">Ngày thanh toán</label>
                    <input 
                      type="date" 
                      value={paymentDate} 
                      onChange={e => setPaymentDate(e.target.value)}
                      disabled={isLocked}
                      className="w-full px-3 py-2 text-sm text-gray-700 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white shadow-sm disabled:bg-gray-100/70 disabled:text-gray-400 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              {/* Quick Percentage Buttons */}
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">{isInput ? 'Tỷ lệ chi nhanh' : 'Tỷ lệ thu nhanh'}</p>
                <div className="grid grid-cols-4 gap-1">
                  <button onClick={() => handleQuickPercent(30)} disabled={isLocked} className="px-1.5 py-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-100 shadow-sm text-center font-bold disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400 disabled:border-gray-100">30%</button>
                  <button onClick={() => handleQuickPercent(50)} disabled={isLocked} className="px-1.5 py-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-100 shadow-sm text-center font-bold disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400 disabled:border-gray-100">50%</button>
                  <button onClick={() => handleQuickPercent(70)} disabled={isLocked} className="px-1.5 py-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-100 shadow-sm text-center font-bold disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400 disabled:border-gray-100">70%</button>
                  <button onClick={handleQuickFull} disabled={isLocked} className="px-1.5 py-1 text-[10px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors border border-rose-100 shadow-sm text-center col-span-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400 disabled:border-gray-100">Hết nợ</button>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div>
                <label className="block text-[11px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Phương thức thanh toán</label>
                <div className="flex gap-2">
                  <button 
                    type="button"
                    onClick={() => setMethod('transfer')}
                    disabled={isLocked}
                    className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold border transition-all text-center flex items-center justify-center gap-1 disabled:cursor-not-allowed ${method === 'transfer' ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-200 disabled:bg-blue-600/60 disabled:shadow-none' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 disabled:bg-gray-50 disabled:text-gray-400'}`}
                  >
                    <CreditCard size={12} /> Chuyển khoản
                  </button>
                  <button 
                    type="button"
                    onClick={() => setMethod('cash')}
                    disabled={isLocked}
                    className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold border transition-all text-center flex items-center justify-center gap-1 disabled:cursor-not-allowed ${method === 'cash' ? 'bg-amber-600 text-white border-amber-600 shadow-md shadow-amber-200 disabled:bg-amber-600/60 disabled:shadow-none' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 disabled:bg-gray-50 disabled:text-gray-400'}`}
                  >
                    <Coins size={12} /> Tiền mặt
                  </button>
                  <button 
                    type="button"
                    onClick={() => setMethod('other')}
                    disabled={isLocked}
                    className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold border transition-all text-center flex items-center justify-center gap-1 disabled:cursor-not-allowed ${method === 'other' ? 'bg-gray-600 text-white border-gray-600 shadow-md shadow-gray-200 disabled:bg-gray-600/60 disabled:shadow-none' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 disabled:bg-gray-50 disabled:text-gray-400'}`}
                  >
                    Khác
                  </button>
                </div>
              </div>

              {/* Note */}
              <div>
                <label className="block text-[11px] font-bold text-gray-500 mb-1 uppercase tracking-wider">Ghi chú giao dịch</label>
                <textarea 
                  value={note} 
                  onChange={e => setNote(e.target.value)}
                  placeholder="VD: Đợt thanh toán 1..."
                  rows={2}
                  disabled={isLocked}
                  className="w-full px-3 py-2 text-xs text-gray-700 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white shadow-sm disabled:bg-gray-100/70 disabled:text-gray-400 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            {/* Warning Message or info box */}
            <div className="pt-2">
              {numAmount > 0 && (
                <div className="flex items-start gap-2 p-2.5 bg-blue-50 text-blue-700 rounded-xl border border-blue-100">
                  <AlertCircle size={14} className="mt-0.5 flex-shrink-0 text-blue-500" />
                  <p className="text-[10px] font-medium leading-relaxed">
                    Bạn chuẩn bị {isInput ? 'chi' : 'thu'} thêm <strong>{fmtMoney(numAmount)}</strong>. Công nợ còn lại sau thanh toán sẽ là <strong>{fmtMoney(Math.max(0, debt - numAmount))}</strong>.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3 flex-shrink-0">
          <button 
            onClick={onClose} 
            disabled={isSubmitting} 
            className="px-5 py-2.5 text-sm font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors"
          >
            {isLocked ? 'Đóng' : 'Hủy'}
          </button>
          
          {!isLocked && (
            <button 
              onClick={handleSubmit} 
              disabled={isSubmitting || !hasChanges} 
              className="px-6 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl hover:shadow-lg hover:shadow-emerald-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Đang lưu...</>
              ) : (
                <>
                  <Save size={16} /> Lưu thay đổi
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
