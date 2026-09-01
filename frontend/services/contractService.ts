import { apiFetch } from './api';

const API_URL = '/api/contracts';

export interface ContractProduct {
  name: string;
  unit: string;
  quantity: number;
  origin: string;
  unitPrice: number;
  total: number;
  vatRate?: number;
  exportedQuantity?: number;
  invoicedQuantity?: number;
  sourceProductId?: string; // ID of the product in warehouse (products table)
  sourceProductName?: string; // Name of the product in warehouse
  isBuyingPriceFallback?: boolean; // Warns that the unit price fell back to buying price
  importCode?: string;
}

export type ContractType = 'input' | 'output';

export interface DocumentChecklist {
  hoaDon?: boolean;        // Hóa đơn
  bbbg?: boolean;          // Biên bản bàn giao
  bbnt?: boolean;          // Biên bản nghiệm thu
  deNghiTT?: boolean;      // Đề nghị thanh toán
  thanhLy?: boolean;       // Thanh lý hợp đồng
  camKetBH?: boolean;      // Cam kết bảo hành
  coCq?: boolean;          // CO-CQ
  hopDongGoc?: boolean;    // Hợp đồng gốc
  phuluc?: boolean;        // Phụ lục HĐ
}

export interface ContractPayment {
  id: string;
  paymentDate: string;
  amount: number;
  method: 'cash' | 'transfer' | 'other';
  note?: string;
}

export interface Contract {
  id: string;
  contractNumber: string;
  clientName: string;
  contractName: string; // Tên dự án/hợp đồng chung
  products?: ContractProduct[];
  preTaxValue: number; // Tổng giá trị trước thuế
  vatRate: number; // % thuế VAT (ví dụ: 8, 10)
  postTaxValue: number; // Tổng giá trị sau thuế
  invoiceDate?: string;
  invoiceNumber?: string;
  department: string;
  departmentId?: string;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
  isDeleted?: number;
  status?: string; // 'draft', 'pending', 'in_progress', 'completed', 'cancelled'
  attachments?: string[];
  paidAmount?: number;
  projectId?: string;
  contractType?: ContractType;
  supplierName?: string;
  documentChecklist?: DocumentChecklist;
  signedDate?: string;
  startDate?: string;
  endDate?: string;
  warrantyMonths?: number;
  payments?: ContractPayment[];
  docSentDate?: string;
  docReceivedDate?: string;
  docAccountantDate?: string;
  docReceiver?: string;
  docAccountantUserId?: string;
  docAccountantStatus?: string;
  approvalFeedback?: string;
  linkedInputContractIds?: string[];
}

export const getContracts = async (): Promise<Contract[]> => {
  const res = await apiFetch(API_URL);
  if (!res.ok) throw new Error('Failed to fetch contracts');
  return res.json();
};

export const saveContract = async (contract: Contract & { _isNew?: boolean }): Promise<void> => {
  const isNew = contract._isNew !== undefined ? contract._isNew : false;
  const res = await apiFetch(isNew ? API_URL : `${API_URL}/${contract.id}`, {
    method: isNew ? 'POST' : 'PUT',
    body: JSON.stringify(contract),
  });
  if (!res.ok) {
    let errMsg = 'Failed to save contract';
    try {
      const errText = await res.text();
      try {
        const parsed = JSON.parse(errText);
        errMsg = parsed.error || parsed.detail || errText;
      } catch (e) {
        if (errText) errMsg = errText;
      }
    } catch (e) {}
    console.error('Failed to save contract details:', errMsg);
    throw new Error(errMsg);
  }
};

export const deleteContract = async (id: string): Promise<void> => {
  const res = await apiFetch(`${API_URL}/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete contract');
};

export const confirmContractReceipt = async (id: string): Promise<{ success: boolean; docAccountantDate: string }> => {
  const res = await apiFetch(`${API_URL}/${id}/confirm-receipt`, {
    method: 'PUT',
  });
  if (!res.ok) {
    let errMsg = 'Failed to confirm contract receipt';
    try {
      const errText = await res.text();
      try {
        const parsed = JSON.parse(errText);
        errMsg = parsed.error || parsed.detail || errText;
      } catch (e) {
        if (errText) errMsg = errText;
      }
    } catch (e) {}
    throw new Error(errMsg);
  }
  return res.json();
};

export const approveContract = async (id: string): Promise<{ success: boolean }> => {
  const res = await apiFetch(`${API_URL}/${id}/approve`, {
    method: 'PUT',
  });
  if (!res.ok) {
    let errMsg = 'Failed to approve contract';
    try {
      const errText = await res.text();
      try {
        const parsed = JSON.parse(errText);
        errMsg = parsed.error || parsed.detail || errText;
      } catch (e) {
        if (errText) errMsg = errText;
      }
    } catch (e) {}
    throw new Error(errMsg);
  }
  return res.json();
};

export const rejectContract = async (id: string, feedback: string): Promise<{ success: boolean }> => {
  const res = await apiFetch(`${API_URL}/${id}/reject`, {
    method: 'PUT',
    body: JSON.stringify({ feedback }),
  });
  if (!res.ok) {
    let errMsg = 'Failed to reject contract';
    try {
      const errText = await res.text();
      try {
        const parsed = JSON.parse(errText);
        errMsg = parsed.error || parsed.detail || errText;
      } catch (e) {
        if (errText) errMsg = errText;
      }
    } catch (e) {}
    throw new Error(errMsg);
  }
  return res.json();
};

export const cancelPendingContract = async (id: string, feedback: string): Promise<{ success: boolean }> => {
  const res = await apiFetch(`${API_URL}/${id}/cancel-pending`, {
    method: 'PUT',
    body: JSON.stringify({ feedback }),
  });
  if (!res.ok) {
    let errMsg = 'Failed to cancel contract';
    try {
      const errText = await res.text();
      try {
        const parsed = JSON.parse(errText);
        errMsg = parsed.error || parsed.detail || errText;
      } catch (e) {
        if (errText) errMsg = errText;
      }
    } catch (e) {}
    throw new Error(errMsg);
  }
  return res.json();
};

