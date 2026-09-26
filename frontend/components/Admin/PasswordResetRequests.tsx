import React from 'react';
import { motion } from 'motion/react';
import { SectionHeader } from './CommonComponents';
import { Clock } from 'lucide-react';

interface PasswordResetRequestsProps {
  resetRequests: any[];
}

export function PasswordResetRequests({ resetRequests }: PasswordResetRequestsProps) {
  return (
    <motion.div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
      <SectionHeader
        icon={Clock}
        title="Yêu cầu quên mật khẩu"
        subtitle="Danh sách người dùng đang chờ admin cấp lại mật khẩu"
      />
      {resetRequests.length === 0 ? (
        <div className="text-sm text-gray-400">Hiện chưa có yêu cầu nào.</div>
      ) : (
        <div className="space-y-3">
          {resetRequests.map((request: any) => (
            <div key={request.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-gray-800">{request.email}</p>
                <p className="text-xs text-gray-400">{new Date(request.createdAt).toLocaleString('vi-VN')} · {request.status === 'pending' ? 'Đang chờ xử lý' : 'Đã xử lý'}</p>
              </div>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${request.status === 'pending' ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'}`}>
                {request.status === 'pending' ? 'Pending' : 'Resolved'}
              </span>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}