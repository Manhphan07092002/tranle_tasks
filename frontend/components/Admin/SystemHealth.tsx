import React from 'react';
import { motion } from 'motion/react';
import { SectionHeader, MetricRow } from './CommonComponents';
import { Server, Cpu, Database, Activity, List, Mail, Send, Key, Zap, BarChart2, PieChart as PieIcon, FileText, Clock, UserCheck, XCircle, CheckCircle, ArrowUpRight, Shield } from 'lucide-react';

interface SystemHealthProps {
  stats: any;
  fetchModalData: (type: string, title?: string) => void;
}

export function SystemHealth({ stats, fetchModalData }: SystemHealthProps) {
  return (
    <motion.div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
      <SectionHeader
        icon={Server}
        title="Sức khỏe Máy chủ"
        subtitle="Chỉ số hoạt động thời gian thực"
      />
      <div className="mt-2">
        <MetricRow label="Node.js Version" value={stats.systemInfo?.nodeVersion || 'N/A'} icon={Server} color="#10b981" />
        <MetricRow label="RAM Usage" value={stats.systemInfo?.memoryUsage ? `${Math.round(stats.systemInfo.memoryUsage / 1024 / 1024)} MB` : 'N/A'} icon={Cpu} color="#3b82f6" />
        <MetricRow label="Kích thước Database" value={stats.systemInfo?.dbSize !== undefined ? `${(stats.systemInfo.dbSize / 1024 / 1024).toFixed(2)} MB` : 'N/A'} icon={Database} color="#f59e0b" />
        <MetricRow label="Uptime" value={stats.systemInfo?.uptime ? `${Math.floor(stats.systemInfo.uptime / 3600)}h ${Math.floor((stats.systemInfo.uptime % 3600) / 60)}m` : 'N/A'} icon={Activity} color="#8b5cf6" />
      </div>
    </motion.div>
  );
}

interface SystemActivityProps {
  stats: any;
  fetchModalData: (type: string, title?: string) => void;
}

export function SystemActivity({ stats, fetchModalData }: SystemActivityProps) {
  return (
    <motion.div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
      <SectionHeader
        icon={Activity}
        title="Hoạt động Gần đây"
        subtitle="Tổng quan lượng tương tác hệ thống"
      />
      <div className="mt-2">
        <MetricRow label="Tổng Log Hệ thống" value={stats.totalLogs.toLocaleString()} icon={List} color="#f97316" onClick={() => fetchModalData('activity_logs', 'Log Hệ thống')} />
        <MetricRow label="Email Chờ Gửi" value={stats.scheduledEmails.toLocaleString()} icon={Mail} color="#ec4899" onClick={() => fetchModalData('scheduled_emails', 'Email chờ gửi')} />
        <MetricRow label="Email Đã Gửi" value={stats.sentEmails.toLocaleString()} icon={Send} color="#10b981" onClick={() => fetchModalData('mail_tracking', 'Email Đã Gửi')} />
        <MetricRow label="Yêu cầu Reset MK" value={stats.pendingResets.toLocaleString()} icon={Key} color="#3b82f6" onClick={() => fetchModalData('password_reset_requests', 'Yêu cầu Reset Mật khẩu')} />
      </div>
    </motion.div>
  );
}