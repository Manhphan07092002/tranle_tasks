import React from 'react';
import { AlertTriangle, XCircle } from 'lucide-react';

interface StatusBannersProps {
  form: any;
  canApproveThisContract?: boolean;
}

export function StatusBanners({
  form,
  canApproveThisContract,
}: StatusBannersProps) {
  return (
    <>
      {/* Pending approval for employee */}
      {form.status === 'pending' && !canApproveThisContract && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-4 flex items-center gap-3 animate-in slide-in-from-top duration-300">
          <span className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 font-bold animate-pulse">⏳</span>
          <div>
            <h4 className="text-sm font-bold text-amber-800">Đang chờ phê duyệt</h4>
            <p className="text-xs text-amber-600">Hợp đồng này đang chờ Trưởng phòng phê duyệt. Bạn vẫn có thể chỉnh sửa và cập nhật thông tin nếu cần thiết.</p>
          </div>
        </div>
      )}

      {/* Rejected with feedback */}
      {form.status === 'draft' && form.approvalFeedback && (
        <div className="bg-rose-50 border-b border-rose-200 px-6 py-4 flex items-start gap-3 animate-in slide-in-from-top duration-300">
          <span className="flex-shrink-0 w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 font-bold">❌</span>
          <div className="flex-1">
            <h4 className="text-sm font-bold text-rose-800">Yêu cầu sửa đổi - Bị từ chối duyệt</h4>
            <p className="text-xs text-rose-700 mt-0.5">Lý do từ chối: <span className="font-bold">{form.approvalFeedback}</span></p>
            <p className="text-xs text-rose-500 mt-1">Vui lòng kiểm tra lại các điều khoản, chỉnh sửa thông tin cần thiết và gửi lại yêu cầu phê duyệt.</p>
          </div>
        </div>
      )}

      {/* Cancelled */}
      {form.status === 'cancelled' && (
        <div className="bg-rose-50/60 border-b border-rose-100 px-6 py-3 flex items-center justify-center gap-2">
          <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping"></span>
          <span className="text-xs font-bold text-rose-700 uppercase tracking-widest">Hợp đồng này đã bị hủy bỏ</span>
        </div>
      )}
    </>
  );
}