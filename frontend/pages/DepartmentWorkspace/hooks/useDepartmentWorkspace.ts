import { useMemo, useState, useEffect } from 'react';
import { useData } from '../../../contexts/DataContext';
import { useAuth } from '../../../contexts/AuthContext';
import { Task, DepartmentRequest, TaskTemplate, TaskStatus, TaskPriority } from '../../../types';
import { useNavigate } from 'react-router-dom';
import type { DeptTabId } from '../deptSections';

export interface DepartmentWorkspaceState {
  selectedDeptId: string;
  activeTab: DeptTabId;
  queueFilter: 'all' | 'my' | 'team' | 'unassigned' | 'today' | 'overdue' | 'blocked' | 'review';
  requestTab: 'incoming' | 'outgoing';
  searchQuery: string;
  isNewRequestOpen: boolean;
  isNewTemplateOpen: boolean;
  selectedTask: Task | null;
  isTaskModalOpen: boolean;
  targetDeptId: string;
  reqTitle: string;
  reqDesc: string;
  reqPriority: 'Urgent' | 'High' | 'Medium' | 'Low';
  reqDueDate: string;
  reqRelatedProj: string;
}

export interface DepartmentWorkspaceActions {
  setSelectedDeptId: (id: string) => void;
  setActiveTab: (tab: DepartmentWorkspaceState['activeTab']) => void;
  setQueueFilter: (filter: DepartmentWorkspaceState['queueFilter']) => void;
  setRequestTab: (tab: DepartmentWorkspaceState['requestTab']) => void;
  setSearchQuery: (query: string) => void;
  setIsNewRequestOpen: (open: boolean) => void;
  setIsNewTemplateOpen: (open: boolean) => void;
  setSelectedTask: (task: Task | null) => void;
  setIsTaskModalOpen: (open: boolean) => void;
  setTargetDeptId: (id: string) => void;
  setReqTitle: (title: string) => void;
  setReqDesc: (desc: string) => void;
  setReqPriority: (priority: DepartmentWorkspaceState['reqPriority']) => void;
  setReqDueDate: (date: string) => void;
  setReqRelatedProj: (proj: string) => void;
  handleCreateRequest: (e: React.FormEvent) => Promise<void>;
  handleInstantiate: (tpl: TaskTemplate) => Promise<void>;
  handleConvert: (reqId: string) => Promise<void>;
}

export interface DepartmentWorkspaceDerived {
  isAdminOrDirector: boolean;
  userDept: any;
  allowedDepartments: any[];
  currentDept: any;
  deptTeams: any[];
  deptMembers: any[];
  deptTasks: Task[];
  filteredQueueTasks: Task[];
  incomingRequests: DepartmentRequest[];
  outgoingRequests: DepartmentRequest[];
  deptTemplates: TaskTemplate[];
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  completionRate: number;
  todayStr: string;
}

