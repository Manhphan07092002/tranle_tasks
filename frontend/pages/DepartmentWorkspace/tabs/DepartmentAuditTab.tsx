import React, { useState, useEffect, useMemo } from 'react';
import { 
  Clock, User, CheckCircle2, AlertCircle, FileText, 
  Send, RefreshCw, Shield, Layers, Search, Filter, Loader2
} from 'lucide-react';
import { apiFetch } from '../../../services/api';

interface DepartmentAuditTabProps {
  departmentId: string;
  currentDept: any;
  deptMembers: any[];
}

export const DepartmentAuditTab: React.FC<DepartmentAuditTabProps> = ({
  departmentId,
  currentDept,
  deptMembers
}) => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await apiFetch(`/api/activity-logs?departmentId=${departmentId}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(Array.isArray(data) ? data : (data.logs || []));
      }
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [departmentId]);

  const memberIds = useMemo(() => new Set(deptMembers.map(m => m.id)), [deptMembers]);

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      if (selectedUser !== 'all' && log.userId !== selectedUser) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchAction = log.action?.toLowerCase().includes(q);
        const matchDetails = log.details?.toLowerCase().includes(q);
        const matchEntity = log.entityType?.toLowerCase().includes(q);
        if (!matchAction && !matchDetails && !matchEntity) return false;
      }
      return true;
    });
  }, [logs, selectedUser, searchQuery]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* 1. TOP HEADER */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-gray-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl">
            <Clock size={24} />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Nhật Ký Hoạt Động & Giám Sát Tuân Thủ (Audit Trail) — Phòng {currentDept?.name}
            </h2>
            <p className="text-xs text-slate-400">
              Ghi nhận theo thời gian thực toàn bộ thao tác giao việc, cập nhật tiến độ, duyệt phiếu và chia sẻ tài liệu.
            </p>
          </div>
        </div>

        <button 
          onClick={fetchLogs} 
          className="p-2.5 bg-gray-50 dark:bg-slate-700 hover:bg-gray-100 dark:hover:bg-slate-600 rounded-xl text-slate-600 dark:text-slate-300 transition-colors flex items-center gap-2 text-xs font-bold"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Làm mới
        </button>
      </div>

      {/* 2. FILTER BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-3 rounded-2xl border border-gray-200 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <User size={15} className="text-slate-400" />
          <select
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            className="text-xs font-semibold px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-xl bg-gray-50 dark:bg-slate-700 text-slate-800 dark:text-white outline-none"
          >
            <option value="all">Tất cả nhân sự ({deptMembers.length})</option>
            {deptMembers.map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>

        <div className="relative min-w-[240px]">
          <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm hành động, đối tượng..."
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-200 dark:border-slate-600 rounded-xl bg-gray-50 dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-slate-500"
          />
        </div>
      </div>

      {/* 3. TIMELINE STREAM */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-gray-200 dark:border-slate-700 shadow-sm p-6">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-2">
            <Loader2 className="animate-spin text-slate-600" size={28} />
            <span className="text-xs">Đang tải nhật ký hoạt động...</span>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-20 text-center space-y-2">
            <div className="w-14 h-14 rounded-full bg-gray-50 dark:bg-slate-700 text-slate-400 flex items-center justify-center mx-auto mb-2">
              <Clock size={24} />
            </div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-white">Chưa có nhật ký hoạt động gần đây</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Các thao tác của thành viên trong phòng ban sẽ tự động hiển thị tại đây theo thứ tự thời gian.
            </p>
          </div>
        ) : (
          <div className="relative pl-6 border-l-2 border-slate-100 dark:border-slate-700 space-y-6">
            {filteredLogs.map(log => {
              const actor = deptMembers.find(m => m.id === log.userId);

              return (
                <div key={log.id} className="relative group">
                  <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-slate-300 dark:bg-slate-600 border-2 border-white dark:border-slate-800 group-hover:bg-blue-500 transition-colors" />
                  
                  <div className="p-4 bg-gray-50/70 dark:bg-slate-700/40 border border-gray-100 dark:border-slate-700 rounded-2xl space-y-1 hover:border-slate-300 dark:hover:border-slate-600 transition-all">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <img src={actor?.avatar || 'https://via.placeholder.com/32'} alt={actor?.name} className="w-5 h-5 rounded-full object-cover" />
                        <span className="font-bold text-xs text-slate-900 dark:text-white">{actor?.name || log.userName || 'Hệ thống'}</span>
                        <span className="text-[11px] text-slate-400">đã {log.action || 'thực hiện thao tác'}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 whitespace-nowrap">
                        {log.createdAt ? new Date(log.createdAt).toLocaleString('vi-VN') : 'Vừa xong'}
                      </span>
                    </div>

                    {log.details && (
                      <div className="text-xs text-slate-600 dark:text-slate-300 pt-1">
                        {log.details}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};
