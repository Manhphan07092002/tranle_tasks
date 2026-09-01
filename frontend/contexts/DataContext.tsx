import React, { createContext, useContext, ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Task, Note, User, Report, Role, Department, Project, Team, Position, DepartmentRequest, ApprovalItem, TaskTemplate } from '../types';
import { getTasks as fetchTasks, saveTask as apiSaveTask, deleteTask as apiDeleteTask } from '../services/taskService';
import { getNotes as fetchNotes, saveNote as apiSaveNote, deleteNote as apiDeleteNote } from '../services/noteService';
import { getUsers as fetchUsers, saveUser as apiSaveUser, deleteUser as apiDeleteUser } from '../services/userService';
import { getReports as fetchReports, saveReport as apiSaveReport, deleteReport as apiDeleteReport, adminHardDeleteReport as apiAdminHardDeleteReport } from '../services/reportService';
import { getRoles as fetchRoles } from '../services/roleService';
import { departmentService } from '../services/departmentService';
import { teamService } from '../services/teamService';
import { positionService } from '../services/positionService';
import { departmentRequestService } from '../services/departmentRequestService';
import { approvalService } from '../services/approvalService';
import { taskTemplateService } from '../services/taskTemplateService';
import { getContracts as fetchContracts, saveContract as apiSaveContract, deleteContract as apiDeleteContract, Contract } from '../services/contractService';
import { getRevenueReports as fetchRevenueReports, saveRevenueReport as apiSaveRevenueReport, deleteRevenueReport as apiDeleteRevenueReport, RevenueReport } from '../services/revenueService';
import { getClients, Client } from '../services/clientService';
import { getProjects, saveProject as apiSaveProject, deleteProject as apiDeleteProject } from '../services/projectService';
import { useAuth } from './AuthContext';

interface DataContextType {
  tasks: Task[];
  notes: Note[];
  users: User[];
  reports: Report[];
  roles: Role[];
  departments: Department[];
  teams: Team[];
  positions: Position[];
  contracts: Contract[];
  revenueReports: RevenueReport[];
  clients: Client[];
  projects: Project[];
  departmentRequests: DepartmentRequest[];
  approvals: ApprovalItem[];
  taskTemplates: TaskTemplate[];
  isLoading: boolean;
  error: string | null;
  saveTask: (t: Task) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  saveNote: (n: Note) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  saveUser: (u: User) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  saveReport: (r: Report) => Promise<void>;
  deleteReport: (id: string) => Promise<void>;
  adminHardDeleteReport: (id: string) => Promise<void>;
  saveDepartment: (d: Partial<Department>) => Promise<void>;
  deleteDepartment: (id: string) => Promise<void>;
  saveTeam: (t: Partial<Team>) => Promise<void>;
  deleteTeam: (id: string) => Promise<void>;
  savePosition: (p: Partial<Position>) => Promise<void>;
  deletePosition: (id: string) => Promise<void>;
  saveDepartmentRequest: (r: Partial<DepartmentRequest>) => Promise<void>;
  deleteDepartmentRequest: (id: string) => Promise<void>;
  convertRequestToTask: (id: string) => Promise<{ taskId: string }>;
  saveApproval: (a: Partial<ApprovalItem>) => Promise<void>;
  decideApproval: (id: string, decision: 'approved' | 'rejected', comment?: string) => Promise<void>;
  saveTaskTemplate: (t: Partial<TaskTemplate>) => Promise<void>;
  deleteTaskTemplate: (id: string) => Promise<void>;
  instantiateTaskTemplate: (id: string, options?: any) => Promise<{ taskId: string }>;
  saveContract: (c: Contract & { _isNew?: boolean }) => Promise<void>;
  deleteContract: (id: string) => Promise<void>;
  saveRevenueReport: (r: RevenueReport & { _isNew?: boolean }) => Promise<void>;
  deleteRevenueReport: (id: string) => Promise<void>;
  saveProject: (p: Project) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  refreshData: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id || '';