export function useDepartmentWorkspace() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const {
    departments, teams, users, tasks, projects,
    departmentRequests, taskTemplates,
    contracts, approvals, revenueReports, refreshData,
    saveDepartmentRequest, convertRequestToTask,
    instantiateTaskTemplate, saveTaskTemplate, saveTask
  } = useData();

  const isAdminOrDirector = user?.role === 'Admin' || user?.role === 'Director' || user?.permissions?.includes('admin_panel');
  const userDept = departments.find((d: any) => d.id === user?.departmentId || d.name === user?.department);
  const allowedDepartments = isAdminOrDirector ? departments : (userDept ? [userDept] : departments);

  const [selectedDeptId, setSelectedDeptId] = useState<string>(userDept?.id || (departments[0]?.id || ''));
  const [activeTab, setActiveTab] = useState<DepartmentWorkspaceState['activeTab']>('domain');
  const [queueFilter, setQueueFilter] = useState<DepartmentWorkspaceState['queueFilter']>('all');
  const [requestTab, setRequestTab] = useState<'incoming' | 'outgoing'>('incoming');
  const [searchQuery, setSearchQuery] = useState('');
  const [isNewRequestOpen, setIsNewRequestOpen] = useState(false);
  const [isNewTemplateOpen, setIsNewTemplateOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  const [targetDeptId, setTargetDeptId] = useState('');
  const [reqTitle, setReqTitle] = useState('');
  const [reqDesc, setReqDesc] = useState('');
  const [reqPriority, setReqPriority] = useState<'Urgent' | 'High' | 'Medium' | 'Low'>('Medium');
  const [reqDueDate, setReqDueDate] = useState('');
  const [reqRelatedProj, setReqRelatedProj] = useState('');

  useEffect(() => {
    if (!isAdminOrDirector && userDept?.id) {
      setSelectedDeptId(userDept.id);
    }
  }, [isAdminOrDirector, userDept?.id]);

  const currentDept = departments.find((d: any) => d.id === selectedDeptId) || departments[0];
  const deptTeams = teams.filter((t: any) => t.departmentId === selectedDeptId);
  const deptMembers = users.filter((u: any) => u.departmentId === selectedDeptId || u.department === currentDept?.name);
  const deptTasks = tasks.filter((t: any) => t.departmentId === selectedDeptId || t.department === currentDept?.name);

  const todayStr = new Date().toISOString().split('T')[0];

  const filteredQueueTasks = useMemo(() => {
    return deptTasks.filter((t: any) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = t.title.toLowerCase().includes(q);
        const matchDesc = t.description?.toLowerCase().includes(q);
        if (!matchTitle && !matchDesc) return false;
      }

      switch (queueFilter) {
        case 'my':
          return t.assignees?.includes(user?.id || '');
        case 'team':
          return !!t.teamId && user?.teamId === t.teamId;
        case 'unassigned':
          return !t.assignees || t.assignees.length === 0;
        case 'today':
          return t.dueDate === todayStr || t.startDate === todayStr;
        case 'overdue':
          return t.dueDate && t.dueDate < todayStr && t.status !== TaskStatus.DONE;
        case 'blocked':
          return (t as any).isBlocked || t.tags?.includes('Blocked') || t.priority === TaskPriority.URGENT;
        case 'review':
          return t.requiresApproval || t.approvalStatus === 'pending';
        default:
          return true;
      }
    });
  }, [deptTasks, queueFilter, searchQuery, user?.id, user?.teamId, todayStr]);

  const incomingRequests = departmentRequests.filter((r: any) => r.targetDepartmentId === selectedDeptId);
  const outgoingRequests = departmentRequests.filter((r: any) => r.sourceDepartmentId === selectedDeptId);
  const deptTemplates = taskTemplates.filter((t: any) => t.departmentId === selectedDeptId);

  const totalTasks = deptTasks.length;
  const completedTasks = deptTasks.filter((t: any) => t.status === TaskStatus.DONE).length;
  const overdueTasks = deptTasks.filter((t: any) => t.dueDate && t.dueDate < todayStr && t.status !== TaskStatus.DONE).length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqTitle.trim() || !targetDeptId) return;
    await saveDepartmentRequest({
      sourceDepartmentId: selectedDeptId,
      targetDepartmentId: targetDeptId,
      requesterId: user?.id || 'u1',
      title: reqTitle.trim(),
      description: reqDesc,
      priority: reqPriority,
      dueDate: reqDueDate || undefined,
      relatedEntityType: reqRelatedProj ? 'project' : undefined,
      relatedEntityId: reqRelatedProj || undefined,
    });
    setIsNewRequestOpen(false);
    setReqTitle('');
    setReqDesc('');
    setTargetDeptId('');
    setReqDueDate('');
    setReqRelatedProj('');
  };

  const handleInstantiate = async (tpl: TaskTemplate) => {
    await instantiateTaskTemplate(tpl.id, {
      userId: user?.id,
      customTitle: `[${currentDept?.code || 'DEPT'}] ${tpl.title}`,
    });
    setActiveTab('queue');
  };

  const handleConvert = async (reqId: string) => {
    await convertRequestToTask(reqId);
  };

  return {
    selectedDeptId, setSelectedDeptId,
    activeTab, setActiveTab,
    queueFilter, setQueueFilter,
    requestTab, setRequestTab,
    searchQuery, setSearchQuery,
    isNewRequestOpen, setIsNewRequestOpen,
    isNewTemplateOpen, setIsNewTemplateOpen,
    selectedTask, setSelectedTask,
    isTaskModalOpen, setIsTaskModalOpen,
    targetDeptId, setTargetDeptId,
    reqTitle, setReqTitle,
    reqDesc, setReqDesc,
    reqPriority, setReqPriority,
    reqDueDate, setReqDueDate,
    reqRelatedProj, setReqRelatedProj,
    handleCreateRequest,
    handleInstantiate,
    handleConvert,
    isAdminOrDirector,
    userDept,
    allowedDepartments,
    currentDept,
    deptTeams,
    deptMembers,
    deptTasks,
    filteredQueueTasks,
    incomingRequests,
    outgoingRequests,
    deptTemplates,
    totalTasks,
    completedTasks,
    overdueTasks,
    completionRate,
    todayStr,
    departments,
    teams,
    users,
    tasks,
    projects,
    departmentRequests,
    taskTemplates,
    contracts,
    approvals,
    revenueReports,
    saveDepartmentRequest,
    convertRequestToTask,
    instantiateTaskTemplate,
    saveTaskTemplate,
    saveTask,
    refreshData,
    user,
    navigate,
  };
}