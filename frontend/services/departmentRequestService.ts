import { DepartmentRequest } from '../types';
import { apiFetch } from './api';

export const departmentRequestService = {
  getRequests: async (filters?: {
    sourceDepartmentId?: string;
    targetDepartmentId?: string;
    requesterId?: string;
    assigneeId?: string;
    status?: string;
  }): Promise<DepartmentRequest[]> => {
    const params = new URLSearchParams();
    if (filters?.sourceDepartmentId) params.append('sourceDepartmentId', filters.sourceDepartmentId);
    if (filters?.targetDepartmentId) params.append('targetDepartmentId', filters.targetDepartmentId);
    if (filters?.requesterId) params.append('requesterId', filters.requesterId);
    if (filters?.assigneeId) params.append('assigneeId', filters.assigneeId);
    if (filters?.status) params.append('status', filters.status);

    const res = await apiFetch(`/api/department-requests?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch department requests');
    return res.json();
  },

  getRequestById: async (id: string): Promise<DepartmentRequest> => {
    const res = await apiFetch(`/api/department-requests/${id}`);
    if (!res.ok) throw new Error('Failed to fetch request detail');
    return res.json();
  },

  createRequest: async (data: Partial<DepartmentRequest>): Promise<{ id: string; requestNumber: string }> => {
    const res = await apiFetch('/api/department-requests', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create department request');
    return res.json();
  },

  updateRequest: async (id: string, data: Partial<DepartmentRequest>): Promise<void> => {
    const res = await apiFetch(`/api/department-requests/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update department request');
  },

  convertToTask: async (id: string): Promise<{ taskId: string }> => {
    const res = await apiFetch(`/api/department-requests/${id}/convert-to-task`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to convert request to task');
    return res.json();
  },

  deleteRequest: async (id: string): Promise<void> => {
    const res = await apiFetch(`/api/department-requests/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete department request');
  },
};
