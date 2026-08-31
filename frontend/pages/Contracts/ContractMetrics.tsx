import React, { useMemo } from 'react';
import { Briefcase, DollarSign, TrendingUp, TrendingDown, WalletCards, AlertCircle } from 'lucide-react';
import { Contract } from '../../services/contractService';
import { fmtMoney, fmtMoneyShort } from './contractUtils';

interface ContractMetricsProps {
  filtered: Contract[];
  contracts: Contract[];
  activeTab: string;
  totalPreTax: number;
  totalPostTax: number;
  totalPaid: number;
  totalDebt: number;
  collectionRate: number;
  isInput?: boolean;
}

export const ContractMetrics: React.FC<ContractMetricsProps> = ({
  filtered, contracts, activeTab, totalPreTax, totalPostTax, totalPaid, totalDebt, collectionRate, isInput
}) => {
  const profitData = useMemo(() => {
    const outputContracts = contracts.filter(c => (c.contractType || 'output') === 'output');
    const inputContracts = contracts.filter(c => c.contractType === 'input');
    const revenue = outputContracts.reduce((s, c) => s + (c.preTaxValue || 0), 0);
    const expense = inputContracts.reduce((s, c) => s + (c.preTaxValue || 0), 0);
    const profit = revenue - expense;
    const margin = revenue > 0 ? Math.round((profit / revenue) * 100) : 0;
    return { revenue, expense, profit, margin, hasData: outputContracts.length > 0 };
  }, [contracts]);

  // Smart format: use short format for large numbers, full format for tooltips
  const smartFmt = (v: number) => v >= 1e6 ? fmtMoneyShort(v) : fmtMoney(v);

  const statusCounts = useMemo(() => ({
    draft: filtered.filter(c => c.status === 'draft').length,
    pending: filtered.filter(c => c.status === 'pending').length,
    in_progress: filtered.filter(c => c.status === 'in_progress').length,
    completed: filtered.filter(c => c.status === 'completed').length,
  }), [filtered]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {/* Card 1: Tổng HĐ */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
        <div className="absolute top-0 right-0 -mr-4 -mt-4 w-24 h-24 rounded-full bg-blue-50/50 group-hover:bg-blue-100/50 transition-colors z-0"></div>
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Số lượng HĐ</p>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl"><Briefcase size={20} /></div>
          </div>
          <p className="text-3xl font-black text-gray-900">{filtered.length}</p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {statusCounts.draft > 0 && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-gray-100 text-gray-600">{statusCounts.draft} nháp</span>}
            {statusCounts.pending > 0 && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-700">{statusCounts.pending} chờ</span>}
            {statusCounts.in_progress > 0 && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 text-blue-700">{statusCounts.in_progress} đang</span>}
            {statusCounts.completed > 0 && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-700">{statusCounts.completed} xong</span>}
          </div>
        </div>
      </div>

      {/* Card 2: Doanh thu / Chi phí */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
        <div className={`absolute top-0 right-0 -mr-4 -mt-4 w-24 h-24 rounded-full ${isInput ? 'bg-rose-50/50 group-hover:bg-rose-100/50' : 'bg-emerald-50/50 group-hover:bg-emerald-100/50'} transition-colors z-0`}></div>
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">{isInput ? 'Tổng Chi phí' : 'Tổng Doanh thu'}</p>
            <div className={`p-2 rounded-xl ${isInput ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}><DollarSign size={20} /></div>
          </div>
          <p className={`text-2xl font-black truncate ${isInput ? 'text-rose-600' : 'text-emerald-600'}`} title={fmtMoney(totalPreTax)}>{smartFmt(totalPreTax)}</p>
          <p className="text-xs text-gray-400 mt-2">Tổng giá trị trước thuế</p>
        </div>
      </div>

      {/* Card 3: Thực thu */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
        <div className="absolute top-0 right-0 -mr-4 -mt-4 w-24 h-24 rounded-full bg-indigo-50/50 group-hover:bg-indigo-100/50 transition-colors z-0"></div>
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">{isInput ? 'Đã chi' : 'Đã thanh toán'}</p>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><WalletCards size={20} /></div>
          </div>
          <p className="text-2xl font-black text-indigo-600 truncate" title={fmtMoney(totalPaid)}>{smartFmt(totalPaid)}</p>
          <div className="mt-3 flex items-center gap-2">
            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-500 ${collectionRate >= 80 ? 'bg-emerald-500' : collectionRate >= 50 ? 'bg-indigo-500' : 'bg-amber-500'}`} style={{ width: `${collectionRate}%` }}></div>
            </div>
            <span className="text-xs font-bold text-gray-500">{collectionRate}%</span>
          </div>
        </div>
      </div>

      {/* Card 4: Công nợ */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
        <div className="absolute top-0 right-0 -mr-4 -mt-4 w-24 h-24 rounded-full bg-rose-50/50 group-hover:bg-rose-100/50 transition-colors z-0"></div>
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">{isInput ? 'Còn phải trả' : 'Còn phải thu'}</p>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl"><AlertCircle size={20} /></div>
          </div>
          <p className="text-2xl font-black text-rose-600 truncate" title={fmtMoney(totalDebt)}>{smartFmt(totalDebt)}</p>
          <p className="text-xs text-gray-400 mt-2 font-medium">{isInput ? 'Còn phải trả NCC' : 'Còn phải thu từ KH'}</p>
        </div>
      </div>

      {/* Card 5: Lợi nhuận */}
      {activeTab !== 'debts' && profitData.hasData && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className={`absolute top-0 right-0 -mr-4 -mt-4 w-24 h-24 rounded-full ${profitData.profit >= 0 ? 'bg-emerald-50/50' : 'bg-red-50/50'} transition-colors z-0`}></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Lợi nhuận ước tính</p>
              <div className={`p-2 rounded-xl ${profitData.profit >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                {profitData.profit >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
              </div>
            </div>
            <p className={`text-2xl font-black truncate ${profitData.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`} title={fmtMoney(profitData.profit)}>{smartFmt(profitData.profit)}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${profitData.margin >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                {profitData.margin}% margin
              </span>
              <span className="text-[10px] text-gray-400">Trước thuế: DT - CP</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
