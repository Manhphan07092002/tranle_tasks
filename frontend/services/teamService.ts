import { apiFetch } from './api';
import { Team } from '../types';

export const teamService = {
  async getAll(departmentId?: string): Promise<Team[]> {
    const url = departmentId ? `/api/teams?departmentId=${encodeURIComponent(departmentId)}` : '/api/teams';
    const res = await apiFetch(url);
    if (!res.ok) throw new Error('Failed to fetch teams');
    return res.json();
  },

  async getById(id: string): Promise<Team> {
    const res = await apiFetch(`/api/teams/${id}`);
    if (!res.ok) throw new Error('Failed to fetch team');
    return res.json();
  },

  async create(team: Partial<Team>): Promise<{ id: string }> {
    const res = await apiFetch('/api/teams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(team),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to create team');
    }
    return res.json();
  },

  async update(id: string, team: Partial<Team>): Promise<void> {
    const res = await apiFetch(`/api/teams/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(team),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to update team');
    }
  },

  async delete(id: string): Promise<void> {
    const res = await apiFetch(`/api/teams/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to delete team');
    }
  },
};
