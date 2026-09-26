import React from 'react';
import { motion } from 'motion/react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { SectionHeader, CustomTooltip } from './CommonComponents';
import { BarChart2 } from 'lucide-react';
import { STATUS_COLORS, STATUS_LABELS } from '../../pages/Admin/hooks/useAdminDashboard';
import { CheckCircle, Activity, XCircle, AlertCircle } from 'lucide-react';

interface TaskStatusPieChartProps {
  stats: any;
}

export function TaskStatusPieChart({ stats }: TaskStatusPieChartProps) {
  const statusChart = stats.taskStatusBreakdown.map((s: any) => ({
    name: STATUS_LABELS[s.status] || s.status || 'Chưa phân loại',
    status: s.status,
    value: s.count
  }));

  return (
    <motion.div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
      <SectionHeader
        icon={BarChart2}
        title="Trạng thái Công việc"
        subtitle="Tỉ lệ công việc theo trạng thái hiện tại"
      />
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie
            data={statusChart}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={95}
            paddingAngle={4}
            dataKey="value"
            nameKey="name"
          >
            {statusChart.map((entry: any, index: number) => (
              <Cell key={`status-${index}`} fill={STATUS_COLORS[entry.status] || '#94a3b8'} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="grid grid-cols-3 gap-2 mt-2">
        {stats.taskStatusBreakdown.map((s: any) => {
          const icons: Record<string, React.ReactNode> = {
            Done: <CheckCircle size={14} className="text-emerald-500" />,
            'In Progress': <Activity size={14} className="text-blue-500" />,
            Todo: <XCircle size={14} className="text-amber-500" />,
          };
          return (
            <div key={s.status || 'unknown'} className="flex flex-col items-center bg-gray-50 py-3 rounded-xl gap-1">
              {icons[s.status] || <AlertCircle size={14} className="text-gray-400" />}
              <span className="text-lg font-black text-gray-800">{s.count}</span>
              <span className="text-xs text-gray-400">{STATUS_LABELS[s.status] || s.status || 'Chưa phân loại'}</span>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}