import React from 'react';
import { motion } from 'motion/react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { SectionHeader, CustomTooltip, getColor } from './CommonComponents';
import { PieChart as PieIcon } from 'lucide-react';
import { VIVID_PALETTE, KNOWN_ROLE_COLORS } from '../../pages/Admin/hooks/useAdminDashboard';

interface RolePieChartProps {
  stats: any;
}

export function RolePieChart({ stats }: RolePieChartProps) {
  const roleChart = stats.roleBreakdown.map((r: any) => ({ name: r.role || 'Không rõ', value: r.count }));

  return (
    <motion.div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
      <SectionHeader
        icon={PieIcon}
        title="Phân bổ Vai trò Người dùng"
        subtitle="Số lượng thành viên theo từng cấp bậc"
      />
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie
            data={roleChart}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={95}
            paddingAngle={4}
            dataKey="value"
            nameKey="name"
          >
            {roleChart.map((entry: any, index: number) => (
              <Cell key={`role-${index}`} fill={getColor(entry.name)} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="grid grid-cols-2 gap-2 mt-2">
        {stats.roleBreakdown.map((r: any) => (
          <div key={r.role} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-xl">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getColor(r.role) }} />
              <span className="text-xs font-medium text-gray-600">{r.role}</span>
            </div>
            <span className="text-sm font-bold text-gray-800">{r.count}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}