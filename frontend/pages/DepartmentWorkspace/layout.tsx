import { useEffect } from 'react';
import { Navigate, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useDepartmentWorkspace } from './hooks/useDepartmentWorkspace';
import type { DeptTabId } from './deptSections';
import {
  DEFAULT_DEPT_SECTION,
  SECTION_TO_TAB,
  TAB_TO_SECTION,
  buildDeptSectionPath,
  isDeptSection,
} from './deptSections';
import { DepartmentHeader } from '../../components/DepartmentWorkspace/DepartmentHeader';
import { StatCards } from '../../components/DepartmentWorkspace/StatCards';
import { QuickJumpBar } from '../../components/DepartmentWorkspace/QuickJumpBar';
import { TabNavigation } from '../../components/DepartmentWorkspace/TabNavigation';
import { TaskModal } from '../../components/TaskModal';

/**
 * Layout dùng chung cho Không gian phòng ban.
 * URL là nguồn trạng thái chính: /department-workspace/:departmentId/:section
 * Header + StatCards + QuickJumpBar khai báo 1 lần, trang con render qua Outlet.
 */
export default function DepartmentWorkspaceLayout() {
  const { departmentId } = useParams<{ departmentId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const ws = useDepartmentWorkspace();
  const {
    selectedDeptId, setSelectedDeptId,
    activeTab, setActiveTab,
    isAdminOrDirector, userDept, allowedDepartments, currentDept,
    deptTeams, deptMembers, deptTasks, incomingRequests,
    departments,
  } = ws;

  // Section lấy từ segment cuối của pathname (child route là static: overview/tasks/...).
  const sectionSeg = location.pathname.split('/').filter(Boolean).pop();
  const validSection = isDeptSection(sectionSeg) ? sectionSeg : null;

  // Phòng ban hợp lệ với quyền của user hiện tại.
  const deptAllowed =
    !!departmentId &&
    (isAdminOrDirector
      ? departments.some((d: any) => d.id === departmentId)
      : userDept?.id === departmentId);
  const fallbackDeptId =
    userDept?.id || allowedDepartments[0]?.id || departments[0]?.id || '';

  // Đồng bộ dept trên URL -> state nội bộ của hook (không còn là nguồn chính).
  useEffect(() => {
    if (departmentId && deptAllowed && departmentId !== selectedDeptId) {
      setSelectedDeptId(departmentId);
    }
  }, [departmentId, deptAllowed, selectedDeptId, setSelectedDeptId]);

  // Đồng bộ section trên URL -> activeTab nội bộ.
  useEffect(() => {
    if (validSection) {
      const tab = SECTION_TO_TAB[validSection];
      if (tab !== activeTab) setActiveTab(tab);
    }
  }, [validSection, activeTab, setActiveTab]);

  // Section lạ -> về mặc định.
  if (!validSection) {
    if (!departmentId) return <Navigate to="/department-workspace" replace />;
    return <Navigate to={buildDeptSectionPath(departmentId, DEFAULT_DEPT_SECTION)} replace />;
  }

  // Nhân viên/Trưởng phòng mò URL phòng khác -> về phòng của mình, giữ nguyên section.
  if (!deptAllowed) {
    if (!fallbackDeptId) {
      return (
        <div className="p-8 text-center text-sm text-gray-500">
          Không tìm thấy phòng ban hợp lệ cho tài khoản của bạn.
        </div>
      );
    }
    return <Navigate to={buildDeptSectionPath(fallbackDeptId, validSection)} replace />;
  }

  // Đổi phòng ban bằng dropdown: giữ nguyên section đang xem.
  const handleSelectDept = (id: string) => {
    setSelectedDeptId(id);
    navigate(buildDeptSectionPath(id, validSection));
  };

  // TabNavigation cũ gọi onTabChange -> chuyển thành điều hướng URL.
  const handleTabChange = (tab: string) => {
    const target = TAB_TO_SECTION[tab as DeptTabId] ?? DEFAULT_DEPT_SECTION;
    navigate(buildDeptSectionPath(departmentId as string, target));
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6 animate-in fade-in duration-300">
      <DepartmentHeader
        currentDept={currentDept}
        isAdminOrDirector={!!isAdminOrDirector}
        allowedDepartments={allowedDepartments}
        selectedDeptId={selectedDeptId}
        onSelectDept={handleSelectDept}
      />

      <StatCards
        totalTasks={ws.totalTasks}
        completionRate={ws.completionRate}
        incomingRequestsCount={incomingRequests.length}
        deptMembersCount={deptMembers.length}
        deptTeamsCount={deptTeams.length}
      />

      <QuickJumpBar />

      <TabNavigation
        activeTab={activeTab}
        onTabChange={handleTabChange}
        badgeOverrides={{
          queue: deptTasks.length,
          requests: incomingRequests.filter((r: any) => r.status === 'pending').length,
        }}
      />

      <Outlet context={ws} />

      {ws.isTaskModalOpen && ws.selectedTask && (
        <TaskModal
          isOpen={ws.isTaskModalOpen}
          onClose={() => ws.setIsTaskModalOpen(false)}
          onSave={async (updatedTask) => {
            await ws.saveTask(updatedTask);
            ws.setIsTaskModalOpen(false);
          }}
          initialTask={ws.selectedTask}
          user={ws.user!}
          allUsers={ws.users}
        />
      )}
    </div>
  );
}
