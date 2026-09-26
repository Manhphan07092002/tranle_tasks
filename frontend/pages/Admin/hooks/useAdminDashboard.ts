import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../../../services/api';

export interface AdminStats {
  totalUsers: number;
  totalTasks: number;
  totalReports: number;
  activeMeetings: number;
  totalLogs: number;
  scheduledEmails: number;
  sentEmails: number;
  pendingResets: number;
  roleBreakdown: { role: string; count: number }[];
  taskStatusBreakdown: { status: string; count: number }[];
  taskDeptBreakdown: { department: string; count: number }[];
  reportStatusBreakdown: { status: string; count: number }[];
  systemInfo?: {
    nodeVersion: string;
    platform: string;
    memoryUsage: number;
    uptime: number;
    dbSize: number;
  };
}

export interface PasswordResetRequest {
  id: string;
  userId: string;
  email: string;
  status: 'pending' | 'resolved';
  createdAt: string;
}

export function useAdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [resetRequests, setResetRequests] = useState<PasswordResetRequest[]>([]);

  const [showTableModal, setShowTableModal] = useState<{ visible: boolean; table: string; title: string }>({ visible: false, table: '', title: '' });
  const [modalData, setModalData] = useState<any[]>([]);
  const [modalLoading, setModalLoading] = useState(false);

  const fetchModalData = useCallback(async (type: string, title?: string) => {
    setModalLoading(true);
    setModalData([]);
    setShowTableModal({ visible: true, table: type, title: title || '' });

    try {
      const url = `/api/admin/database/table/${type}?limit=20`;
      const res = await apiFetch(url);
      if (res.ok) {
        const data = await res.json();
        setModalData(data.rows);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setModalLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, resetRes] = await Promise.all([
        apiFetch('/api/admin/stats'),
        apiFetch('/api/admin/password-reset-requests')
      ]);
      if (!statsRes.ok) throw new Error(`Server error: ${statsRes.status}`);
      const data: AdminStats = await statsRes.json();
      setStats(data);
      if (resetRes.ok) setResetRequests(await resetRes.json());
      setLastUpdated(new Date());
    } catch (e: any) {
      setError(e.message || 'Không thể tải dữ liệu từ máy chủ.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
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
  };
}

export const VIVID_PALETTE = [
  '#ef4444', '#3b82f6', '#8b5cf6', '#22c55e', '#f59e0b',
  '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#6366f1',
  '#e11d48', '#0ea5e9', '#a855f7', '#84cc16', '#d946ef',
];

export const KNOWN_ROLE_COLORS: Record<string, string> = {
  Admin: '#ef4444',
  Director: '#8b5cf6',
  Manager: '#3b82f6',
  Employee: '#22c55e',
  'Giám đốc': '#8b5cf6',
};

export const STATUS_COLORS: Record<string, string> = {
  'Done': '#22c55e',
  'In Progress': '#3b82f6',
  'Todo': '#f59e0b',
  'Review': '#8b5cf6',
};

export const STATUS_LABELS: Record<string, string> = {
  'Done': 'Hoàn thành',
  'In Progress': 'Đang làm',
  'Todo': 'Chờ xử lý',
};

export const DEPT_COLORS = [
  '#f97316', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6',
  '#f59e0b', '#ef4444', '#3b82f6', '#22c55e', '#6366f1',
];

let _colorCache: Record<string, string> = {};
let _nextIdx = 0;

export function getColor(key: string): string {
  if (KNOWN_ROLE_COLORS[key]) return KNOWN_ROLE_COLORS[key];
  if (_colorCache[key]) return _colorCache[key];
  const usedColors = new Set(Object.values(KNOWN_ROLE_COLORS));
  while (usedColors.has(VIVID_PALETTE[_nextIdx % VIVID_PALETTE.length])) _nextIdx++;
  _colorCache[key] = VIVID_PALETTE[_nextIdx % VIVID_PALETTE.length];
  _nextIdx++;
  return _colorCache[key];
}