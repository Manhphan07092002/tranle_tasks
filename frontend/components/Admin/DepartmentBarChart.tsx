import React from 'react';
import { motion } from 'motion/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer } from 'recharts';
import { SectionHeader, CustomTooltip } from './CommonComponents';
import { DEPT_COLORS } from '../../pages/Admin/hooks/useAdminDashboard';
import { BarChart2 } from 'lucide-react';

interface DepartmentBarChartProps {
  stats: any;
}

export function DepartmentBarChart({ stats }: DepartmentBarChartProps) {
  const deptChart = stats.taskDeptBreakdown.map((d: any) => ({ name: d.department || 'Chưa phân', tasks: d.count }));

  if (deptChart.length === 0) return null;

  return (
    <motion.div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
      <SectionHeader
        icon={BarChart2}
        title="Công việc theo Phòng Ban"
        subtitle="Số lượng công việc được giao theo từng bộ phận"
      />
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={deptChart} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 12, fill: '#64748b' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 12, fill: '#64748b' }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(249,115,22,0.08)' }} />
          <Bar dataKey="tasks" name="Công việc" radius={[6, 6, 0, 0]}>
            {deptChart.map((_: any, index: number) => (
              <Cell key={`dept-${index}`} fill={DEPT_COLORS[index % DEPT_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  );
}