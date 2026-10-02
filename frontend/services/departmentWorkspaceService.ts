import { apiFetch } from './api';

const API_BASE = '/api';

async function readWorkspaceJson(response: Response, url: string) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err: any = new Error(
      (data as any)?.error || `Không tải được dữ liệu (${response.status}) — ${url}`,
    );
    err.status = response.status;
    throw err;
  }
  return data;
}

export const departmentWorkspaceService = {
  getRecords: async (departmentId: string, type: string) => {
    const url = `${API_BASE}/department-workspace/${departmentId}/records?type=${type}`;
    const response = await apiFetch(url);
    const data = await readWorkspaceJson(response, url);
    // Backend trả mảng; nếu vì lý do nào đó không phải mảng thì chuẩn hóa về [] để UI .map an toàn.
    return Array.isArray(data) ? data : [];
  },
  getKpis: async (departmentId: string) => {
    const url = `${API_BASE}/department-workspace/${departmentId}/kpis`;
    const response = await apiFetch(url);
    return readWorkspaceJson(response, url);
  },
  createRecord: async (departmentId: string, type: string, data: any) => {
    const response = await apiFetch(`${API_BASE}/department-workspace/${departmentId}/records`, {
      method: 'POST',
      body: JSON.stringify({ type, data }),
    });
    return response.json();
  },
  updateRecord: async (departmentId: string, id: string, type: string, data: any) => {
    const response = await apiFetch(`${API_BASE}/department-workspace/${departmentId}/records/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ type, data }),
    });
    return response.json();
  },
  deleteRecord: async (departmentId: string, id: string, type: string) => {
    const response = await apiFetch(`${API_BASE}/department-workspace/${departmentId}/records/${id}?type=${type}`, {
      method: 'DELETE'
    });
    return response.json();
  },

  // Cross-Department Automations
  convertLeadToProject: async (payload: {
    leadId?: string;
    projectName: string;
    capacity?: string;
    value?: number;
    client?: string;
    notes?: string;
  }) => {
    const response = await apiFetch(`${API_BASE}/department-workspace/automation/convert-lead-to-project`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return response.json();
  },

  convertDesignToPr: async (payload: {
    designId?: string;
    projectName: string;
    items?: string;
    priority?: string;
  }) => {
    const response = await apiFetch(`${API_BASE}/department-workspace/automation/design-to-pr`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return response.json();
  },

  convertMilestoneToAr: async (payload: {
    milestoneId?: string;
    projectId?: string;
    projectName: string;
    milestoneTitle: string;
    amount: number | string;
    customer?: string;
    dueDate?: string;
  }) => {
    const response = await apiFetch(`${API_BASE}/department-workspace/automation/milestone-to-ar`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return response.json();
  },

  prToPo: async (prId: string) => {
    const response = await apiFetch(`${API_BASE}/department-workspace/automation/pr-to-po`, {
      method: 'POST',
      body: JSON.stringify({ prId }),
    });
    return response.json();
  },

  poToInbound: async (poId: string) => {
    const response = await apiFetch(`${API_BASE}/department-workspace/automation/po-to-inbound`, {
      method: 'POST',
      body: JSON.stringify({ poId }),
    });
    return response.json();
  },

  codToOm: async (projectId: string) => {
    const response = await apiFetch(`${API_BASE}/department-workspace/automation/cod-to-om`, {
      method: 'POST',
      body: JSON.stringify({ projectId }),
    });
    return response.json();
  },

  requestApproval: async (payload: {
    entityType: string;
    entityId: string;
    title: string;
    amount?: number;
    requestedBy?: string;
    departmentId?: string;
    reason?: string;
  }) => {
    const response = await apiFetch(`${API_BASE}/department-workspace/automation/request-approval`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return response.json();
  }
};
