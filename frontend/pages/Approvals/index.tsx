import React, { useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { ApprovalItem } from '../../types';
import {
  ShieldCheck, CheckCircle2, XCircle, Clock, FileText,
  DollarSign, ArrowUpRight, Search, Filter, MessageSquare, AlertCircle,
  Building2, User, Check, X, Tag, Plus, ShoppingCart, Cpu, Scale,
  FileCheck, Layers, Sparkles, Send, Briefcase
} from 'lucide-react';
import { Button } from '../../components/UI';

export default function ApprovalsPage() {
  const { user, isAdmin, isDirector, isManager } = useAuth();
  const { approvals, decideApproval, saveApproval, departments, users } = useData();

  const [activeTab, setActiveTab] = useState<'pending' | 'history' | 'my_requests'>('pending');
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Decision Modal
  const [decisionModal, setDecisionModal] = useState<{
    isOpen: boolean;
    item: ApprovalItem | null;
    decision: 'approved' | 'rejected';
    comment: string;
  }>({
    isOpen: false,
    item: null,
    decision: 'approved',
    comment: '',
  });

  // Create Approval Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newApproval, setNewApproval] = useState<Partial<ApprovalItem>>({
    entityType: 'quotation',
    title: '',
    amount: 0,
    approverId: '',
    departmentId: user?.departmentId || '',
    comment: '',
  });
  const [amountInputStr, setAmountInputStr] = useState('');

  const formatVND = (num?: number) => {
    if (!num) return '0 ₫';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
  };

  // Filtered Items
  const pendingApprovals = approvals.filter(a => a.status === 'pending');
  const historyApprovals = approvals.filter(a => a.status === 'approved' || a.status === 'rejected');
  const myRequests = approvals.filter(a => a.requestedBy === user?.id);

  const getFilteredList = () => {
    let list: ApprovalItem[] = [];
    if (activeTab === 'pending') list = pendingApprovals;
    else if (activeTab === 'history') list = historyApprovals;
    else list = myRequests;

    return list.filter(item => {
      if (filterType !== 'all' && item.entityType !== filterType) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchCode = item.approvalCode.toLowerCase().includes(q);
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchReq = item.requesterName?.toLowerCase().includes(q);
        if (!matchCode && !matchTitle && !matchReq) return false;
      }
      return true;
    });
  };

  const currentList = getFilteredList();

  const handleOpenDecision = (item: ApprovalItem, decision: 'approved' | 'rejected') => {
    setDecisionModal({
      isOpen: true,
      item,
      decision,
      comment: '',
    });
  };

  const handleConfirmDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!decisionModal.item) return;
    try {
      await decideApproval(decisionModal.item.id, decisionModal.decision, decisionModal.comment);
      setDecisionModal({ isOpen: false, item: null, decision: 'approved', comment: '' });
    } catch (err: any) {
      alert('Lỗi khi duyệt phiếu: ' + err.message);
    }
  };

  const handleCreateApproval = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newApproval.title || !newApproval.approverId) {
      alert('Vui lòng nhập đầy đủ tiêu đề và chọn người phê duyệt.');
      return;
    }

    try {
      const code = `APR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      await saveApproval({
        ...newApproval,
        approvalCode: code,
        requestedBy: user?.id,
        status: 'pending',
        requestedAt: new Date().toISOString(),
      });

      setCreateModalOpen(false);
      setNewApproval({
        entityType: 'quotation',
        title: '',
        amount: 0,
        approverId: '',
        departmentId: user?.departmentId || '',
        comment: '',
      });
      setAmountInputStr('');
      setActiveTab('my_requests');
    } catch (err: any) {
      alert('Lỗi tạo tờ trình: ' + err.message);
    }
  };

  const totalPendingAmount = pendingApprovals.reduce((sum, item) => sum + (item.amount || 0), 0);

  const getEntityBadge = (type: string) => {
    switch (type) {
      case 'purchase_order':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300 border border-orange-200 dark:border-orange-800">
            <ShoppingCart size={12} /> Đơn Hàng PO
          </span>
        );
      case 'design':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
            <Cpu size={12} /> Thiết Kế Solar
          </span>
        );
      case 'payment':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <DollarSign size={12} /> Đề Nghị Chi Tiền
          </span>
        );
      case 'contract':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            <Scale size={12} /> Hợp Đồng EPC
          </span>
        );
      case 'quotation':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <FileText size={12} /> Báo Giá / Tờ Trình
          </span>
        );
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto space-y-6 animate-in fade-in duration-300 pb-12">
      {/* ── HEADER BANNER ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-amber-950 p-6 rounded-2xl text-white shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-md">
            <ShieldCheck size={32} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white flex items-center gap-2">
              Trung Tâm Phê Duyệt Hợp Nhất
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-medium">
                {pendingApprovals.length} đang chờ
              </span>
            </h1>
            <p className="text-slate-300 text-xs mt-1">
              Phê duyệt báo giá solar, hợp đồng EPC, đơn đặt hàng mua sắm PO và hồ sơ kỹ thuật Tran Le Electricity.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-right">
            <div className="text-[10px] font-bold text-amber-300 uppercase tracking-wider">Tổng Tiền Đang Chờ Duyệt</div>
            <div className="text-base font-black text-white">{formatVND(totalPendingAmount)}</div>
          </div>

          <Button
            onClick={() => setCreateModalOpen(true)}
            className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm shadow-lg shadow-amber-600/30"
          >
            <Plus size={16} className="mr-1.5" /> Tạo Tờ Trình Mới
          </Button>
        </div>
      </div>

      {/* ── KPI METRICS CARDS ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 text-amber-600 rounded-xl">
            <Clock size={22} />
          </div>
          <div>
            <div className="text-2xl font-black text-gray-900 dark:text-white">{pendingApprovals.length}</div>
            <div className="text-xs text-gray-500 font-medium">Phiếu Chờ Duyệt (Pending)</div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 rounded-xl">
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div className="text-2xl font-black text-gray-900 dark:text-white">
              {approvals.filter(a => a.status === 'approved').length}
            </div>
            <div className="text-xs text-gray-500 font-medium">Đã Phê Duyệt (Approved)</div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-600 rounded-xl">
            <XCircle size={22} />
          </div>
          <div>
            <div className="text-2xl font-black text-gray-900 dark:text-white">
              {approvals.filter(a => a.status === 'rejected').length}
            </div>
            <div className="text-xs text-gray-500 font-medium">Bị Từ Chối (Rejected)</div>
          </div>
        </div>
      </div>

      {/* ── TABS & CONTROLS ──────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 dark:border-slate-700 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'pending'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700'
            }`}
          >
            Chờ Tôi Duyệt ({pendingApprovals.length})
          </button>

          <button
            onClick={() => setActiveTab('my_requests')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'my_requests'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700'
            }`}
          >
            Tôi Đã Trình ({myRequests.length})
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'history'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700'
            }`}
          >
            Lịch Sử Đã Xử Lý ({historyApprovals.length})
          </button>
        </div>

        {/* Filter by Entity Type */}
        <div className="flex items-center gap-2">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-1.5 text-xs border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="all">Tất cả loại thực thể</option>
            <option value="quotation">Báo giá / Dự toán</option>
            <option value="purchase_order">Đơn đặt hàng PO</option>
            <option value="design">Hồ sơ thiết kế PVSyst</option>
            <option value="payment">Đề nghị thanh toán</option>
            <option value="contract">Hợp đồng EPC</option>
          </select>

          <div className="relative">
            <Search className="absolute left-2.5 top-2 text-gray-400" size={13} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm mã / tiêu đề..."
              className="pl-8 pr-3 py-1.5 text-xs border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>
      </div>

      {/* ── APPROVALS LIST ───────────────────────────────────────────────────── */}
      <div className="space-y-3">
        {currentList.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-gray-300 dark:border-slate-700">
            <CheckCircle2 size={40} className="mx-auto text-gray-300 dark:text-slate-600 mb-2" />
            <h3 className="text-sm font-bold text-gray-700 dark:text-slate-300">Không có phiếu phê duyệt nào trong danh sách</h3>
            <p className="text-xs text-gray-400 mt-1">Tất cả các phiếu liên quan đã được xử lý.</p>
            <Button
              size="sm"
              onClick={() => setCreateModalOpen(true)}
              className="mt-4 bg-amber-600 text-white text-xs"
            >
              <Plus size={14} className="mr-1" /> Tạo Tờ Trình Mới
            </Button>
          </div>
        ) : (
          currentList.map(item => {
            const isPending = item.status === 'pending';
            return (
              <div
                key={item.id}
                className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm space-y-3 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:shadow-md transition-shadow"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-200/50">
                      {item.approvalCode}
                    </span>

                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                      item.status === 'approved'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : item.status === 'rejected'
                        ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                    }`}>
                      {item.status === 'approved' ? 'Đã duyệt' : item.status === 'rejected' ? 'Từ chối' : 'Chờ duyệt'}
                    </span>

                    {getEntityBadge(item.entityType)}

                    {item.departmentName && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-medium">
                        {item.departmentName}
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-gray-900 dark:text-white">
                    {item.title}
                  </h3>

                  {item.comment && (
                    <div className="p-2.5 bg-gray-50 dark:bg-slate-700/50 rounded-xl text-xs text-gray-600 dark:text-slate-300 flex items-start gap-2 border border-slate-100 dark:border-slate-700">
                      <MessageSquare size={13} className="text-amber-500 mt-0.5 flex-shrink-0" />
                      <span className="whitespace-pre-line">{item.comment}</span>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 pt-1">
                    <div className="flex items-center gap-1.5">
                      <img src={item.requesterAvatar || 'https://via.placeholder.com/24'} alt={item.requesterName} className="w-5 h-5 rounded-full object-cover" />
                      <span>Trình bởi: <strong className="text-gray-800 dark:text-slate-200">{item.requesterName || 'Nhân viên'}</strong></span>
                    </div>

                    <div className="flex items-center gap-1">
                      <Clock size={13} />
                      <span>{new Date(item.requestedAt).toLocaleDateString('vi-VN')}</span>
                    </div>
                  </div>
                </div>

                {/* Right side: Amount & Action Buttons */}
                <div className="flex flex-col md:items-end gap-3 flex-shrink-0">
                  {item.amount && item.amount > 0 ? (
                    <div className="text-right">
                      <div className="text-[11px] font-semibold text-gray-400 uppercase">Giá trị đề xuất</div>
                      <div className="text-base font-black text-emerald-600 dark:text-emerald-400">{formatVND(item.amount)}</div>
                    </div>
                  ) : null}

                  {/* Actions if Pending */}
                  {isPending && (() => {
                    const canUserDecide = 
                      isAdmin || 
                      isDirector || 
                      user?.id === item.approverId || 
                      (isManager && (item.departmentId === user?.departmentId || item.departmentId === user?.department));

                    return canUserDecide ? (
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleOpenDecision(item, 'approved')}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs flex items-center gap-1 shadow-sm font-semibold rounded-xl"
                        >
                          <Check size={14} />
                          <span>Phê Duyệt</span>
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenDecision(item, 'rejected')}
                          className="border border-rose-200 dark:border-rose-800 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs flex items-center gap-1 font-semibold rounded-xl"
                        >
                          <X size={14} />
                          <span>Từ Chối</span>
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold bg-amber-50 dark:bg-amber-950/40 px-3 py-1.5 rounded-xl border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                        <Clock size={13} /> Chờ Cấp Quản Lý Duyệt
                      </span>
                    );
                  })()}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── CREATE APPROVAL MODAL ────────────────────────────────────────────── */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-200 dark:border-slate-700 animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/80">
              <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Send className="text-amber-600" size={18} />
                Lập Tờ Trình Phê Duyệt Mới
              </h3>
              <button onClick={() => setCreateModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <form onSubmit={handleCreateApproval} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 dark:text-slate-300 mb-1">
                    Loại thực thể / Mục đích *
                  </label>
                  <select
                    value={newApproval.entityType || 'quotation'}
                    onChange={(e) => setNewApproval({ ...newApproval, entityType: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                  >
                    <option value="quotation">Báo giá / Dự toán Solar</option>
                    <option value="purchase_order">Đơn đặt hàng mua sắm PO (AIKO/SAJ)</option>
                    <option value="design">Hồ sơ thiết kế PVSyst & AutoCAD</option>
                    <option value="payment">Đề nghị tạm ứng / Giải ngân</option>
                    <option value="contract">Thẩm định & Ký hợp đồng EPC</option>
                    <option value="general">Tờ trình đề xuất khác</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 dark:text-slate-300 mb-1">
                    Phòng ban phát hành *
                  </label>
                  <select
                    value={newApproval.departmentId || ''}
                    onChange={(e) => setNewApproval({ ...newApproval, departmentId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                  >
                    <option value="">-- Chọn Phòng Ban --</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 dark:text-slate-300 mb-1">
                  Tiêu đề tờ trình *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Trình phê duyệt PO nhập 500kWp Pin AIKO 650Wp N-Type ABC"
                  value={newApproval.title || ''}
                  onChange={(e) => setNewApproval({ ...newApproval, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 dark:text-slate-300 mb-1">
                    Giá trị đề xuất (VNĐ)
                  </label>
                  <input
                    type="text"
                    placeholder="0"
                    value={amountInputStr}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, '');
                      const num = Number(raw);
                      setAmountInputStr(num > 0 ? num.toLocaleString('vi-VN') : '');
                      setNewApproval({ ...newApproval, amount: num });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 dark:text-slate-300 mb-1">
                    Người phê duyệt *
                  </label>
                  <select
                    required
                    value={newApproval.approverId || ''}
                    onChange={(e) => setNewApproval({ ...newApproval, approverId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white font-medium"
                  >
                    <option value="">-- Chọn Cấp Phê Duyệt --</option>
                    {users
                      .filter(u => u.id !== user?.id)
                      .map(u => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.role} - {u.department})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 dark:text-slate-300 mb-1">
                  Nội dung chi tiết / Căn cứ đề xuất
                </label>
                <textarea
                  rows={3}
                  value={newApproval.comment || ''}
                  onChange={(e) => setNewApproval({ ...newApproval, comment: e.target.value })}
                  placeholder="Nêu rõ mục đích, căn cứ kỹ thuật hoặc tiến độ hợp đồng liên quan..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100 dark:border-slate-700">
                <Button type="button" variant="ghost" onClick={() => setCreateModalOpen(false)}>
                  Hủy
                </Button>
                <Button type="submit" className="bg-amber-600 hover:bg-amber-700 text-white font-bold">
                  Gửi Tờ Trình
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── DECISION MODAL ───────────────────────────────────────────────────── */}
      {decisionModal.isOpen && decisionModal.item && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200 dark:border-slate-700 animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/80">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                {decisionModal.decision === 'approved' ? (
                  <><CheckCircle2 className="text-emerald-600" size={18} /> Phê Duyệt Phiếu Yêu Cầu</>
                ) : (
                  <><XCircle className="text-rose-600" size={18} /> Từ Chối Phiếu Yêu Cầu</>
                )}
              </h3>
              <button onClick={() => setDecisionModal(prev => ({ ...prev, isOpen: false }))} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <form onSubmit={handleConfirmDecision} className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-gray-50 dark:bg-slate-700/50 rounded-xl space-y-1">
                <div className="font-mono font-bold text-amber-700 dark:text-amber-300">{decisionModal.item.approvalCode}</div>
                <div className="font-bold text-gray-900 dark:text-white">{decisionModal.item.title}</div>
                {decisionModal.item.amount ? (
                  <div className="text-emerald-600 font-black">{formatVND(decisionModal.item.amount)}</div>
                ) : null}
              </div>

              <div>
                <label className="block font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Ý Kiến Chỉ Đạo / Lý Do {decisionModal.decision === 'rejected' && '*'}
                </label>
                <textarea
                  rows={3}
                  required={decisionModal.decision === 'rejected'}
                  value={decisionModal.comment}
                  onChange={(e) => setDecisionModal(prev => ({ ...prev, comment: e.target.value }))}
                  placeholder={
                    decisionModal.decision === 'approved'
                      ? 'Nhập ý kiến chỉ đạo thực thi (nếu có)...'
                      : 'Nêu rõ lý do từ chối để bộ phận điều chỉnh...'
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-slate-700">
                <Button type="button" variant="ghost" onClick={() => setDecisionModal(prev => ({ ...prev, isOpen: false }))}>
                  Hủy
                </Button>
                <Button
                  type="submit"
                  className={decisionModal.decision === 'approved' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-rose-600 hover:bg-rose-700 text-white'}
                >
                  Xác Nhận {decisionModal.decision === 'approved' ? 'Phê Duyệt' : 'Từ Chối'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
