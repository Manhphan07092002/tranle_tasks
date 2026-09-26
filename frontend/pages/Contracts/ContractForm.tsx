import React from 'react';
import { useContractForm } from './hooks/useContractForm';
import { useContractActions } from './hooks/useContractActions';
import { useContractProducts } from './hooks/useContractProducts';
import { useContractPicker } from './hooks/useContractPicker';
import { ContractHeader } from '../../components/Contracts/ContractHeader';
import { StatusPipeline } from '../../components/Contracts/StatusPipeline';
import { StatusBanners } from '../../components/Contracts/StatusBanners';
import { ManagerApprovalCard } from '../../components/Contracts/ManagerApprovalCard';
import { ContractBasicInfo } from '../../components/Contracts/ContractBasicInfo';
import { ContractDates } from '../../components/Contracts/ContractDates';
import { ContractInvoiceFields } from '../../components/Contracts/ContractInvoiceFields';
import { ContractProductsTable } from '../../components/Contracts/ContractProductsTable';
import { ContractActions } from '../../components/Contracts/ContractActions';
import { WarehousePickerModal } from './WarehousePickerModal';
import { InputContractPickerModal } from './InputContractPickerModal';
import { Task } from '../../types';
import { CHECKLIST_ITEMS } from './contractUtils';
import { InlineDocumentManager } from '../../components/InlineDocumentManager';
import { useData } from '../../contexts/DataContext';

interface ContractFormProps {
  form: any;
  setForm: React.Dispatch<React.SetStateAction<any>>;
  editingContract: any;
  tasks: Task[];
  contracts: any[];
  clients: { name: string }[];
  projects: any[];
  catalogProducts: any[];
  canApproveContract: boolean;
  newProduct: any;
  setNewProduct: React.Dispatch<React.SetStateAction<any>>;
  editingProductIdx: number | null;
  setEditingProductIdx: React.Dispatch<React.SetStateAction<number | null>>;
  uploading: boolean;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  removeAttachment: (idx: number) => void;
  handlePreTaxChange: (val: number) => void;
  handleVatChange: (val: number) => void;
  handleEditProduct: (idx: number) => void;
  handleRemoveProduct: (idx: number) => void;
  handleAddProduct: () => void;
  handlePrint: () => void;
  handleSave: () => void;
  setActiveTab: (tab: any) => void;
  readOnly?: boolean;
  saving?: boolean;
  showToast?: (type: 'success' | 'error' | 'info', message: string) => void;
  users?: any[];
  currentUser?: any | null;
}

