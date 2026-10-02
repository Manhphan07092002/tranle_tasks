import { useNavigate, useOutletContext } from 'react-router-dom';
import { DepartmentDomainView } from './DepartmentDomainView';
import { CrossDepartmentWorkflowTracker } from '../../components/workflow/CrossDepartmentWorkflowTracker';
import {
  DepartmentDashboardTab,
  DepartmentCalendarTab,
  DepartmentDocsTab,
  DepartmentApprovalsTab,
  DepartmentReportsTab,
  DepartmentAuditTab,
} from './tabs';
import { WorkQueueTab } from '../../components/DepartmentWorkspace/WorkQueueTab';
import { RequestsTab } from '../../components/DepartmentWorkspace/RequestsTab';
import { KPITab } from '../../components/DepartmentWorkspace/KPITab';
import { TAB_TO_SECTION, buildDeptSectionPath, type DeptTabId } from './deptSections';

/** Mỗi section là trang con mỏng, tái dùng component nghiệp vụ hiện có, gọi đúng API cũ. */
function useWs() {
  return useOutletContext<any>();
}

function useTabNavigator() {
  const navigate = useNavigate();
  const ws = useWs();
  return (tab: string) => {
    const section = TAB_TO_SECTION[tab as DeptTabId] ?? 'overview';
    navigate(buildDeptSectionPath(ws.selectedDeptId, section));
  };
}

export function DeptOverviewPage() {
  const ws = useWs();
  const onNavigateTab = useTabNavigator();
  return (
    <DepartmentDashboardTab
      departmentId={ws.selectedDeptId}
      currentDept={ws.currentDept}
      deptTasks={ws.deptTasks}
      deptMembers={ws.deptMembers}
      deptTeams={ws.deptTeams}
      incomingRequests={ws.incomingRequests}
      outgoingRequests={ws.outgoingRequests}
      approvals={ws.approvals}
      projects={ws.projects}
      contracts={ws.contracts}
      onSelectTask={(task: any) => { ws.setSelectedTask(task); ws.setIsTaskModalOpen(true); }}
      onNavigateTab={onNavigateTab}
      onCreateTask={() => ws.setIsTaskModalOpen(true)}
      onCreateRequest={() => ws.setIsNewRequestOpen(true)}
    />
  );
}

export function DeptTasksPage() {
  const ws = useWs();
  return (
    <WorkQueueTab
      deptTasks={ws.deptTasks}
      filteredQueueTasks={ws.filteredQueueTasks}
      queueFilter={ws.queueFilter}
      setQueueFilter={ws.setQueueFilter}
      searchQuery={ws.searchQuery}
      setSearchQuery={ws.setSearchQuery}
      overdueTasks={ws.overdueTasks}
      todayStr={ws.todayStr}
      user={ws.user}
      teams={ws.teams}
      projects={ws.projects}
      users={ws.users}
      onTaskSelect={(task: any) => { ws.setSelectedTask(task); ws.setIsTaskModalOpen(true); }}
    />
  );
}

export function DeptRequestsPage() {
  const ws = useWs();
  return (
    <RequestsTab
      incomingRequests={ws.incomingRequests}
      outgoingRequests={ws.outgoingRequests}
      requestTab={ws.requestTab}
      setRequestTab={ws.setRequestTab}
      departments={ws.departments}
      onCreateRequest={() => ws.setIsNewRequestOpen(true)}
      onConvert={ws.handleConvert}
      isNewRequestOpen={ws.isNewRequestOpen}
      setIsNewRequestOpen={ws.setIsNewRequestOpen}
      selectedDeptId={ws.selectedDeptId}
      targetDeptId={ws.targetDeptId}
      setTargetDeptId={ws.setTargetDeptId}
      reqTitle={ws.reqTitle}
      setReqTitle={ws.setReqTitle}
      reqDesc={ws.reqDesc}
      setReqDesc={ws.setReqDesc}
      reqPriority={ws.reqPriority}
      setReqPriority={ws.setReqPriority}
      reqDueDate={ws.reqDueDate}
      setReqDueDate={ws.setReqDueDate}
      reqRelatedProj={ws.reqRelatedProj}
      setReqRelatedProj={ws.setReqRelatedProj}
      handleCreateRequest={ws.handleCreateRequest}
      user={ws.user}
      projects={ws.projects}
    />
  );
}

export function DeptDomainPage() {
  const ws = useWs();
  return (
    <DepartmentDomainView
      departmentId={ws.selectedDeptId}
      departmentName={ws.currentDept?.name || ''}
      departmentCode={ws.currentDept?.code || ''}
    />
  );
}

export function DeptWorkflowPage() {
  return (
    <div className="space-y-4">
      <CrossDepartmentWorkflowTracker />
    </div>
  );
}

export function DeptCalendarPage() {
  const ws = useWs();
  return (
    <DepartmentCalendarTab
      departmentId={ws.selectedDeptId}
      currentDept={ws.currentDept}
      deptTasks={ws.deptTasks}
      deptMembers={ws.deptMembers}
      onSelectTask={(task: any) => { ws.setSelectedTask(task); ws.setIsTaskModalOpen(true); }}
    />
  );
}

export function DeptDocumentsPage() {
  const ws = useWs();
  return (
    <DepartmentDocsTab
      departmentId={ws.selectedDeptId}
      currentDept={ws.currentDept}
      deptMembers={ws.deptMembers}
    />
  );
}

export function DeptApprovalsPage() {
  const ws = useWs();
  return (
    <DepartmentApprovalsTab
      departmentId={ws.selectedDeptId}
      currentDept={ws.currentDept}
      deptMembers={ws.deptMembers}
      approvals={ws.approvals}
      onRefreshApprovals={ws.refreshData}
    />
  );
}

export function DeptReportsPage() {
  const ws = useWs();
  return (
    <DepartmentReportsTab
      departmentId={ws.selectedDeptId}
      currentDept={ws.currentDept}
      deptTasks={ws.deptTasks}
      deptMembers={ws.deptMembers}
      deptTeams={ws.deptTeams}
      contracts={ws.contracts}
      revenueReports={ws.revenueReports}
    />
  );
}

export function DeptKpiPage() {
  const ws = useWs();
  return (
    <KPITab
      deptTasks={ws.deptTasks}
      deptMembers={ws.deptMembers}
      deptTemplates={ws.deptTemplates}
      overdueTasks={ws.overdueTasks}
      totalTasks={ws.totalTasks}
      completionRate={ws.completionRate}
    />
  );
}

export function DeptHistoryPage() {
  const ws = useWs();
  return (
    <DepartmentAuditTab
      departmentId={ws.selectedDeptId}
      currentDept={ws.currentDept}
      deptMembers={ws.deptMembers}
    />
  );
}
