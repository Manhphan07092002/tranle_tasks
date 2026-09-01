import { apiFetch } from './api';
import { OrganizationTreeResponse } from '../types';

export const organizationService = {
  async getTree(): Promise<OrganizationTreeResponse> {
    const res = await apiFetch('/api/organization/tree');
    if (!res.ok) throw new Error('Failed to fetch organization tree');
    return res.json();
  },

  async getStats(): Promise<{
    totalUsers: number;
    totalDepartments: number;
    totalTeams: number;
    totalPositions: number;
    totalProjects: number;
    totalTasks: number;
    departmentBreakdown: Array<{ id: string; code: string; name: string; color: string; memberCount: number }>;
  }> {
    const res = await apiFetch('/api/organization/stats');
    if (!res.ok) throw new Error('Failed to fetch organization stats');
    return res.json();
  },
};
