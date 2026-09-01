import React, { useState, useMemo } from 'react';
import { 
  CheckCircle2, XCircle, Clock, AlertTriangle, FileSignature, 
  Search, Filter, DollarSign, Calendar, User, ShieldCheck, Loader2
} from 'lucide-react';
import { Button } from '../../../components/UI';
import { apiFetch } from '../../../services/api';
import { useAuth } from '../../../contexts/AuthContext';

interface DepartmentApprovalsTabProps {
  departmentId: string;
  currentDept: any;
  deptMembers: any[];
  approvals: any[];
  onRefreshApprovals?: () => void;
}

export const DepartmentApprovalsTab: React.FC<DepartmentApprovalsTabProps> = ({
  departmentId,
  currentDept,
  deptMembers,
  approvals = [],
  onRefreshApprovals
}) => {
  const { user, isAdmin, isDirector, isManager } = useAuth();
  const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const formatVND = (num: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num || 0);
  };

  // Filter approvals related to this department or members
  const memberIds = useMemo(() => new Set(deptMembers.map(m => m.id)), [deptMembers]);

  const deptApprovals = useMemo(() => {
    return approvals.filter(app => {
      const isDept = app.departmentId === departmentId || memberIds.has(app.requestedBy);
      if (!isDept && departmentId !== 'dept-exec') return false;

      if (statusFilter !== 'all' && app.status !== statusFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = app.title?.toLowerCase().includes(q);
        const matchCode = app.approvalCode?.toLowerCase().includes(q);
        if (!matchTitle && !matchCode) return false;
      }

      return true;
    });
  }, [approvals, departmentId, memberIds, statusFilter, searchQuery]);

  const handleAction = async (id: string, action: 'approved' | 'rejected') => {
    try {
      setActionLoadingId(id);
      const res = await apiFetch(`/api/approvals/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: action,
          respondedAt: new Date().toISOString()
        })
      });
      if (res.ok && onRefreshApprovals) {
        onRefreshApprovals();
      }
    } catch (err) {
      console.error('Error updating approval:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* 1. TOP BANNER */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-gray-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-50 dark:bg-purple-950/40 text-purple-600 rounded-2xl">
            <FileSignature size={24} />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Trung Tâm Trình Duyệt & Ký Số — Phòng {currentDept?.name}
            </h2>
            <p className="text-xs text-slate-400">
              Kiểm soát các tờ trình phê duyệt ngân sách, hợp đồng, đơn nghỉ phép và đề xuất mua sắm.
            </p>
          </div>
        </div>
      </div>

      {/* 2. FILTER CONTROLS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-3 rounded-2xl border border-gray-200 dark:border-slate-700">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {[
            { id: 'pending', label: 'Chờ Phê Duyệt' },
            { id: 'approved', label: 'Đã Duyệt' },
            { id: 'rejected', label: 'Từ Chối' },
            { id: 'all', label: 'Tất Cả' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                statusFilter === tab.id
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search size={14} className="absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tiêu đề hoặc mã tờ trình..."
            className="pl-9 pr-4 py-2 text-xs rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 text-slate-800 dark:text-white w-full md:w-64 outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>

      {/* 3. APPROVAL LIST */}
      <div className="space-y-3">
        {deptApprovals.length === 0 ? (
          <div className="py-16 text-center bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-gray-200 dark:border-slate-700 space-y-2">
            <CheckCircle2 size={28} className="mx-auto text-slate-400" />
            <div className="text-sm font-bold text-slate-800 dark:text-white">Không có tờ trình nào trong mục này</div>
            <p className="text-xs text-slate-400">Các tờ trình mới cần duyệt hoặc đã xử lý sẽ hiển thị tại đây.</p>
          </div>
        ) : (
          deptApprovals.map(app => {
            const requester = deptMembers.find(m => m.id === app.requestedBy);
            const isPending = app.status === 'pending';

            // Strict RBAC check: Can current user approve/reject this ticket?
            const canUserDecide = 
              isAdmin || 
              isDirector || 
              user?.id === app.approverId || 
              (isManager && (app.departmentId === departmentId || user?.departmentId === departmentId || user?.department === departmentId));

            return (
              <div 
                key={app.id} 
                className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-gray-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-purple-300 dark:hover:border-purple-600 transition-all"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-purple-600 bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded-md border border-purple-200 dark:border-purple-800">
                      {app.approvalCode}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                      app.status === 'approved' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' :
                      app.status === 'rejected' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300' :
                      'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                    }`}>
                      {app.status === 'approved' ? 'Đã duyệt' : app.status === 'rejected' ? 'Từ chối' : 'Chờ duyệt'}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    {app.title}
                  </h4>

                  {app.comment && (
                    <p className="text-xs text-slate-500 line-clamp-1 italic">
                      "{app.comment}"
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
                    <span className="flex items-center gap-1">
                      <User size={13} /> {requester?.name || app.requesterName || 'Nhân viên đề xuất'}
                    </span>
                    {app.amount > 0 && (
                      <span className="flex items-center gap-1 font-bold text-emerald-600">
                        <DollarSign size={13} /> {formatVND(app.amount)}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar size={13} /> {app.requestedAt ? new Date(app.requestedAt).toLocaleDateString('vi-VN') : 'Hôm nay'}
                    </span>
                  </div>
                </div>

                {isPending && (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {canUserDecide ? (
                      <>
                        <Button
                          size="sm"
                          disabled={actionLoadingId === app.id}
                          onClick={() => handleAction(app.id, 'rejected')}
                          className="bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-xs font-bold rounded-xl"
                        >
                          <XCircle size={14} className="mr-1 inline" /> Từ Chối
                        </Button>
                        <Button
                          size="sm"
                          disabled={actionLoadingId === app.id}
                          onClick={() => handleAction(app.id, 'approved')}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-500/20"
                        >
                          <CheckCircle2 size={14} className="mr-1 inline" /> Phê Duyệt
                        </Button>
                      </>
                    ) : (
                      <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold bg-amber-50 dark:bg-amber-950/40 px-3 py-1.5 rounded-xl border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                        <Clock size={13} /> Chờ Cấp Quản Lý Duyệt
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

    </div>
  );
};
