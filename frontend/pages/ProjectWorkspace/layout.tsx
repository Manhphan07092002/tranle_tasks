import { Navigate, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useNotifications } from '../../contexts/NotificationContext';
import { DEFAULT_PROJECT_SECTION, PROJECT_SUBMENU, buildProjectWorkspacePath, isProjectSection } from './projSections';
import { useProjectWorkspace } from './hooks/useProjectWorkspace';

/** Không gian dự án — URL: /projects/:projectId/workspace/:section */
export default function ProjectWorkspaceLayout() {
  const { projectId } = useParams<{ projectId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { showToast } = useNotifications();
  const ws = useProjectWorkspace(projectId || '');

  if (!projectId) return <Navigate to="/projects" replace />;
  if (!isProjectSection(location.pathname.split('/').filter(Boolean).pop())) {
    return <Navigate to={buildProjectWorkspacePath(projectId, DEFAULT_PROJECT_SECTION)} replace />;
  }
  const section = location.pathname.split('/').filter(Boolean).pop() as string;

  if (ws.forbidden) {
    showToast({ type: 'error', title: 'Không có quyền', message: 'Bạn không thuộc dự án này.' });
    return <Navigate to="/projects" replace />;
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6 animate-in fade-in duration-300">
      <div>
        <button onClick={() => navigate('/projects')} className="text-xs font-semibold text-slate-500 hover:text-slate-800">← Danh sách dự án</button>
        <h1 className="text-xl font-bold text-gray-900 mt-1">
          {ws.loading ? 'Đang tải dự án...' : ws.project ? `${(ws.project as any).projectCode || ''} — ${ws.project.name}` : 'Không tìm thấy dự án'}
        </h1>
        {ws.project?.participatingDepartments && ws.project.participatingDepartments.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {ws.project.participatingDepartments.map((d: any) => (
              <span key={d.departmentId} className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-brand-50 text-brand-700 border border-brand-100">
                {d.departmentName}{d.role && d.role !== 'member' ? ` · ${d.role}` : ''}
              </span>
            ))}
          </div>
        )}
      </div>

      <nav className="flex border-b border-gray-200 gap-1 overflow-x-auto">
        {PROJECT_SUBMENU.map((sub) => {
          const active = sub.section === section;
          return (
            <button
              key={sub.section}
              onClick={() => navigate(buildProjectWorkspacePath(projectId, sub.section))}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold border-b-2 whitespace-nowrap transition-colors ${
                active ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              <sub.icon size={15} />
              <span>{sub.label}</span>
            </button>
          );
        })}
      </nav>

      {ws.loading ? (
        <div className="p-8 text-center text-sm text-gray-500">Đang tải dữ liệu dự án...</div>
      ) : ws.project ? (
        <Outlet context={ws} />
      ) : (
        !ws.forbidden && <div className="p-8 text-center text-sm text-gray-500">Không tìm thấy dự án.</div>
      )}
    </div>
  );
}
