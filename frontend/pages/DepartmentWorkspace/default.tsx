import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { DEFAULT_DEPT_SECTION, buildDeptSectionPath } from './deptSections';

/** /department-workspace -> phòng của user + section mặc định (overview). */
export default function DepartmentWorkspaceDefault() {
  const { user } = useAuth();
  const { departments } = useData();

  const isAdminOrDirector =
    user?.role === 'Admin' ||
    user?.role === 'Director' ||
    user?.permissions?.includes('admin_panel');
  const userDept = departments.find(
    (d: any) => d.id === (user as any)?.departmentId || d.name === (user as any)?.department,
  );
  const targetId = isAdminOrDirector
    ? userDept?.id || departments[0]?.id
    : userDept?.id || departments[0]?.id;

  if (!targetId) {
    return (
      <div className="p-8 text-center text-sm text-gray-500">
        Đang tải không gian phòng ban...
      </div>
    );
  }
  return <Navigate to={buildDeptSectionPath(targetId, DEFAULT_DEPT_SECTION)} replace />;
}
