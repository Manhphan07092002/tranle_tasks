import React, { useState } from 'react';
import { PieChart, X, AlertTriangle, AlertOctagon, Info, Download, ShieldAlert, ArrowUpRight, Send } from 'lucide-react';
import { Button } from '../UI';

interface ArAgingDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ArAgingDetailModal: React.FC<ArAgingDetailModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

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
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-400 border border-amber-400/30">
                  Update: Live
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
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-emerald-50 dark:bg-emerald-950/30 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800">
              <div className="text-emerald-700 dark:text-emerald-400 text-xs font-bold mb-1">Trong Hạn (0-30 Ngày)</div>
              <div className="text-xl font-black text-emerald-900 dark:text-emerald-300">12.5 Tỷ ₫</div>
              <div className="text-[10px] text-emerald-600 mt-1">4 Hóa đơn an toàn</div>
            </div>
            <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-2xl border border-blue-200 dark:border-blue-800">
              <div className="text-blue-700 dark:text-blue-400 text-xs font-bold mb-1">Quá Hạn (31-60 Ngày)</div>
              <div className="text-xl font-black text-blue-900 dark:text-blue-300">3.2 Tỷ ₫</div>
              <div className="text-[10px] text-blue-600 mt-1">2 Hóa đơn nhắc nhở</div>
            </div>
            <div className="bg-amber-50 dark:bg-amber-950/30 p-4 rounded-2xl border border-amber-200 dark:border-amber-800">
              <div className="text-amber-700 dark:text-amber-400 text-xs font-bold mb-1">Quá Hạn (61-90 Ngày)</div>
              <div className="text-xl font-black text-amber-900 dark:text-amber-300">850 Tr ₫</div>
              <div className="text-[10px] text-amber-600 mt-1">1 Hóa đơn trễ hạn</div>
            </div>
            <div className="bg-red-50 dark:bg-red-950/30 p-4 rounded-2xl border border-red-200 dark:border-red-800 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-2">
                <AlertOctagon size={24} className="text-red-500/20" />
              </div>
              <div className="text-red-700 dark:text-red-400 text-xs font-bold mb-1">Nợ Xấu (&gt;90 Ngày)</div>
              <div className="text-xl font-black text-red-900 dark:text-red-300">0 ₫</div>
              <div className="text-[10px] text-red-600 mt-1">Tín dụng rủi ro cao</div>
            </div>
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
                  <tr className="hover:bg-gray-50 dark:hover:bg-slate-800/50">
                    <td className="px-4 py-3">
                      <div className="text-gray-900 dark:text-white font-bold">CTY May Việt Tiến</div>
                      <div className="text-gray-500 text-[10px]">P-EPC-1049 • HĐ.2026.03</div>
                    </td>
                    <td className="px-4 py-3 text-right font-black text-gray-900 dark:text-white">4.500.000.000 ₫</td>
                    <td className="px-4 py-3 text-center text-emerald-600 font-bold">100%</td>
                    <td className="px-4 py-3 text-center text-gray-400">-</td>
                    <td className="px-4 py-3 text-center text-gray-400">-</td>
                    <td className="px-4 py-3 text-center">
                      <span className="px-2 py-1 rounded bg-emerald-100 text-emerald-700 font-bold text-[10px]">An Toàn</span>
                    </td>
                  </tr>
                  <tr className="hover:bg-gray-50 dark:hover:bg-slate-800/50">
                    <td className="px-4 py-3">
                      <div className="text-gray-900 dark:text-white font-bold">KCN Long Đức (1.2MWp)</div>
                      <div className="text-gray-500 text-[10px]">P-EPC-1050 • HĐ.2025.11</div>
                    </td>
                    <td className="px-4 py-3 text-right font-black text-gray-900 dark:text-white">8.000.000.000 ₫</td>
                    <td className="px-4 py-3 text-center text-emerald-600 font-bold">8.0 Tỷ</td>
                    <td className="px-4 py-3 text-center text-gray-400">-</td>
                    <td className="px-4 py-3 text-center text-gray-400">-</td>
                    <td className="px-4 py-3 text-center">
                      <span className="px-2 py-1 rounded bg-emerald-100 text-emerald-700 font-bold text-[10px]">An Toàn</span>
                    </td>
                  </tr>
                  <tr className="bg-amber-50/50 dark:bg-amber-900/10 hover:bg-amber-50 dark:hover:bg-amber-900/20">
                    <td className="px-4 py-3">
                      <div className="text-gray-900 dark:text-white font-bold flex items-center gap-1.5">
                        <AlertTriangle size={12} className="text-amber-500" />
                        TH Farm (Đắk Lắk)
                      </div>
                      <div className="text-gray-500 text-[10px]">P-EPC-0899 • Đợt quyết toán</div>
                    </td>
                    <td className="px-4 py-3 text-right font-black text-gray-900 dark:text-white">4.050.000.000 ₫</td>
                    <td className="px-4 py-3 text-center text-gray-400">-</td>
                    <td className="px-4 py-3 text-center text-blue-600 font-bold">3.2 Tỷ</td>
                    <td className="px-4 py-3 text-center text-amber-600 font-bold">850 Tr</td>
                    <td className="px-4 py-3 text-center">
                      <button className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2 py-1 rounded flex items-center gap-1 justify-center mx-auto">
                        <Send size={10} /> Gửi Thư Nhắc
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Action Recommendations */}
          <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 flex gap-3">
            <Info size={20} className="text-indigo-500 flex-shrink-0" />
            <div>
              <div className="text-sm font-bold text-gray-900 dark:text-white mb-1">Khuyến nghị rủi ro tín dụng</div>
              <p className="text-xs text-gray-600 dark:text-slate-400">
                Hợp đồng TH Farm đang có dấu hiệu trễ hạn thanh toán đợt quyết toán. Hệ thống đề xuất gửi Thư Nhắc Nợ Lần 1 và xem xét tạm ngưng quyền truy cập giám sát SCADA nếu quá hạn trên 90 ngày.
              </p>
            </div>
          </div>
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
