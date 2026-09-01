import { TaskTemplate } from '../types';
import { apiFetch } from './api';

export const taskTemplateService = {
  getTemplates: async (departmentId?: string, taskType?: string): Promise<TaskTemplate[]> => {
    const params = new URLSearchParams();
    if (departmentId) params.append('departmentId', departmentId);
    if (taskType) params.append('taskType', taskType);

    const res = await apiFetch(`/api/task-templates?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch task templates');
    return res.json();
  },

  getTemplateById: async (id: string): Promise<TaskTemplate> => {
    const res = await apiFetch(`/api/task-templates/${id}`);
    if (!res.ok) throw new Error('Failed to fetch template detail');
    return res.json();
  },

  createTemplate: async (data: Partial<TaskTemplate>): Promise<{ id: string; code: string }> => {
    const res = await apiFetch('/api/task-templates', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create task template');
    return res.json();
  },

  instantiateTemplate: async (id: string, options?: {
    userId?: string;
    projectId?: string;
    contractId?: string;
    customTitle?: string;
    dueDate?: string;
  }): Promise<{ taskId: string }> => {
    const res = await apiFetch(`/api/task-templates/${id}/instantiate`, {
      method: 'POST',
      body: JSON.stringify(options || {}),
    });
    if (!res.ok) throw new Error('Failed to instantiate task from template');
    return res.json();
  },

  deleteTemplate: async (id: string): Promise<void> => {
    const res = await apiFetch(`/api/task-templates/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete task template');
  },
};
