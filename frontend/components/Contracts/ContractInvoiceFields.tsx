import React from 'react';

interface ContractInvoiceFieldsProps {
  form: any;
  setForm: React.Dispatch<React.SetStateAction<any>>;
  isInput: boolean;
  isFormLocked: boolean;
}

export function ContractInvoiceFields({
  form,
  setForm,
  isInput,
  isFormLocked,
}: ContractInvoiceFieldsProps) {
  if (!isInput) return null;

  return (
    <fieldset disabled={isFormLocked} className="group-disabled">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 p-4 bg-blue-50/40 border border-blue-100 rounded-2xl mb-2">
        <div>
          <label className="block text-xs font-bold text-blue-700 mb-1 uppercase tracking-wider">Số hóa đơn mua (Tùy chọn)</label>
          <input
            value={form.invoiceNumber || ''}
            onChange={e => setForm((f: any) => ({ ...f, invoiceNumber: e.target.value }))}
            placeholder="VD: 0001234"
            className="w-full px-4 py-2.5 text-sm border border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-medium text-gray-700"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-blue-700 mb-1 uppercase tracking-wider">Ngày hóa đơn mua (Tùy chọn)</label>
          <input
            type="date"
            value={form.invoiceDate || ''}
            onChange={e => setForm((f: any) => ({ ...f, invoiceDate: e.target.value }))}
            className="w-full px-4 py-2.5 text-sm border border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-medium text-gray-700"
          />
        </div>
      </div>
    </fieldset>
  );
}