import { useState, useMemo, useCallback, useEffect } from 'react';
import { useData } from '../../../contexts/DataContext';
import { useAuth } from '../../../contexts/AuthContext';
import { Contract, ContractProduct, ContractType, DocumentChecklist } from '../../../services/contractService';
import { CHECKLIST_ITEMS } from '../contractUtils';

export function useContractForm({
  form,
  setForm,
  editingContract,
  contracts,
  clients,
  projects,
  catalogProducts,
  currentUser,
  users,
  tasks,
}: {
  form: any;
  setForm: React.Dispatch<React.SetStateAction<any>>;
  editingContract: Contract | null;
  contracts: Contract[];
  clients: { name: string }[];
  projects: any[];
  catalogProducts: any[];
  currentUser: any;
  users: any[];
  tasks: any[];
}) {
  const { refreshData } = useData();
  const { user } = useAuth();

  // Form locked state
  const isFormLocked = useMemo(() => {
    return form.docAccountantStatus === 'confirmed';
  }, [form.docAccountantStatus]);

  // Auto-update checklist when invoice number changes
  useEffect(() => {
    if (form.invoiceNumber && form.invoiceNumber.trim()) {
      if (!form.documentChecklist?.hoaDon) {
        setForm((f: any) => ({
          ...f,
          documentChecklist: {
            ...(f.documentChecklist || {}),
            hoaDon: true
          }
        }));
      }
    } else {
      if (form.documentChecklist?.hoaDon) {
        setForm((f: any) => ({
          ...f,
          documentChecklist: {
            ...(f.documentChecklist || {}),
            hoaDon: false
          }
        }));
      }
    }
  }, [form.invoiceNumber, setForm]);

  // Input vs Output type
  const isInput = form.contractType === 'input';

  // Current user permissions for approval
  const canApproveThisContract = useMemo((): boolean => {
    if (!currentUser) return false;
    const perms = currentUser.permissions || [];
    const userRole = currentUser.role || '';
    const isSystemAdmin = perms.includes('admin_panel') || perms.includes('director_feedback') || userRole === 'Admin' || userRole === 'Director' || userRole === 'Giám đốc';
    const isDeptManager = (userRole === 'Manager' || userRole.startsWith('Trưởng') || userRole.includes('Trưởng')) && (currentUser.departmentId === form.departmentId || (currentUser.department && currentUser.department === form.department));
    return isSystemAdmin || isDeptManager;
  }, [currentUser, form.department]);

  // Checklist completion
  const isChecklistComplete = useMemo(() => {
    const cl = form.documentChecklist || {};
    return CHECKLIST_ITEMS.length > 0 && CHECKLIST_ITEMS.every(item => cl[item.key]);
  }, [form.documentChecklist]);

  const isHandoverDisabled = isFormLocked || !isChecklistComplete;

  // Status steps pipeline
  const steps = useMemo(() => [
    { key: 'draft', label: 'Bản nháp', desc: 'Đang soạn thảo' },
    { key: 'pending', label: 'Chờ duyệt', desc: 'Đợi phê duyệt' },
    { key: 'in_progress', label: 'Đang thực hiện', desc: 'Đang triển khai' },
    { key: 'completed', label: 'Hoàn thành', desc: 'Đã nghiệm thu' },
  ], []);

  const currentStepIdx = useMemo(() => {
    const status = form.status || 'draft';
    if (status === 'draft') return 0;
    if (status === 'pending') return 1;
    if (status === 'in_progress') return 2;
    if (status === 'completed') return 3;
    return -1;
  }, [form.status]);

  // Task progress for editing contract
  const taskProgress = useMemo(() => {
    if (!editingContract || !tasks) return { total: 0, done: 0, percent: 0, items: [] };
    const contractTasks = tasks.filter(t => t.contractId === editingContract.id);
    const done = contractTasks.filter(t => t.status === 'Done').length;
    const total = contractTasks.length;
    return {
      total,
      done,
      percent: total > 0 ? Math.round((done / total) * 100) : 0,
      items: contractTasks
    };
  }, [editingContract, tasks]);

  // Accountant users for handover
  const accountantUsers = useMemo(() => {
    if (!users) return [];
    const filtered = users.filter(u => {
      const dept = (u.department || '').toLowerCase();
      const role = (u.role || '').toLowerCase();
      return dept.includes('finance') || dept.includes('kế toán') || dept.includes('ke toan') || role.includes('accountant') || role.includes('kế toán');
    });
    return filtered.length > 0 ? filtered : users;
  }, [users]);

  return {
    isFormLocked,
    isInput,
    canApproveThisContract,
    isChecklistComplete,
    isHandoverDisabled,
    steps,
    currentStepIdx,
    taskProgress,
    accountantUsers,
    ringColor: isInput ? 'focus:ring-blue-500' : 'focus:ring-emerald-500',
    borderColor: isInput ? 'border-blue-200' : 'border-emerald-200',
    btnColor: isInput ? 'bg-blue-500 hover:bg-blue-600' : 'bg-emerald-500 hover:bg-emerald-600',
    textColor: isInput ? 'text-blue-600' : 'text-emerald-600',
  };
}