  const { data: tasks = [], isLoading: tasksLoading, error: tasksError } = useQuery({ queryKey: ['tasks'], queryFn: fetchTasks, enabled: !!userId, retry: false });
  const { data: notes = [], isLoading: notesLoading, error: notesError } = useQuery({ queryKey: ['notes', userId], queryFn: () => fetchNotes(userId), enabled: !!userId, retry: false });
  const { data: users = [], isLoading: usersLoading, error: usersError } = useQuery({ queryKey: ['users'], queryFn: fetchUsers, enabled: !!userId, retry: false });
  const { data: reports = [], isLoading: reportsLoading, error: reportsError } = useQuery({ queryKey: ['reports'], queryFn: fetchReports, enabled: !!userId, retry: false });
  const { data: roles = [], isLoading: rolesLoading, error: rolesError } = useQuery({ queryKey: ['roles'], queryFn: fetchRoles, enabled: !!userId, retry: false });
  const { data: departments = [], isLoading: departmentsLoading, error: deptsError } = useQuery({ queryKey: ['departments'], queryFn: () => departmentService.getAll(), enabled: !!userId, retry: false });
  const { data: teams = [], isLoading: teamsLoading, error: teamsError } = useQuery({ queryKey: ['teams'], queryFn: () => teamService.getAll(), enabled: !!userId, retry: false });
  const { data: positions = [], isLoading: positionsLoading, error: positionsError } = useQuery({ queryKey: ['positions'], queryFn: () => positionService.getAll(), enabled: !!userId, retry: false });
  const { data: contracts = [], isLoading: contractsLoading, error: contractsError } = useQuery({ queryKey: ['contracts'], queryFn: fetchContracts, enabled: !!userId, retry: false });
  const { data: revenueReports = [], isLoading: revenueLoading, error: revenueError } = useQuery({ queryKey: ['revenueReports'], queryFn: fetchRevenueReports, enabled: !!userId, retry: false });
  const { data: clients = [], isLoading: clientsLoading, error: clientsError } = useQuery({ queryKey: ['clients'], queryFn: getClients, enabled: !!userId, retry: false });
  const { data: projects = [], isLoading: projectsLoading, error: projectsError } = useQuery({ queryKey: ['projects'], queryFn: getProjects, enabled: !!userId, retry: false });
  const { data: departmentRequests = [], isLoading: requestsLoading, error: requestsError } = useQuery({ queryKey: ['departmentRequests'], queryFn: () => departmentRequestService.getRequests(), enabled: !!userId, retry: false });
  const { data: approvals = [], isLoading: approvalsLoading, error: approvalsError } = useQuery({ queryKey: ['approvals'], queryFn: () => approvalService.getApprovals(), enabled: !!userId, retry: false });
  const { data: taskTemplates = [], isLoading: templatesLoading, error: templatesError } = useQuery({ queryKey: ['taskTemplates'], queryFn: () => taskTemplateService.getTemplates(), enabled: !!userId, retry: false });

  const isLoading = tasksLoading || notesLoading || usersLoading || reportsLoading || rolesLoading || departmentsLoading || teamsLoading || positionsLoading || contractsLoading || revenueLoading || clientsLoading || projectsLoading || requestsLoading || approvalsLoading || templatesLoading;
  
  const anyError = tasksError || notesError || usersError || reportsError || rolesError || deptsError || teamsError || positionsError || contractsError || revenueError || clientsError || projectsError || requestsError || approvalsError || templatesError;
  const error = anyError ? 'Failed to fetch data' : null;

  const refreshData = async () => {
    await queryClient.invalidateQueries();
  };

  const saveTaskMutation = useMutation({
    mutationFn: apiSaveTask,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });

  const deleteTaskMutation = useMutation({
    mutationFn: apiDeleteTask,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });

  const saveNoteMutation = useMutation({
    mutationFn: apiSaveNote,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notes', userId] }),
  });

  const deleteNoteMutation = useMutation({
    mutationFn: apiDeleteNote,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notes', userId] }),
  });

