import { Link, useOutletContext } from 'react-router-dom';
import type { useMyWorkspace } from './hooks/useMyWorkspace';

type Ws = ReturnType<typeof useMyWorkspace>;
function useWs(): Ws {
  return useOutletContext<Ws>();
}

function SectionCard({ title, to, children, empty }: { title: string; to: string; children: React.ReactNode; empty?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-gray-900">{title}</h2>
        <Link to={to} className="text-xs font-semibold text-emerald-700 hover:underline">Xem tất cả</Link>
      </div>
      {children}
      {empty && <p className="text-xs text-gray-400">{empty}</p>}
    </div>
  );
}

export function MyTodayPage() {
  const ws = useWs();
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <SectionCard title={`Quá hạn (${ws.overdueTasks.length})`} to="/my-work/tasks" empty={ws.overdueTasks.length === 0 ? 'Không có việc quá hạn. Tuyệt vời!' : undefined}>
        {ws.overdueTasks.slice(0, 5).map((t) => (
          <div key={t.id} className="text-sm flex justify-between gap-2 border-b border-gray-100 py-1.5">
            <span className="truncate font-medium text-gray-800">{t.title}</span>
            <span className="text-xs text-red-600 flex-shrink-0">{t.dueDate}</span>
          </div>
        ))}
      </SectionCard>
      <SectionCard title={`Hôm nay (${ws.todayTasks.length + ws.todayMeetings.length})`} to="/my-work/calendar" empty={ws.todayTasks.length + ws.todayMeetings.length === 0 ? 'Hôm nay trống — tranh thủ xử lý tồn đọng.' : undefined}>
        {ws.todayTasks.slice(0, 5).map((t) => (
          <div key={t.id} className="text-sm truncate py-1.5 border-b border-gray-100 font-medium text-gray-800">{t.title}</div>
        ))}
        {ws.todayMeetings.slice(0, 5).map((m) => (
          <div key={m.id} className="text-sm flex justify-between gap-2 py-1.5 border-b border-gray-100">
            <span className="truncate text-gray-800">{m.title}</span>
            <span className="text-xs text-blue-600 flex-shrink-0">{(m.startTime || '').slice(11, 16)}</span>
          </div>
        ))}
      </SectionCard>
      <SectionCard title={`Chờ tôi duyệt (${ws.pendingApprovalsForMe.length})`} to="/my-work/approvals" empty={ws.pendingApprovalsForMe.length === 0 ? 'Không có tờ trình nào chờ bạn.' : undefined}>
        {ws.pendingApprovalsForMe.slice(0, 5).map((a) => (
          <div key={a.id} className="text-sm truncate py-1.5 border-b border-gray-100 font-medium text-gray-800">{a.title}</div>
        ))}
      </SectionCard>
      <SectionCard title="Hộp thư & Thông báo" to="/my-work/inbox">
        <p className="text-sm text-gray-600">{ws.unreadMail} mail chưa đọc · {ws.unreadNotifications} thông báo chưa đọc</p>
      </SectionCard>
    </div>
  );
}

export function MyTasksPage() {
  const ws = useWs();
  return (
    <SectionCard title={`Việc của tôi (${ws.openTasks.length} đang mở)`} to="/tasks" empty={ws.openTasks.length === 0 ? 'Bạn không có việc nào đang mở.' : undefined}>
      {ws.openTasks.map((t) => (
        <div key={t.id} className="text-sm flex justify-between gap-2 border-b border-gray-100 py-2">
          <span className="font-medium text-gray-800 truncate">{t.title}</span>
          <span className="text-xs text-gray-500 flex-shrink-0">{t.dueDate || '—'} · {t.status}</span>
        </div>
      ))}
    </SectionCard>
  );
}

export function MyApprovalsPage() {
  const ws = useWs();
  return (
    <SectionCard title={`Chờ tôi duyệt (${ws.pendingApprovalsForMe.length})`} to="/approvals" empty={ws.pendingApprovalsForMe.length === 0 ? 'Không có tờ trình nào chờ bạn.' : undefined}>
      {ws.pendingApprovalsForMe.map((a) => (
        <div key={a.id} className="text-sm flex justify-between gap-2 border-b border-gray-100 py-2">
          <span className="font-medium text-gray-800 truncate">{a.title}</span>
          <span className="text-xs text-gray-500 flex-shrink-0">{a.entityType}</span>
        </div>
      ))}
    </SectionCard>
  );
}

export function MyCalendarPage() {
  const ws = useWs();
  return (
    <SectionCard title={`Lịch hôm nay ${ws.todayStr}`} to="/calendar" empty={ws.todayMeetings.length === 0 ? 'Hôm nay không có cuộc họp nào.' : undefined}>
      {ws.todayMeetings.map((m) => (
        <div key={m.id} className="text-sm flex justify-between gap-2 border-b border-gray-100 py-2">
          <span className="font-medium text-gray-800 truncate">{m.title}</span>
          <span className="text-xs text-blue-600 flex-shrink-0">{(m.startTime || '').slice(11, 16)} – {(m.endTime || '').slice(11, 16)}</span>
        </div>
      ))}
    </SectionCard>
  );
}

export function MyInboxPage() {
  const ws = useWs();
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <SectionCard title={`Thông báo (${ws.unreadNotifications} chưa đọc)`} to="/notifications" empty={ws.notifications.length === 0 ? 'Không có thông báo.' : undefined}>
        {ws.notifications.slice(0, 10).map((n: any) => (
          <div key={n.id} className="text-sm truncate py-1.5 border-b border-gray-100 text-gray-800">{n.title || n.message}</div>
        ))}
      </SectionCard>
      <SectionCard title={`Hộp thư (${ws.unreadMail} chưa đọc)`} to="/mail">
        <p className="text-sm text-gray-600">Mở hộp thư để đọc và xử lý email.</p>
      </SectionCard>
    </div>
  );
}

export function MyKpiPage() {
  const ws = useWs();
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5">
      <h2 className="text-sm font-bold text-gray-900 mb-3">KPI cá nhân</h2>
      <p className="text-sm text-gray-600">Tổng việc: {ws.myTasks.length} · Đang mở: {ws.openTasks.length} · Quá hạn: {ws.overdueTasks.length}</p>
      <p className="text-sm text-gray-600 mt-1">
        Tỷ lệ hoàn thành: {ws.completionRate === null ? '— (chưa có việc nào)' : `${ws.completionRate}%`}
      </p>
    </div>
  );
}
