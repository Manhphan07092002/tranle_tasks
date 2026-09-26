import { useState, useCallback } from 'react';
import { useData } from '../../../contexts/DataContext';
import { Contract } from '../../../types';
import { approveContract, rejectContract, cancelPendingContract, confirmContractReceipt } from '../../../services/contractService';

export function useContractActions({
  form,
  setForm,
  currentUser,
  users,
  showToast,
  setActiveTab,
  refreshData,
}: {
  form: any;
  setForm: React.Dispatch<React.SetStateAction<any>>;
  currentUser: any;
  users: any[];
  showToast?: (type: 'success' | 'error' | 'info', message: string) => void;
  setActiveTab: (tab: any) => void;
  refreshData: () => void;
}) {
  const [actionLoading, setActionLoading] = useState(false);
  const [showRejectReason, setShowRejectReason] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showCancelReason, setShowCancelReason] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [confirmingReceipt, setConfirmingReceipt] = useState(false);

  const canApproveThisContract = useCallback(() => {
    if (!currentUser) return false;
    const perms = currentUser.permissions || [];
    const userRole = currentUser.role || '';
    const isSystemAdmin = perms.includes('admin_panel') || perms.includes('director_feedback') || userRole === 'Admin' || userRole === 'Director' || userRole === 'Giám đốc';
    const isDeptManager = (userRole === 'Manager' || userRole.startsWith('Trưởng') || userRole.includes('Trưởng')) && (currentUser.departmentId === form.departmentId || (currentUser.department && currentUser.department === form.department));
    return isSystemAdmin || isDeptManager;
  }, [currentUser, form.department]);

  const handleApprove = useCallback(async () => {
    if (!form.id) return;
    try {
      setActionLoading(true);
      const res = await approveContract(form.id);
      if (res.success) {
        setForm((f: any) => ({ ...f, status: 'in_progress', approvalFeedback: null }));
        showToast?.('success', 'Phê duyệt hợp đồng thành công!');
      }
    } catch (err: any) {
      showToast?.('error', err.message || 'Lỗi khi phê duyệt hợp đồng');
    } finally {
      setActionLoading(false);
    }
  }, [form.id, setForm, showToast]);

  const handleReject = useCallback(async () => {
    if (!form.id) return;
    if (!rejectReason.trim()) {
      showToast?.('error', 'Vui lòng nhập lý do từ chối');
      return;
    }
    try {
      setActionLoading(true);
      const res = await rejectContract(form.id, rejectReason.trim());
      if (res.success) {
        setForm((f: any) => ({ ...f, status: 'draft', approvalFeedback: rejectReason.trim() }));
        setShowRejectReason(false);
        setRejectReason('');
        showToast?.('success', 'Đã từ chối duyệt hợp đồng và chuyển về Bản nháp!');
      }
    } catch (err: any) {
      showToast?.('error', err.message || 'Lỗi khi từ chối phê duyệt');
    } finally {
      setActionLoading(false);
    }
  }, [form.id, rejectReason, setForm, setShowRejectReason, setRejectReason, showToast]);

  const handleCancelPending = useCallback(async () => {
    if (!form.id) return;
    if (!cancelReason.trim()) {
      showToast?.('error', 'Vui lòng nhập lý do hủy hợp đồng');
      return;
    }
    try {
      setActionLoading(true);
      const res = await cancelPendingContract(form.id, cancelReason.trim());
      if (res.success) {
        setForm((f: any) => ({ ...f, status: 'cancelled', approvalFeedback: cancelReason.trim() }));
        setShowCancelReason(false);
        setCancelReason('');
        showToast?.('success', 'Đã hủy hợp đồng thành công!');
      }
    } catch (err: any) {
      showToast?.('error', err.message || 'Lỗi khi hủy hợp đồng');
    } finally {
      setActionLoading(false);
    }
  }, [form.id, cancelReason, setForm, setShowCancelReason, setCancelReason, showToast]);

  const handleConfirmReceipt = useCallback(async () => {
    if (!form.id) return;
    try {
      setConfirmingReceipt(true);
      const res = await confirmContractReceipt(form.id);
      if (res.success) {
        setForm((f: any) => ({ ...f, docAccountantStatus: 'confirmed', docAccountantDate: res.docAccountantDate, status: 'completed' }));
        await refreshData();
        showToast?.('success', 'Đã xác nhận nhận hồ sơ & hoàn thành hợp đồng!');
        setActiveTab('history');
      }
    } catch (err: any) {
      showToast?.('error', err.message || 'Lỗi khi xác nhận nhận hồ sơ');
    } finally {
      setConfirmingReceipt(false);
    }
  }, [form.id, setForm, refreshData, showToast, setActiveTab]);

  return {
    actionLoading,
    showRejectReason, setShowRejectReason,
    rejectReason, setRejectReason,
    showCancelReason, setShowCancelReason,
    cancelReason, setCancelReason,
    confirmingReceipt,
    canApproveThisContract: canApproveThisContract(),
    handleApprove,
    handleReject,
    handleCancelPending,
    handleConfirmReceipt,
  };
}