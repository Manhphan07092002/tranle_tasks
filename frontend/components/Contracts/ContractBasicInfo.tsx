import React from 'react';

interface ContractBasicInfoProps {
  form: any;
  setForm: React.Dispatch<React.SetStateAction<any>>;
  contracts: any[];
  clients: { name: string }[];
  projects: any[];
  canApproveThisContract: boolean;
  isInput: boolean;
  isFormLocked: boolean;
}

export function ContractBasicInfo({
  form,
  setForm,
  contracts,
  clients,
  projects,
  canApproveThisContract,
  isInput,
  isFormLocked,
}: ContractBasicInfoProps) {
  return (
    <fieldset disabled={isFormLocked} className="group-disabled">
      <div className="p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wider">Số hợp đồng *</label>
            <input
              list="contract-number-suggestions"
              value={form.contractNumber}
              onChange={e => setForm((f: any) => ({ ...f, contractNumber: e.target.value }))}
              placeholder="VD: HD 02-2026/TL-SOLAR"
              className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50"
            />
            <datalist id="contract-number-suggestions">
              {Array.from(new Set(contracts.map(c => c.contractNumber?.trim()).filter(Boolean))).sort().map(num => (
                <option key={num} value={num} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wider">{isInput ? 'Nhà cung cấp *' : 'Khách hàng / Chủ đầu tư *'}</label>
            <input
              list="client-suggestions"
              value={isInput ? form.supplierName : form.clientName}
              onChange={e => isInput ? setForm((f: any) => ({ ...f, supplierName: e.target.value, clientName: e.target.value })) : setForm((f: any) => ({ ...f, clientName: e.target.value }))}
              placeholder={isInput ? 'VD: Công ty TNHH AIKO Solar' : 'VD: Công ty TNHH Cocotex'}
              className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50"
            />
            <datalist id="client-suggestions">
              {Array.from(new Set([
                ...clients.map(c => c.name),
                ...contracts.map(c => c.clientName?.trim()),
                ...contracts.filter(c => c.supplierName).map(c => c.supplierName!.trim())
              ].filter(Boolean))).sort().map(client => (
                <option key={client} value={client} />
              ))}
            </datalist>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wider">Tên hợp đồng / Mô tả chung *</label>
            <input
              list="contract-name-suggestions"
              value={form.contractName}
              onChange={e => setForm((f: any) => ({ ...f, contractName: e.target.value }))}
              placeholder="VD: Cung cấp và lắp đặt hệ thống điện mặt trời 100kWp"
              className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50"
            />
            <datalist id="contract-name-suggestions">
              {Array.from(new Set(contracts.map(c => c.contractName?.trim()).filter(Boolean))).sort().map(name => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wider">Thuộc Dự án (Tùy chọn)</label>
            <select value={form.projectId || ''} onChange={e => setForm((f: any) => ({ ...f, projectId: e.target.value }))}
              className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white">
              <option value="">-- Không thuộc dự án nào --</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.projectCode} - {p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wider">Trạng thái *</label>
            <select value={form.status} onChange={e => setForm((f: any) => ({ ...f, status: e.target.value }))}
              className="w-full px-4 py-2.5 text-sm font-bold text-gray-700 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white">
              <option value="draft">Bản nháp</option>
              <option value="pending">Chờ duyệt</option>
              {(canApproveThisContract || form.status === 'in_progress') && <option value="in_progress">Đang thực hiện</option>}
              {(canApproveThisContract || form.status === 'completed') && <option value="completed">Đã hoàn thành</option>}
              {(canApproveThisContract || form.status === 'cancelled') && <option value="cancelled">Đã hủy</option>}
            </select>
          </div>
        </div>
      </div>
      </fieldset>
  );
}