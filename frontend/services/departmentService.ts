import { apiFetch } from './api';
import { Department } from '../types';

const API_URL = '/api/departments';

export const departmentService = {
  async getAll(): Promise<Department[]> {
    const response = await apiFetch(API_URL);
    if (!response.ok) throw new Error('Failed to fetch departments');
    return response.json();
  },

  async getById(id: string): Promise<Department & { teams?: any[]; members?: any[]; openTasks?: any[]; projects?: any[] }> {
    const response = await apiFetch(`${API_URL}/${id}`);
    if (!response.ok) throw new Error('Failed to fetch department details');
    return response.json();
  },

  async create(dept: Partial<Department>): Promise<{ id: string }> {
    const response = await apiFetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dept),
    });
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to create department');
    }
    return response.json();
  },

  async update(id: string, dept: Partial<Department>): Promise<void> {
    const response = await apiFetch(`${API_URL}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dept),
    });
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to update department');
    }
  },

  async delete(id: string): Promise<void> {
    const response = await apiFetch(`${API_URL}/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to delete department');
    }
  },
};

export const getDepartments = departmentService.getAll;