export const ContractForm: React.FC<ContractFormProps> = ({
  form,
  setForm,
  editingContract,
  tasks,
  contracts,
  clients,
  projects,
  catalogProducts,
  canApproveContract,
  newProduct,
  setNewProduct,
  editingProductIdx,
  setEditingProductIdx,
  uploading,
  handleFileUpload,
  removeAttachment,
  handlePreTaxChange,
  handleVatChange,
  handleEditProduct,
  handleRemoveProduct,
  handleAddProduct,
  handlePrint,
  handleSave,
  setActiveTab,
  readOnly,
  saving,
  showToast,
  users,
  currentUser,
}) => {
  const { refreshData } = useData();
  const [showWarehousePicker, setShowWarehousePicker] = React.useState(false);
  const [showInputPicker, setShowInputPicker] = React.useState(false);
  const [confirmingReceipt, setConfirmingReceipt] = React.useState(false);

  // Custom numeric input handler
  const handleNumericInputChangeLocal = React.useCallback((
    e: React.ChangeEvent<HTMLInputElement>,
    onChange: (val: string) => void
  ) => {
    const input = e.target;
    const rawValue = input.value;
    const cleanValue = rawValue.replace(/\D/g, '');
    const formatted = cleanValue ? Number(cleanValue).toLocaleString('vi-VN') : '';

    const selectionStart = input.selectionStart || 0;
    let digitsBeforeCursor = 0;
    for (let i = 0; i < selectionStart; i++) {
      if (/\d/.test(rawValue[i])) digitsBeforeCursor++;
    }
    onChange(formatted);
  }, []);

  const cursorRef = React.useRef<{ element: HTMLInputElement; digitsBeforeCursor: number } | null>(null);

  React.useLayoutEffect(() => {
    if (cursorRef.current) {
      const { element, digitsBeforeCursor } = cursorRef.current;
      if (document.activeElement === element) {
        const value = element.value;
        let newPos = 0;
        let digitCount = 0;
        while (newPos < value.length && digitCount < digitsBeforeCursor) {
          if (/\d/.test(value[newPos])) digitCount++;
          newPos++;
        }
        element.setSelectionRange(newPos, newPos);
      }
      cursorRef.current = null;
    }
  });

  // Hooks
  const contractForm = useContractForm({
    form,
    setForm,
    editingContract,
    contracts,
    clients,
    projects,
    catalogProducts,
    currentUser,
    users: users ?? [],
    tasks,
  });

  const contractActions = useContractActions({
    form,
    setForm,
    currentUser,
    users: users ?? [],
    showToast,
    setActiveTab,
    refreshData,
  });

  const contractProducts = useContractProducts({
    form,
    setForm,
    editingProductIdx,
    setEditingProductIdx,
    newProduct,
    setNewProduct,
    catalogProducts,
    contracts,
    isFormLocked: contractForm.isFormLocked,
    isInput: contractForm.isInput,
    handlePreTaxChange,
    handleNumericInputChange: handleNumericInputChangeLocal,
    borderColor: contractForm.borderColor,
    ringColor: contractForm.ringColor,
    btnColor: contractForm.btnColor,
    handleAddProduct,
    handleEditProduct,
    handleRemoveProduct,
  });

  const contractPicker = useContractPicker({
    form,
    setForm,
    contracts,
    catalogProducts,
    isInput: contractForm.isInput,
    handlePreTaxChange,
    showToast,
  });

  const isFormLocked: boolean = contractForm.isFormLocked || readOnly || false;
  const canApproveThisContract = contractForm.canApproveThisContract;

  return (
    <div className="print-area bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden animate-in fade-in duration-300">
      <ContractHeader
        form={form}
        isFormLocked={isFormLocked}
        editingContract={editingContract}
        handlePrint={handlePrint}
        isInput={contractForm.isInput}
      />

      <StatusPipeline
        form={form}
        isInput={contractForm.isInput}
        currentStepIdx={contractForm.currentStepIdx}
        steps={contractForm.steps}
      />

      <StatusBanners
        form={form}
        canApproveThisContract={canApproveThisContract}
      />

      <ManagerApprovalCard
        form={form}
        canApproveThisContract={canApproveThisContract}
        users={users ?? []}
        actionLoading={contractActions.actionLoading}
        showRejectReason={contractActions.showRejectReason}
        setShowRejectReason={contractActions.setShowRejectReason}
        rejectReason={contractActions.rejectReason}
        setRejectReason={contractActions.setRejectReason}
        showCancelReason={contractActions.showCancelReason}
        setShowCancelReason={contractActions.setShowCancelReason}
        cancelReason={contractActions.cancelReason}
        setCancelReason={contractActions.setCancelReason}
        handleApprove={contractActions.handleApprove}
        handleReject={contractActions.handleReject}
        handleCancelPending={contractActions.handleCancelPending}
        isInput={contractForm.isInput}
      />

      <ContractBasicInfo
        form={form}
        setForm={setForm}
        contracts={contracts}
        clients={clients}
        projects={projects}
        canApproveThisContract={canApproveThisContract}
        isInput={contractForm.isInput}
        isFormLocked={isFormLocked}
      />

      <ContractDates
        form={form}
        setForm={setForm}
        isInput={contractForm.isInput}
        isFormLocked={isFormLocked}
      />

      <ContractInvoiceFields
        form={form}
        setForm={setForm}
        isInput={contractForm.isInput}
        isFormLocked={isFormLocked}
      />

      <ContractProductsTable
        form={form}
        isInput={contractForm.isInput}
        isFormLocked={isFormLocked}
        editingProductIdx={editingProductIdx}
        newProduct={newProduct}
        setNewProduct={setNewProduct}
        setEditingProductIdx={setEditingProductIdx}
        catalogProducts={catalogProducts}
        contracts={contracts}
        handleNumericInputChange={handleNumericInputChangeLocal}
        handleAddProduct={handleAddProduct}
        handleEditProduct={handleEditProduct}
        handleRemoveProduct={handleRemoveProduct}
        borderColor={contractForm.borderColor}
        ringColor={contractForm.ringColor}
        btnColor={contractForm.btnColor}
        showWarehousePicker={contractPicker.showWarehousePicker}
        setShowWarehousePicker={contractPicker.setShowWarehousePicker}
        showInputPicker={contractPicker.showInputPicker}
        setShowInputPicker={contractPicker.setShowInputPicker}
      />

      <ContractActions
        form={form}
        isInput={contractForm.isInput}
        isFormLocked={isFormLocked}
        editingContract={editingContract}
        saving={!!saving}
        handleSave={handleSave}
        handlePrint={handlePrint}
        setActiveTab={setActiveTab}
        btnColor={contractForm.btnColor}
        showToast={showToast}
      />

      <WarehousePickerModal
        isOpen={contractPicker.showWarehousePicker}
        onClose={() => contractPicker.setShowWarehousePicker(false)}
        products={catalogProducts}
        contracts={contracts}
        onSelect={contractPicker.handleSelectFromWarehouse}
      />

      <InputContractPickerModal
        isOpen={contractPicker.showInputPicker}
        onClose={() => contractPicker.setShowInputPicker(false)}
        contracts={contracts.filter((c: any) => c.contractType === 'input' && c.status !== 'cancelled')}
        onSelect={contractPicker.handleSelectFromInputContract}
      />
    </div>
  );
}

export default ContractForm;