import React, { useMemo } from 'react';
import { PieChart, X, AlertTriangle, Info, Download, Send } from 'lucide-react';
import { Button } from '../UI';
import {
  ageArRecords, sumBucket, countBucket, fmtMoney,
  type AgedArRow, type ArBucket,
} from './arAging';

interface ArAgingDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Bản ghi finance_ar từ MySQL (amount, dueDate, customer, project, status). */
  arRecords?: any[];
}

export const ArAgingDetailModal: React.FC<ArAgingDetailModalProps> = ({ isOpen, onClose, arRecords = [] }) => {
  const rows = useMemo<AgedArRow[]>(
    () => ageArRecords(arRecords, new Date().toISOString().slice(0, 10)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(arRecords)],
  );
  const worst = rows.find((r) => r.bucket === 'b61_90' || r.bucket === 'bad') || null;

  if (!isOpen) return null;

  const cards: Array<{ label: string; value: string; sub: string; wrap: string; text: string }> = [
    { label: 'Trong Hạn (0-30 Ngày)', value: fmtMoney(sumBucket(rows, 'current')), sub: `${countBucket(rows, 'current')} khoản phải thu`, wrap: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800', text: 'text-emerald-900 dark:text-emerald-300' },
    { label: 'Quá Hạn (31-60 Ngày)', value: fmtMoney(sumBucket(rows, 'b31_60')), sub: `${countBucket(rows, 'b31_60')} khoản nhắc nhở`, wrap: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800', text: 'text-blue-900 dark:text-blue-300' },
    { label: 'Quá Hạn (61-90 Ngày)', value: fmtMoney(sumBucket(rows, 'b61_90')), sub: `${countBucket(rows, 'b61_90')} khoản trễ hạn`, wrap: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800', text: 'text-amber-900 dark:text-amber-300' },
    { label: 'Nợ Xấu (>90 Ngày)', value: fmtMoney(sumBucket(rows, 'bad')), sub: 'Tín dụng rủi ro cao', wrap: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800', text: 'text-red-900 dark:text-red-300' },
  ];

  const bucketCell = (r: AgedArRow, b: ArBucket) => {
    if (r.bucket !== b) return <span className="text-gray-400">-</span>;
    return <span className="font-bold">{fmtMoney(r.amount)}</span>;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-3xl shadow-2xl border border-gray-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-gray-900 to-black text-white p-6 flex items-center justify-between border-b border-gray-800">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white">
              <PieChart size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black tracking-tight text-white">Sổ Theo Dõi Tuổi Nợ (AR Aging Dashboard)</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-400/30">
                  Live: {rows.length} khoản
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Phân tích dư nợ phải thu khách hàng & xếp hạng rủi ro thanh toán hợp đồng EPC.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">

          {/* AR Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {cards.map((c) => (
              <div key={c.label} className={`p-4 rounded-2xl border ${c.wrap}`}>
                <div className="text-xs font-bold mb-1">{c.label}</div>
                <div className={`text-xl font-black ${c.text}`}>{c.value}</div>
                <div className="text-[10px] mt-1">{c.sub}</div>
              </div>
            ))}
          </div>

          {/* Aging Matrix Table */}
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              Chi Tiết Tuổi Nợ Theo Hợp Đồng
            </h3>
            <div className="border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 font-bold">
                  <tr>
                    <th className="px-4 py-3">Khách Hàng / Hợp Đồng</th>
                    <th className="px-4 py-3 text-right">Tổng Dư Nợ</th>
                    <th className="px-4 py-3 text-center">0-30 Ngày</th>
                    <th className="px-4 py-3 text-center">31-60 Ngày</th>
                    <th className="px-4 py-3 text-center">&gt;60 Ngày</th>
                    <th className="px-4 py-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-slate-700 font-medium">
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-gray-400">Không có khoản phải thu nào.</td>
                    </tr>
                  )}
                  {rows.map((r) => (
                    <tr key={r.id} className={`hover:bg-gray-50 dark:hover:bg-slate-800/50 ${r.bucket === 'bad' || r.bucket === 'b61_90' ? 'bg-amber-50/50 dark:bg-amber-900/10' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="text-gray-900 dark:text-white font-bold flex items-center gap-1.5">
                          {(r.bucket === 'bad' || r.bucket === 'b61_90') && <AlertTriangle size={12} className="text-amber-500" />}
                          {r.customer}
                        </div>
                        <div className="text-gray-500 text-[10px]">{r.ref}{r.age !== null ? ` • quá ${r.age} ngày` : ''}</div>
                      </td>
                      <td className="px-4 py-3 text-right font-black text-gray-900 dark:text-white">{fmtMoney(r.amount)}</td>
                      <td className="px-4 py-3 text-center text-emerald-600 font-bold">{bucketCell(r, 'current')}</td>
                      <td className="px-4 py-3 text-center text-blue-600 font-bold">{bucketCell(r, 'b31_60')}</td>
                      <td className="px-4 py-3 text-center text-amber-600 font-bold">{r.bucket === 'b61_90' || r.bucket === 'bad' ? fmtMoney(r.amount) : '-'}</td>
                      <td className="px-4 py-3 text-center">
                        {r.bucket === 'current' ? (
                          <span className="px-2 py-1 rounded bg-emerald-100 text-emerald-700 font-bold text-[10px]">An Toàn</span>
                        ) : (
                          <button className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2 py-1 rounded items-center gap-1 justify-center mx-auto">
                            <Send size={10} /> Gửi Thư Nhắc
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Action Recommendations */}
          {worst && (
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 flex gap-3">
              <Info size={20} className="text-indigo-500 flex-shrink-0" />
              <div>
                <div className="text-sm font-bold text-gray-900 dark:text-white mb-1">Khuyến nghị rủi ro tín dụng</div>
                <p className="text-xs text-gray-600 dark:text-slate-400">
                  {worst.customer}{worst.ref ? ` (${worst.ref})` : ''} có dư nợ {fmtMoney(worst.amount)}
                  {worst.age !== null ? ` quá hạn ${worst.age} ngày` : ''}. Đề xuất gửi Thư Nhắc Nợ và rà soát điều khoản thanh toán.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-900 flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose} className="text-xs">Đóng</Button>
          <Button className="bg-slate-900 hover:bg-black text-white font-bold text-xs flex items-center gap-1.5">
            <Download size={14} /> Xuất Báo Cáo AR PDF
          </Button>
        </div>
      </div>
    </div>
  );
};