  const saveUserMutation = useMutation({
    mutationFn: apiSaveUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      queryClient.invalidateQueries({ queryKey: ['teams'] });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: apiDeleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      queryClient.invalidateQueries({ queryKey: ['teams'] });
    },
  });

  const saveDepartmentMutation = useMutation({
    mutationFn: async (dept: Partial<Department>) => {
      if (dept.id && !dept.id.startsWith('dept-new-')) {
        await departmentService.update(dept.id, dept);
      } else {
        await departmentService.create(dept);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      queryClient.invalidateQueries({ queryKey: ['organization'] });
    },
  });

  const deleteDepartmentMutation = useMutation({
    mutationFn: (id: string) => departmentService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      queryClient.invalidateQueries({ queryKey: ['organization'] });
    },
  });

  const saveTeamMutation = useMutation({
    mutationFn: async (team: Partial<Team>) => {
      if (team.id && !team.id.startsWith('team-new-')) {
        await teamService.update(team.id, team);
      } else {
        await teamService.create(team);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      queryClient.invalidateQueries({ queryKey: ['organization'] });
    },
  });

  const deleteTeamMutation = useMutation({
    mutationFn: (id: string) => teamService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      queryClient.invalidateQueries({ queryKey: ['organization'] });
    },
  });

  const savePositionMutation = useMutation({
    mutationFn: async (pos: Partial<Position>) => {
      if (pos.id && !pos.id.startsWith('pos-new-')) {
        await positionService.update(pos.id, pos);
      } else {
        await positionService.create(pos);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['positions'] });
      queryClient.invalidateQueries({ queryKey: ['organization'] });
    },
  });

  const deletePositionMutation = useMutation({
    mutationFn: (id: string) => positionService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['positions'] });
      queryClient.invalidateQueries({ queryKey: ['organization'] });
    },
  });

  const saveReportMutation = useMutation({
    mutationFn: apiSaveReport,
    onMutate: async (newReport) => {
      await queryClient.cancelQueries({ queryKey: ['reports'] });
      const previousReports = queryClient.getQueryData<Report[]>(['reports']);
      queryClient.setQueryData<Report[]>(['reports'], (old) => {
        if (!old) return [newReport];
        const exists = old.find((r) => r.id === newReport.id);
        if (exists) {
          return old.map((r) => (r.id === newReport.id ? { ...r, ...newReport } : r));
        }
        return [...old, newReport];
      });
      return { previousReports };
    },
    onError: (_err, _newReport, context) => {
      if (context?.previousReports) {
        queryClient.setQueryData(['reports'], context.previousReports);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });

  const deleteReportMutation = useMutation({
    mutationFn: apiDeleteReport,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reports'] }),
  });

  const adminHardDeleteReportMutation = useMutation({
    mutationFn: apiAdminHardDeleteReport,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reports'] }),
  });

  const saveContractMutation = useMutation({
    mutationFn: apiSaveContract,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['revenueReports'] });
    },
  });
  const deleteContractMutation = useMutation({
    mutationFn: apiDeleteContract,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['revenueReports'] });
    },
  });
  const saveRevenueReportMutation = useMutation({
    mutationFn: apiSaveRevenueReport,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['revenueReports'] }),
  });
  const deleteRevenueReportMutation = useMutation({
    mutationFn: apiDeleteRevenueReport,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['revenueReports'] }),
  });

  const saveProjectMutation = useMutation({
    mutationFn: apiSaveProject,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
  });
  const deleteProjectMutation = useMutation({
    mutationFn: apiDeleteProject,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
  });

  const saveDepartmentRequestMutation = useMutation({
    mutationFn: async (r: Partial<DepartmentRequest>) => {
      if (r.id) {
        await departmentRequestService.updateRequest(r.id, r);
      } else {
        await departmentRequestService.createRequest(r);
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['departmentRequests'] }),
  });
  const deleteDepartmentRequestMutation = useMutation({
    mutationFn: (id: string) => departmentRequestService.deleteRequest(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['departmentRequests'] }),
  });

  const saveApprovalMutation = useMutation({
    mutationFn: (a: Partial<ApprovalItem>) => approvalService.createApproval(a),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['approvals'] }),
  });
  const decideApprovalMutation = useMutation({
    mutationFn: ({ id, decision, comment }: { id: string; decision: 'approved' | 'rejected'; comment?: string }) => approvalService.decideApproval(id, decision, comment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const saveTaskTemplateMutation = useMutation({
    mutationFn: (t: Partial<TaskTemplate>) => taskTemplateService.createTemplate(t),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['taskTemplates'] }),
  });
  const deleteTaskTemplateMutation = useMutation({
    mutationFn: (id: string) => taskTemplateService.deleteTemplate(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['taskTemplates'] }),
  });

  return (
    <DataContext.Provider value={{
      tasks, notes, users, reports, roles, departments, teams, positions, contracts, revenueReports, clients, projects, departmentRequests, approvals, taskTemplates, isLoading, error,
      saveTask: async (t) => { await saveTaskMutation.mutateAsync(t); },
      deleteTask: async (id) => { await deleteTaskMutation.mutateAsync(id); },
      saveNote: async (n) => { await saveNoteMutation.mutateAsync(n); },
      deleteNote: async (id) => { await deleteNoteMutation.mutateAsync(id); },
      saveUser: async (u) => { await saveUserMutation.mutateAsync(u); },
      deleteUser: async (id) => { await deleteUserMutation.mutateAsync(id); },
      saveReport: async (r) => { await saveReportMutation.mutateAsync(r); },
      deleteReport: async (id) => { await deleteReportMutation.mutateAsync(id); },
      adminHardDeleteReport: async (id) => { await adminHardDeleteReportMutation.mutateAsync(id); },
      saveDepartment: async (d) => { await saveDepartmentMutation.mutateAsync(d); },
      deleteDepartment: async (id) => { await deleteDepartmentMutation.mutateAsync(id); },
      saveTeam: async (t) => { await saveTeamMutation.mutateAsync(t); },
      deleteTeam: async (id) => { await deleteTeamMutation.mutateAsync(id); },
      savePosition: async (p) => { await savePositionMutation.mutateAsync(p); },
      deletePosition: async (id) => { await deletePositionMutation.mutateAsync(id); },
      saveDepartmentRequest: async (r) => { await saveDepartmentRequestMutation.mutateAsync(r); },
      deleteDepartmentRequest: async (id) => { await deleteDepartmentRequestMutation.mutateAsync(id); },
      convertRequestToTask: async (id) => {
        const res = await departmentRequestService.convertToTask(id);
        await queryClient.invalidateQueries({ queryKey: ['departmentRequests'] });
        await queryClient.invalidateQueries({ queryKey: ['tasks'] });
        return res;
      },
      saveApproval: async (a) => { await saveApprovalMutation.mutateAsync(a); },
      decideApproval: async (id, decision, comment) => { await decideApprovalMutation.mutateAsync({ id, decision, comment }); },
      saveTaskTemplate: async (t) => { await saveTaskTemplateMutation.mutateAsync(t); },
      deleteTaskTemplate: async (id) => { await deleteTaskTemplateMutation.mutateAsync(id); },
      instantiateTaskTemplate: async (id, options) => {
        const res = await taskTemplateService.instantiateTemplate(id, options);
        await queryClient.invalidateQueries({ queryKey: ['tasks'] });
        return res;
      },
      saveContract: async (c) => { await saveContractMutation.mutateAsync(c); },
      deleteContract: async (id) => { await deleteContractMutation.mutateAsync(id); },
      saveRevenueReport: async (r) => { await saveRevenueReportMutation.mutateAsync(r); },
      deleteRevenueReport: async (id) => { await deleteRevenueReportMutation.mutateAsync(id); },
      saveProject: async (p) => { await saveProjectMutation.mutateAsync(p); },
      deleteProject: async (id) => { await deleteProjectMutation.mutateAsync(id); },
      refreshData
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
