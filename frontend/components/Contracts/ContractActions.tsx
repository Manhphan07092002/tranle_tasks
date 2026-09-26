import React from 'react';
import { Save, X, Printer } from 'lucide-react';

interface ContractActionsProps {
  form: any;
  isInput: boolean;
  isFormLocked: boolean;
  editingContract: any;
  saving: boolean;
  handleSave: () => void;
  handlePrint: () => void;
  setActiveTab: (tab: any) => void;
  btnColor: string;
  showToast?: (type: 'success' | 'error' | 'info', message: string) => void;
}

export function ContractActions({
  form,
  isInput,
  isFormLocked,
  editingContract,
  saving,
  handleSave,
  handlePrint,
  setActiveTab,
  btnColor,
  showToast,
}: ContractActionsProps) {
  if (isFormLocked) return null;

  return (
    <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-100 bg-gray-50/50 px-6 py-4">
      {!isInput && (
        <button onClick={handlePrint} className="flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 font-medium transition-colors text-sm">
          <Printer size={16} /> In báo giá
        </button>
      )}
      <button
        onClick={() => setActiveTab(form.contractType === 'input' ? 'input' : 'output')}
        className="flex-1 sm:flex-none px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
      >
        <X size={16} /> Hủy
      </button>
      <button
        onClick={handleSave}
        disabled={saving || !form.contractNumber.trim() || !form.clientName.trim()}
        className={`flex-1 sm:flex-none px-5 py-2.5 ${btnColor} text-white font-black rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        <Save size={16} /> {saving ? 'Đang lưu...' : editingContract ? 'Cập nhật' : 'Tạo mới'}
      </button>
    </div>
  );
}