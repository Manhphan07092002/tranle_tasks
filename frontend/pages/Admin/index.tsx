import { useAdminDashboard, AdminStats } from './hooks/useAdminDashboard';
import { StatCard } from '../../components/Admin/StatCard';
import { RolePieChart } from '../../components/Admin/RolePieChart';
import { TaskStatusPieChart } from '../../components/Admin/TaskStatusPieChart';
import { DepartmentBarChart } from '../../components/Admin/DepartmentBarChart';
import { ReportStatusChart } from '../../components/Admin/ReportStatusChart';
import { SystemHealth, SystemActivity } from '../../components/Admin/SystemHealth';
import { CompletionRateBar } from '../../components/Admin/CompletionRateBar';
import { PasswordResetRequests } from '../../components/Admin/PasswordResetRequests';
import { RoleSummaryTable } from '../../components/Admin/RoleSummaryTable';
import { TableModal } from '../../components/Admin/TableModal';

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };
const stagger = { visible: { transition: { staggerChildren: 0.08 } } };

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { apiFetch } from '../../services/api';
import {
  Users, CheckSquare, FileText, Video, Shield, TrendingUp,
  Activity, RefreshCw, AlertCircle, BarChart2, PieChart as PieIcon,
  Clock
} from 'lucide-react';

const STAT_CARDS = [
  { label: 'Tổng Người Dùng', valueKey: 'totalUsers', icon: Users, gradient: 'bg-gradient-to-br from-blue-500 to-cyan-400', shadow: 'rgba(59,130,246,0.25)', table: 'users', title: 'Danh sách Người Dùng' },
  { label: 'Công Việc Đang Làm', valueKey: 'totalTasks', icon: CheckSquare, gradient: 'bg-gradient-to-br from-orange-500 to-amber-400', shadow: 'rgba(249,115,22,0.25)', table: 'tasks', title: 'Danh sách Công Việc' },
  { label: 'Báo Cáo Đã Nhận', valueKey: 'totalReports', icon: FileText, gradient: 'bg-gradient-to-br from-purple-500 to-pink-500', shadow: 'rgba(168,85,247,0.25)', table: 'reports', title: 'Danh sách Báo Cáo' },
  { label: 'Cuộc Họp Đang Diễn Ra', valueKey: 'activeMeetings', icon: Video, gradient: 'bg-gradient-to-br from-emerald-500 to-teal-400', shadow: 'rgba(16,185,129,0.25)', table: 'meetings', title: 'Danh sách Cuộc Họp' },
] as const;

export default function AdminDashboard() {
  const {
    stats,
    loading,
    error,
    lastUpdated,
    resetRequests,
    showTableModal,
    setShowTableModal,
    modalData,
    modalLoading,
    fetchModalData,
    fetchStats,
  } = useAdminDashboard();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-400 font-medium">Đang tải dữ liệu hệ thống...</p>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4 text-red-500">
        <AlertCircle size={48} strokeWidth={1.5} />
        <p className="font-semibold text-lg">{error || 'Lỗi không xác định'}</p>
        <button
          onClick={fetchStats}
          className="mt-2 px-5 py-2 bg-red-100 text-red-600 rounded-xl font-medium hover:bg-red-200 transition-colors flex items-center gap-2"
        >
          <RefreshCw size={16} /> Thử lại
        </button>
      </div>
    );
  }

  return (
    <motion.div className="space-y-8 pb-8" initial="hidden" animate="visible" variants={stagger}>
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-red-500 via-orange-500 to-yellow-400 rounded-2xl shadow-lg shadow-orange-200">
            <Shield size={26} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900">Trang Quản Trị</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              Tổng quan toàn hệ thống · Chỉ dành cho Admin
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-gray-400 flex items-center gap-1.5">
              <Clock size={12} /> Cập nhật: {lastUpdated.toLocaleTimeString('vi-VN')}
            </span>
          )}
          <button
            onClick={fetchStats}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 text-sm font-medium transition-all shadow-sm hover:shadow-md"
          >
            <RefreshCw size={14} /> Làm mới
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <motion.div variants={stagger} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {STAT_CARDS.map((card, idx) => (
          <StatCard
            key={idx}
            label={card.label}
            value={stats[card.valueKey as keyof AdminStats] as number}
            icon={card.icon}
            gradient={card.gradient}
            shadow={card.shadow}
            onClick={() => fetchModalData(card.table, card.title)}
          />
        ))}
      </motion.div>

      {/* System Health & System Activity Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SystemHealth stats={stats} fetchModalData={fetchModalData} />
        <SystemActivity stats={stats} fetchModalData={fetchModalData} />
      </div>

      {/* Completion Rate Bar */}
      <CompletionRateBar stats={stats} />

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RolePieChart stats={stats} />
        <TaskStatusPieChart stats={stats} />
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DepartmentBarChart stats={stats} />
        <ReportStatusChart stats={stats} />
      </div>

      {/* Password Reset Requests */}
      <PasswordResetRequests resetRequests={resetRequests} />

      {/* Role Summary Table */}
      <RoleSummaryTable stats={stats} />

      {/* Table Modal */}
      <TableModal
        visible={showTableModal.visible}
        table={showTableModal.table}
        title={showTableModal.title}
        data={modalData}
        loading={modalLoading}
        onClose={() => setShowTableModal({ visible: false, table: '', title: '' })}
      />
    </motion.div>
  );
}