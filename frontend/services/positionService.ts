import { apiFetch } from './api';
import { Position } from '../types';

export const positionService = {
  async getAll(params?: { departmentId?: string; teamId?: string }): Promise<Position[]> {
    let url = '/api/positions';
    const query = new URLSearchParams();
    if (params?.departmentId) query.append('departmentId', params.departmentId);
    if (params?.teamId) query.append('teamId', params.teamId);
    if (query.toString()) url += `?${query.toString()}`;

    const res = await apiFetch(url);
    if (!res.ok) throw new Error('Failed to fetch positions');
    return res.json();
  },

  async getById(id: string): Promise<Position> {
    const res = await apiFetch(`/api/positions/${id}`);
    if (!res.ok) throw new Error('Failed to fetch position');
    return res.json();
  },

  async create(pos: Partial<Position>): Promise<{ id: string }> {
    const res = await apiFetch('/api/positions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pos),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to create position');
    }
    return res.json();
  },

  async update(id: string, pos: Partial<Position>): Promise<void> {
    const res = await apiFetch(`/api/positions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pos),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to update position');
    }
  },

  async delete(id: string): Promise<void> {
    const res = await apiFetch(`/api/positions/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to delete position');
    }
  },
};
