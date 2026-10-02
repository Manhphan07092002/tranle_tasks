import { Navigate, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import { DEFAULT_MY_SECTION, MY_SUBMENU, buildMyWorkPath, isMySection } from './mySections';
import { useMyWorkspace } from './hooks/useMyWorkspace';

/** Không gian cá nhân — URL là nguồn trạng thái: /my-work/:section */
export default function MyWorkspaceLayout() {
  const { section } = useParams<{ section: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const ws = useMyWorkspace();

  if (!isMySection(section)) {
    return <Navigate to={buildMyWorkPath(DEFAULT_MY_SECTION)} replace />;
  }

  const badge = (s: string): number | undefined => {
    if (s === 'today') return ws.overdueTasks.length + ws.todayTasks.length + ws.todayMeetings.length || undefined;
    if (s === 'tasks') return ws.openTasks.length || undefined;
    if (s === 'approvals') return ws.pendingApprovalsForMe.length || undefined;
    if (s === 'inbox') return ws.unreadMail + ws.unreadNotifications || undefined;
    return undefined;
  };

  return (
    <div className="p-6 max-w-[1200px] mx-auto space-y-6 animate-in fade-in duration-300" key={location.pathname}>
      <div>
        <h1 className="text-xl font-bold text-gray-900">Không gian của tôi</h1>
        <p className="text-sm text-gray-500">Xin chào {ws.user?.name || ''} — hôm nay có {ws.overdueTasks.length} việc quá hạn, {ws.todayTasks.length} việc đến hạn.</p>
      </div>

      <nav className="flex border-b border-gray-200 gap-1 overflow-x-auto">
        {MY_SUBMENU.map((sub) => {
          const active = sub.section === section;
          const b = badge(sub.section);
          return (
            <button
              key={sub.section}
              onClick={() => navigate(buildMyWorkPath(sub.section))}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold border-b-2 whitespace-nowrap transition-colors ${
                active ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              <sub.icon size={15} />
              <span>{sub.label}</span>
              {b !== undefined && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700">{b}</span>
              )}
            </button>
          );
        })}
      </nav>

      <Outlet context={ws} />
    </div>
  );
}
