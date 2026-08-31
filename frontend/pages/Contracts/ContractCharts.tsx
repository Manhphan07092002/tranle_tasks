import React, { useMemo } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip as RechartsTooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, BarChart, Bar, Legend 
} from 'recharts';
import { Contract } from '../../services/contractService';
import { fmtMoneyShort } from './contractUtils';
import { Card } from '../../components/UI';
import { TrendingUp, Award, BarChart3, PieChart as PieIcon } from 'lucide-react';

interface ContractChartsProps {
  contracts: Contract[];
  isInput?: boolean;
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#6366f1', '#ec4899', '#94a3b8'];

export const ContractCharts: React.FC<ContractChartsProps> = ({ contracts, isInput }) => {
  // 1. Group by month to calculate monthly value
  const monthlyData = useMemo(() => {
    const groups: { [key: string]: { month: string; value: number; count: number } } = {};
    
    // Sort contracts by date to ensure proper timeline
    const sorted = [...contracts].sort((a, b) => {
      const dateA = a.signedDate || a.createdAt || '';
      const dateB = b.signedDate || b.createdAt || '';
      return dateA.localeCompare(dateB);
    });

    sorted.forEach(c => {
      const dateStr = c.signedDate || c.createdAt;
      if (!dateStr) return;
      
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return;
      
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const displayLabel = `T${date.getMonth() + 1}/${String(date.getFullYear()).substring(2)}`;
      
      if (!groups[key]) {
        groups[key] = { month: displayLabel, value: 0, count: 0 };
      }
      groups[key].value += c.postTaxValue || 0;
      groups[key].count += 1;
    });

    return Object.keys(groups)
      .sort()
      .map(k => groups[k])
      .slice(-6); // Only show last 6 active months
  }, [contracts]);

  // 2. Status distribution
  const statusData = useMemo(() => {
    const counts: { [key: string]: number } = { draft: 0, pending: 0, in_progress: 0, completed: 0 };
    contracts.forEach(c => {
      const status = c.status || 'draft';
      if (status in counts) {
        counts[status]++;
      }
    });

    const statusLabels: { [key: string]: string } = {
      draft: 'Bản nháp',
      pending: 'Chờ duyệt',
      in_progress: 'Đang thực hiện',
      completed: 'Hoàn thành'
    };

    return Object.keys(counts)
      .map(key => ({
        name: statusLabels[key] || key,
        value: counts[key]
      }))
      .filter(d => d.value > 0);
  }, [contracts]);

  // 3. Top clients or suppliers by total contract value
  const topPartners = useMemo(() => {
    const totals: { [key: string]: number } = {};
    contracts.forEach(c => {
      const name = isInput ? c.supplierName || c.clientName : c.clientName;
      if (!name) return;
      totals[name] = (totals[name] || 0) + (c.postTaxValue || 0);
    });

    return Object.keys(totals)
      .map(name => ({ name, value: totals[name] }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5); // Top 5
  }, [contracts, isInput]);

  const hasData = contracts.length > 0;

  if (!hasData) {
    return (
      <Card className="p-8 text-center text-gray-400">
        <p className="text-sm font-semibold">Chưa có đủ dữ liệu hợp đồng để hiển thị biểu đồ phân tích.</p>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
      
      {/* 1. Monthly Value Area Chart */}
      <Card className="p-5 overflow-hidden flex flex-col h-[320px]">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className={`w-4 h-4 ${isInput ? 'text-blue-500' : 'text-emerald-500'}`} />
          <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wider">
            {isInput ? 'Dòng chi phí theo tháng (HĐ Mua)' : 'Dòng doanh thu theo tháng (HĐ Bán)'}
          </h4>
        </div>
        <div className="flex-1 min-h-0">
          {monthlyData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-gray-400">Không có dữ liệu thời gian</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="chartColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={isInput ? '#3b82f6' : '#10b981'} stopOpacity={0.2}/>
                    <stop offset="95%" stopColor={isInput ? '#3b82f6' : '#10b981'} stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} />
                <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => fmtMoneyShort(v)} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} />
                <RechartsTooltip 
                  formatter={(value: any) => [`${(value).toLocaleString('vi-VN')} ₫`, 'Giá trị']}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: 12 }} 
                />
                <Area type="monotone" dataKey="value" stroke={isInput ? '#3b82f6' : '#10b981'} strokeWidth={2.5} fillOpacity={1} fill="url(#chartColor)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      {/* 2. Top Partners Bar Chart */}
      <Card className="p-5 overflow-hidden flex flex-col h-[320px]">
        <div className="flex items-center gap-2 mb-4">
          <Award className={`w-4 h-4 ${isInput ? 'text-blue-500' : 'text-emerald-500'}`} />
          <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wider">
            {isInput ? 'Top 5 Nhà cung cấp lớn nhất' : 'Top 5 Khách hàng lớn nhất'}
          </h4>
        </div>
        <div className="flex-1 min-h-0">
          {topPartners.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-gray-400">Chưa có dữ liệu khách hàng</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topPartners} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" tickLine={false} axisLine={false} tickFormatter={(v) => fmtMoneyShort(v)} tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 600 }} />
                <YAxis type="category" dataKey="name" width={90} tickLine={false} axisLine={false} tick={{ fontSize: 9, fill: '#475569', fontWeight: 700 }} />
                <RechartsTooltip 
                  formatter={(value: any) => [`${(value).toLocaleString('vi-VN')} ₫`, 'Giá trị']}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: 11 }} 
                />
                <Bar dataKey="value" radius={[0, 8, 8, 0]} fill={isInput ? '#3b82f6' : '#10b981'} maxBarSize={20} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      {/* 3. Status Distribution Pie Chart */}
      <Card className="p-5 overflow-hidden flex flex-col h-[320px]">
        <div className="flex items-center gap-2 mb-4">
          <PieIcon className={`w-4 h-4 ${isInput ? 'text-blue-500' : 'text-emerald-500'}`} />
          <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wider">
            Phân bố trạng thái Hợp đồng
          </h4>
        </div>
        <div className="flex-1 min-h-0 flex items-center justify-center relative">
          {statusData.length === 0 ? (
            <div className="text-xs text-gray-400">Chưa có dữ liệu trạng thái</div>
          ) : (
            <div className="w-full h-full flex flex-col sm:flex-row items-center justify-center">
              <div className="w-1/2 h-[180px] relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      formatter={(value: any) => [`${value} hợp đồng`, 'Số lượng']}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: 11 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Core text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-black text-gray-800">{contracts.length}</span>
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Hợp đồng</span>
                </div>
              </div>
              
              {/* Legend list */}
              <div className="flex-1 pl-4 space-y-1.5 w-full sm:w-auto">
                {statusData.map((entry, index) => (
                  <div key={entry.name} className="flex items-center gap-2 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                    <span className="text-gray-500 font-bold flex-1 truncate">{entry.name}</span>
                    <span className="text-gray-700 font-black">{entry.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>
      
    </div>
  );
};
