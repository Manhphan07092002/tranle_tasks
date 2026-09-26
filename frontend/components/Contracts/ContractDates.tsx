import React from 'react';

interface ContractDatesProps {
  form: any;
  setForm: React.Dispatch<React.SetStateAction<any>>;
  isInput: boolean;
  isFormLocked: boolean;
}

export function ContractDates({
  form,
  setForm,
  isInput,
  isFormLocked,
}: ContractDatesProps) {
  return (
    <fieldset disabled={isFormLocked} className="group-disabled">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
        <div>
          <label className="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wider">Ngày ký HĐ</label>
          <input
            type="date"
            value={form.signedDate || ''}
            onChange={e => setForm((f: any) => ({ ...f, signedDate: e.target.value }))}
            className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50 text-gray-700"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wider">Ngày bắt đầu hiệu lực</label>
          <input
            type="date"
            value={form.startDate || ''}
            onChange={e => setForm((f: any) => ({ ...f, startDate: e.target.value }))}
            className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50 text-gray-700"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wider">Ngày kết thúc</label>
          <input
            type="date"
            value={form.endDate || ''}
            onChange={e => setForm((f: any) => ({ ...f, endDate: e.target.value }))}
            className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50 text-gray-700"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wider">Thời hạn bảo hành</label>
          <div className="relative">
            <input
              type="number"
              min="0"
              value={form.warrantyMonths ?? ''}
              onChange={e => {
                const val = e.target.value;
                setForm((f: any) => ({ ...f, warrantyMonths: val === '' ? undefined : Number(val) }));
              }}
            placeholder="VD: 12"
            className="w-full pl-4 pr-12 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50 text-gray-700 font-bold"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-bold">tháng</span>
        </div>
        </div>
      </div>
    </fieldset>
  );
}