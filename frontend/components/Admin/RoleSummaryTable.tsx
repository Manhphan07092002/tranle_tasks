import React from 'react';
import { motion } from 'motion/react';
import { SectionHeader, getColor } from './CommonComponents';
import { Shield, UserCheck } from 'lucide-react';

interface RoleSummaryTableProps {
  stats: any;
}

export function RoleSummaryTable({ stats }: RoleSummaryTableProps) {
  const permissions: Record<string, string> = {
    Admin: 'Quản trị viên: Toàn quyền truy cập, cài đặt hệ thống',
    Director: 'Giám đốc: Xem tổng quan, duyệt báo cáo, chỉ đạo',
    Manager: 'Quản lý: Điều phối nhân sự, giao việc phòng ban',
    Employee: 'Nhân viên: Xử lý công việc được giao',
  };

  return (
    <motion.div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm overflow-hidden relative">
      <div className="absolute top-0 right-0 p-32 bg-gradient-to-bl from-brand-50 to-transparent rounded-bl-full opacity-50 pointer-events-none" />
      <SectionHeader
        icon={UserCheck}
        title="Bảng Phân quyền Hệ thống"
        subtitle="Tổng hợp số lượng nhân sự theo vai trò"
      />
      <div className="overflow-x-auto relative">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-4 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Vai Trò</th>
              <th className="text-left py-4 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Số lượng</th>
              <th className="text-left py-4 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Tỉ lệ</th>
              <th className="text-left py-4 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Mô tả Quyền hạn</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {stats.roleBreakdown.map((r: any) => {
              const percent = Math.round((r.count / stats.totalUsers) * 100);
              return (
                <tr key={r.role} className="hover:bg-brand-50/30 transition-colors group">
                  <td className="py-4 px-4">
                    <span
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm"
                      style={{
                        backgroundColor: `${getColor(r.role)}15`,
                        color: getColor(r.role),
                        border: `1px solid ${getColor(r.role)}30`
                      }}
                    >
                      <span className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: getColor(r.role) }} />
                      {r.role}
                    </span>
                  </td>
                  <td className="py-4 px-4 font-black text-gray-800 text-base">{r.count} <span className="text-xs font-normal text-gray-400">người</span></td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden shadow-inner">
                        <div
                          className="h-full rounded-full relative"
                          style={{ width: `${percent}%`, backgroundColor: getColor(r.role) }}
                        >
                          <div className="absolute inset-0 bg-white/20 w-full" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)' }} />
                        </div>
                      </div>
                      <span className="text-xs font-bold text-gray-600 w-8">{percent}%</span>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-sm text-gray-600 font-medium group-hover:text-gray-900 transition-colors">{permissions[r.role] || 'Thành viên hệ thống'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}