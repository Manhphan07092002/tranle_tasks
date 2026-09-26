import React from 'react';
import { useData } from '../../contexts/DataContext';
import { useNavigate } from 'react-router-dom';
import { DepartmentDomainView } from './DepartmentDomainView';
import { CrossDepartmentWorkflowTracker } from '../../components/workflow/CrossDepartmentWorkflowTracker';
import {
  DepartmentDashboardTab,
  DepartmentCalendarTab,
  DepartmentDocsTab,
  DepartmentApprovalsTab,
  DepartmentReportsTab,
  DepartmentAuditTab
} from './tabs';
import { TaskModal } from '../../components/TaskModal';
import { useDepartmentWorkspace } from './hooks/useDepartmentWorkspace';
import { DepartmentHeader } from '../../components/DepartmentWorkspace/DepartmentHeader';
import { StatCards } from '../../components/DepartmentWorkspace/StatCards';
import { QuickJumpBar } from '../../components/DepartmentWorkspace/QuickJumpBar';
import { TabNavigation } from '../../components/DepartmentWorkspace/TabNavigation';
import { WorkQueueTab } from '../../components/DepartmentWorkspace/WorkQueueTab';
import { RequestsTab } from '../../components/DepartmentWorkspace/RequestsTab';
import { KPITab } from '../../components/DepartmentWorkspace/KPITab';

export default function DepartmentWorkspacePage() {
  const {
    selectedDeptId, setSelectedDeptId,
    activeTab, setActiveTab,
    queueFilter, setQueueFilter,
    requestTab, setRequestTab,
    searchQuery, setSearchQuery,
    isNewRequestOpen, setIsNewRequestOpen,
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
    users,
    teams,
    projects,
    contracts,
    approvals,
    revenueReports,
    tasks,
    saveTask,
    refreshData,
    user
  } = useDepartmentWorkspace();

  const onNavigateTab = (tab: string) => setActiveTab(tab as any);

  const handleSelectTask = (task: any) => {
    setSelectedTask(task);
    setIsTaskModalOpen(true);
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6 animate-in fade-in duration-300">
      <DepartmentHeader
        currentDept={currentDept}
        isAdminOrDirector={!!isAdminOrDirector}
        allowedDepartments={allowedDepartments}
        selectedDeptId={selectedDeptId}
        onSelectDept={setSelectedDeptId}
      />

      <StatCards
        totalTasks={totalTasks}
        completionRate={completionRate}
        incomingRequestsCount={incomingRequests.length}
        deptMembersCount={deptMembers.length}
        deptTeamsCount={deptTeams.length}
      />

      <QuickJumpBar />

      <TabNavigation
        activeTab={activeTab}
        onTabChange={onNavigateTab}
        badgeOverrides={{
          queue: deptTasks.length,
          requests: incomingRequests.filter(r => r.status === 'pending').length,
        }}
      />

      {activeTab === 'domain' && (
        <DepartmentDomainView
          departmentId={selectedDeptId}
          departmentName={currentDept?.name || ''}
          departmentCode={currentDept?.code || ''}
        />
      )}

      {activeTab === 'queue' && (
        <WorkQueueTab
          deptTasks={deptTasks}
          filteredQueueTasks={filteredQueueTasks}
          queueFilter={queueFilter}
          setQueueFilter={setQueueFilter}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          overdueTasks={overdueTasks}
          todayStr={todayStr}
          user={user}
          teams={teams}
          projects={projects}
          users={users}
          onTaskSelect={handleSelectTask}
        />
      )}

      {activeTab === 'requests' && (
        <RequestsTab
          incomingRequests={incomingRequests}
          outgoingRequests={outgoingRequests}
          requestTab={requestTab}
          setRequestTab={setRequestTab}
          departments={departments}
          onCreateRequest={() => setIsNewRequestOpen(true)}
          onConvert={handleConvert}
          isNewRequestOpen={isNewRequestOpen}
          setIsNewRequestOpen={setIsNewRequestOpen}
          selectedDeptId={selectedDeptId}
          targetDeptId={targetDeptId}
          setTargetDeptId={setTargetDeptId}
          reqTitle={reqTitle}
          setReqTitle={setReqTitle}
          reqDesc={reqDesc}
          setReqDesc={setReqDesc}
          reqPriority={reqPriority}
          setReqPriority={setReqPriority}
          reqDueDate={reqDueDate}
          setReqDueDate={setReqDueDate}
          reqRelatedProj={reqRelatedProj}
          setReqRelatedProj={setReqRelatedProj}
          handleCreateRequest={handleCreateRequest}
          user={user}
          projects={projects}
        />
      )}

      {activeTab === 'workflow' && (
        <div className="space-y-4">
          <CrossDepartmentWorkflowTracker />
        </div>
      )}

      {activeTab === 'kpi' && (
        <KPITab
          deptTasks={deptTasks}
          deptMembers={deptMembers}
          deptTemplates={deptTemplates}
          overdueTasks={overdueTasks}
          totalTasks={totalTasks}
          completionRate={completionRate}
        />
      )}

      {activeTab === 'dashboard' && (
        <DepartmentDashboardTab
          departmentId={selectedDeptId}
          currentDept={currentDept}
          deptTasks={deptTasks}
          deptMembers={deptMembers}
          deptTeams={deptTeams}
          incomingRequests={incomingRequests}
          outgoingRequests={outgoingRequests}
          approvals={approvals}
          projects={projects}
          contracts={contracts}
          onSelectTask={handleSelectTask}
          onNavigateTab={onNavigateTab}
          onCreateTask={() => setIsTaskModalOpen(true)}
          onCreateRequest={() => setIsNewRequestOpen(true)}
        />
      )}

      {activeTab === 'calendar' && (
        <DepartmentCalendarTab
          departmentId={selectedDeptId}
          currentDept={currentDept}
          deptTasks={deptTasks}
          deptMembers={deptMembers}
          onSelectTask={handleSelectTask}
        />
      )}

      {activeTab === 'docs' && (
        <DepartmentDocsTab
          departmentId={selectedDeptId}
          currentDept={currentDept}
          deptMembers={deptMembers}
        />
      )}

      {activeTab === 'approvals' && (
        <DepartmentApprovalsTab
          departmentId={selectedDeptId}
          currentDept={currentDept}
          deptMembers={deptMembers}
          approvals={approvals}
          onRefreshApprovals={refreshData}
        />
      )}

      {activeTab === 'reports' && (
        <DepartmentReportsTab
          departmentId={selectedDeptId}
          currentDept={currentDept}
          deptTasks={deptTasks}
          deptMembers={deptMembers}
          deptTeams={deptTeams}
          contracts={contracts}
          revenueReports={revenueReports}
        />
      )}

      {activeTab === 'audit' && (
        <DepartmentAuditTab
          departmentId={selectedDeptId}
          currentDept={currentDept}
          deptMembers={deptMembers}
        />
      )}

      {isTaskModalOpen && selectedTask && (
        <TaskModal
          isOpen={isTaskModalOpen}
          onClose={() => setIsTaskModalOpen(false)}
          onSave={async (updatedTask) => {
            await saveTask(updatedTask);
            setIsTaskModalOpen(false);
          }}
          initialTask={selectedTask}
          user={user!}
          allUsers={users}
        />
      )}
    </div>
  );
}