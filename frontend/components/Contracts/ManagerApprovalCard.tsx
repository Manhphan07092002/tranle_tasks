import React from 'react';
import { User, FileText, AlertTriangle, XCircle, CheckCircle2 } from 'lucide-react';

interface ManagerApprovalCardProps {
  form: any;
  canApproveThisContract: boolean;
  users: any[];
  actionLoading: boolean;
  showRejectReason: boolean;
  setShowRejectReason: (v: boolean) => void;
  rejectReason: string;
  setRejectReason: (v: string) => void;
  showCancelReason: boolean;
  setShowCancelReason: (v: boolean) => void;
  cancelReason: string;
  setCancelReason: (v: string) => void;
  handleApprove: () => void;
  handleReject: () => void;
  handleCancelPending: () => void;
  isInput: boolean;
}

export function ManagerApprovalCard({
  form,
  canApproveThisContract,
  users,
  actionLoading,
  showRejectReason,
  setShowRejectReason,
  rejectReason,
  setRejectReason,
  showCancelReason,
  setShowCancelReason,
  cancelReason,
  setCancelReason,
  handleApprove,
  handleReject,
  handleCancelPending,
  isInput,
}: ManagerApprovalCardProps) {
  if (!canApproveThisContract || form.status !== 'pending') return null;

  const creatorName = users?.find(u => u.id === form.createdBy)?.name || 'Nhân viên';

  return (
    <div className="bg-gradient-to-r from-slate-50 to-emerald-50/30 border-b border-emerald-100 px-6 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in slide-in-from-top duration-300">
      <div className="flex items-start gap-3">
        <span className="flex-shrink-0 w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 text-lg font-bold">📋</span>
        <div>
          <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider">Yêu cầu xét duyệt Hợp đồng</h4>
          <p className="text-xs text-slate-500 mt-0.5">Số HĐ: <span className="font-bold text-emerald-600">{form.contractNumber || '--'}</span> | Khách hàng: <span className="font-bold text-slate-700">{form.clientName || '--'}</span></p>
          <p className="text-xs text-slate-500">Người tạo: <span className="font-semibold text-slate-700">{creatorName}</span> | Giá trị sau thuế: <span className="font-bold text-teal-600">{(form.postTaxValue || 0).toLocaleString('vi-VN')} ₫</span></p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 min-w-[320px]">
        {showRejectReason ? (
          <div className="flex flex-col gap-2 w-full">
            <input
              type="text"
              placeholder="Nhập lý do từ chối..."
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              className="px-3 py-2 text-sm border border-rose-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white"
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button
                disabled={actionLoading}
                onClick={() => setShowRejectReason(false)}
                className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg transition-colors"
              >
                Hủy
              </button>
              <button
                disabled={actionLoading || !rejectReason.trim()}
                onClick={handleReject}
                className="px-3 py-1 text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading ? 'Đang gửi...' : 'Xác nhận từ chối'}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex gap-3 w-full flex-wrap sm:flex-nowrap">
            <button
              disabled={actionLoading}
              onClick={() => setShowCancelReason(true)}
              className="flex-1 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 font-bold rounded-xl border border-red-200 transition-all flex items-center justify-center gap-1.5 text-sm shadow-sm"
            >
              <XCircle size={14} className="mr-1" /> Hủy hợp đồng
            </button>
            <button
              disabled={actionLoading}
              onClick={() => setShowRejectReason(true)}
              className="flex-1 px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl border border-rose-200 transition-all flex items-center justify-center gap-1.5 text-sm shadow-sm"
            >
              <AlertTriangle size={14} className="mr-1" /> Từ chối duyệt
            </button>
            <button
              disabled={actionLoading}
              onClick={handleApprove}
              className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl transition-all flex items-center justify-center gap-1.5 text-sm shadow-md hover:shadow-emerald-200"
            >
              {actionLoading ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              ) : (
                <span className="flex items-center gap-1.5"><CheckCircle2 size={14} className="mr-1" /> Phê duyệt</span>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}