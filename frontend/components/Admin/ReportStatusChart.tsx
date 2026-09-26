import React from 'react';
import { motion } from 'motion/react';
import { SectionHeader } from './CommonComponents';
import { FileText } from 'lucide-react';

interface ReportStatusChartProps {
  stats: any;
}

export function ReportStatusChart({ stats }: ReportStatusChartProps) {
  return (
    <motion.div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col">
      <SectionHeader
        icon={FileText}
        title="Thống kê Báo cáo"
        subtitle="Tình trạng báo cáo trong hệ thống"
      />
      <div className="flex-1 flex flex-col justify-center gap-4">
        {stats.reportStatusBreakdown.length === 0 ? (
          <p className="text-gray-400 text-sm text-center">Chưa có báo cáo nào</p>
        ) : (
          stats.reportStatusBreakdown.map((r: any) => {
            let color = '#94a3b8';
            let label = r.status;
            if (r.status === 'Approved') { color = '#22c55e'; label = 'Đã duyệt'; }
            if (r.status === 'Pending') { color = '#f59e0b'; label = 'Chờ duyệt'; }
            if (r.status === 'Rejected') { color = '#ef4444'; label = 'Yêu cầu làm lại'; }

            const percent = Math.round((r.count / stats.totalReports) * 100);

            return (
              <div key={r.status} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-700 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                    {label}
                  </span>
                  <span className="font-bold text-gray-900">{r.count} <span className="text-gray-400 font-normal">({percent}%)</span></span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${percent}%`, backgroundColor: color }} />
                </div>
              </div>
            );
          })
        )}
      </div>
    </motion.div>
  );
}