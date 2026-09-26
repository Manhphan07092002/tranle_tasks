import React from 'react';
import { motion } from 'motion/react';
import { Zap, CheckCircle, Activity, XCircle } from 'lucide-react';
import { STATUS_COLORS, STATUS_LABELS } from '../../pages/Admin/hooks/useAdminDashboard';

interface CompletionRateBarProps {
  stats: any;
}

export function CompletionRateBar({ stats }: CompletionRateBarProps) {
  const completionRate = stats.totalTasks > 0
    ? Math.round((stats.taskStatusBreakdown.find((s: any) => s.status === 'Done')?.count || 0) / stats.totalTasks * 100)
    : 0;

  return (
    <motion.div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Zap size={16} className="text-orange-500" />
          <span className="text-sm font-bold text-gray-700">Tỉ lệ Hoàn thành Công việc Toàn Hệ thống</span>
        </div>
        <span className="text-2xl font-black text-gray-800">{completionRate}%</span>
      </div>
      <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${completionRate}%` }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          className="h-full rounded-full relative"
          style={{
            background: 'linear-gradient(90deg, #f97316, #eab308, #22c55e)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 2s linear infinite',
          }}
        />
      </div>
      <style>{`@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
      <div className="flex gap-6 mt-3">
        {stats.taskStatusBreakdown.map((s: any) => (
          <div key={s.status} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[s.status] || '#94a3b8' }} />
            <span className="text-xs text-gray-500">{STATUS_LABELS[s.status] || s.status}: <strong>{s.count}</strong></span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}