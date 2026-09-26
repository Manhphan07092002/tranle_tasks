import React from 'react';
import { Printer } from 'lucide-react';

interface ContractHeaderProps {
  form: any;
  isFormLocked: boolean;
  editingContract: any;
  handlePrint: () => void;
  isInput: boolean;
}

export function ContractHeader({
  form,
  isFormLocked,
  editingContract,
  handlePrint,
  isInput,
}: ContractHeaderProps) {
  return (
    <div className={`flex items-center justify-between px-6 py-4 text-white bg-gradient-to-r ${
      isInput
        ? 'from-blue-500 to-indigo-600'
        : 'from-emerald-500 to-teal-600'
    }`}>
      <h2 className="text-lg font-bold">
        {isFormLocked
          ? (isInput ? 'Chi tiết Hợp đồng Mua' : 'Chi tiết Hợp đồng Bán')
          : editingContract
          ? (isInput ? 'Sửa Hợp đồng Mua' : 'Sửa Hợp đồng Bán')
          : (isInput ? 'Thêm hợp đồng Mua mới' : 'Thêm hợp đồng Bán mới')}
      </h2>
      <div className="flex gap-2">
        {!isInput && (
          <button onClick={handlePrint} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg font-medium transition-colors text-sm">
            <Printer size={16} /> In báo giá
          </button>
        )}
      </div>
    </div>
  );
}