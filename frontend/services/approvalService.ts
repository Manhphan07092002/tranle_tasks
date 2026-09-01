import { ApprovalItem } from '../types';
import { apiFetch } from './api';

export const approvalService = {
  getApprovals: async (filters?: {
    approverId?: string;
    requestedBy?: string;
    departmentId?: string;
    status?: string;
    entityType?: string;
  }): Promise<ApprovalItem[]> => {
    const params = new URLSearchParams();
    if (filters?.approverId) params.append('approverId', filters.approverId);
    if (filters?.requestedBy) params.append('requestedBy', filters.requestedBy);
    if (filters?.departmentId) params.append('departmentId', filters.departmentId);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.entityType) params.append('entityType', filters.entityType);

    const res = await apiFetch(`/api/approvals?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch approvals');
    return res.json();
  },

  getApprovalById: async (id: string): Promise<ApprovalItem> => {
    const res = await apiFetch(`/api/approvals/${id}`);
    if (!res.ok) throw new Error('Failed to fetch approval detail');
    return res.json();
  },

  createApproval: async (data: Partial<ApprovalItem>): Promise<{ id: string; approvalCode: string }> => {
    const res = await apiFetch('/api/approvals', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create approval request');
    return res.json();
  },

  decideApproval: async (id: string, decision: 'approved' | 'rejected', comment?: string): Promise<void> => {
    const res = await apiFetch(`/api/approvals/${id}/decide`, {
      method: 'PUT',
      body: JSON.stringify({ decision, comment }),
    });
    if (!res.ok) throw new Error('Failed to decide approval');
  },
};
