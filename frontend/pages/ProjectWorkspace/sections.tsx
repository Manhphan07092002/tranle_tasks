import { useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { ProjectChainTimeline } from '../../components/workflow/ProjectChainTimeline';
import { useData } from '../../contexts/DataContext';
import { useNotifications } from '../../contexts/NotificationContext';
import {
  getProjectMilestones, saveProjectMilestone,
  getProjectMembers, addProjectMember, removeProjectMember,
  getProjectDepartments, addProjectDepartment, removeProjectDepartment,
  getProjectReports, saveProjectReport,
} from '../../services/projectService';import { departmentWorkspaceService } from '../../services/departmentWorkspaceService';
import type { useProjectWorkspace } from './hooks/useProjectWorkspace';

type Ws = ReturnType<typeof useProjectWorkspace>;
function useWs(): Ws {
  return useOutletContext<Ws>();
}

export function ProjOverviewPage() {
  const ws = useWs();
  const p: any = ws.project;
  return (
    <div className="grid md:grid-cols-3 gap-4">
      <div className="bg-white rounded-2xl border p-5">
        <div className="text-xs font-bold text-slate-500 uppercase">Trạng thái</div>
        <div className="text-lg font-black mt-1">{p?.status || '—'}</div>
        <div className="text-xs text-slate-500 mt-1">Khách hàng: {p?.clientName || '—'}</div>
      </div>
      <div className="bg-white rounded-2xl border p-5">
        <div className="text-xs font-bold text-slate-500 uppercase">Ngân sách / Trúng thầu</div>
        <div className="text-lg font-black mt-1">{Number(p?.winningPrice || p?.budget || 0).toLocaleString('vi-VN')} đ</div>
        <div className="text-xs text-slate-500 mt-1">Giai đoạn: {p?.phase || '—'}</div>
      </div>
      <div className="bg-white rounded-2xl border p-5">
        <div className="text-xs font-bold text-slate-500 uppercase">Hợp đồng / Báo cáo</div>
        <div className="text-lg font-black mt-1">{ws.contracts.length} / {ws.reports.length}</div>
        <Link to="docs" className="text-xs font-semibold text-emerald-700 hover:underline">Mở tài liệu & báo cáo</Link>
      </div>
    </div>
  );
}

export function ProjChainPage() {
  const ws = useWs();
  return <ProjectChainTimeline project={{ id: ws.projectId, ...(ws.project as any) }} onChanged={ws.reload} />;
}

export function ProjSchedulePage() {
  const ws = useWs();
  const { showToast } = useNotifications();
  const [milestones, setMilestones] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const load = async () => {
    try {
      setMilestones(await getProjectMilestones(ws.projectId));
    } catch { setMilestones([]); }
  };
  useEffect(() => { load(); }, [ws.projectId]);
  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      await saveProjectMilestone(ws.projectId, { title: title.trim(), dueDate: dueDate || undefined, status: 'pending' });
      setTitle(''); setDueDate(''); load();
      showToast({ type: 'success', title: 'Đã tạo mốc', message: title.trim() });
    } catch {
      showToast({ type: 'error', title: 'Tạo mốc thất bại', message: 'Vui lòng thử lại.' });
    }
  };
  const advance = async (m: any) => {
    try {
      await saveProjectMilestone(ws.projectId, { id: m.id, status: 'completed' });
      load();
    } catch {
      showToast({ type: 'error', title: 'Cập nhật thất bại', message: 'Vui lòng thử lại.' });
    }
  };
  return (
    <div className="space-y-4">
      <form onSubmit={create} className="flex flex-wrap gap-2 bg-white rounded-2xl border p-4">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Tên mốc (VD: Nghiệm thu phần móng)" className="flex-1 min-w-[200px] px-3 py-2 border rounded-xl text-sm outline-none" />
        <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="px-3 py-2 border rounded-xl text-sm outline-none" />
        <button className="px-4 py-2 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700">Thêm mốc</button>
      </form>
      {milestones.length === 0 ? (
        <div className="py-10 text-center text-sm text-gray-400">Chưa có mốc tiến độ nào.</div>
      ) : milestones.map((m: any) => (
        <div key={m.id} className="flex justify-between items-center bg-white rounded-2xl border p-4 text-sm">
          <div>
            <div className="font-bold">{m.title}</div>
            <div className="text-xs text-gray-500">Hạn: {m.dueDate || '—'} · {m.status}</div>
          </div>
          {m.status !== 'completed' && (
            <button onClick={() => advance(m)} className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg">Hoàn thành</button>
          )}
        </div>
      ))}
    </div>
  );
}

export function ProjFinancePage() {
  const ws = useWs();
  const { showToast } = useNotifications();
  const [ars, setArs] = useState<any[]>([]);
  const [milestones, setMilestones] = useState<any[]>([]);
  const load = async () => {
    try {
      const [allAr, ms] = await Promise.all([
        departmentWorkspaceService.getRecords('dept-fin', 'ar'),
        getProjectMilestones(ws.projectId),
      ]);
      setArs((allAr || []).filter((a: any) => a.projectId === ws.projectId || a.project === (ws.project as any)?.name));
      setMilestones(ms || []);
    } catch { setArs([]); setMilestones([]); }
  };
  useEffect(() => { load(); }, [ws.projectId]);
  const msIds = new Set(ars.map((a: any) => a.milestoneId).filter(Boolean));
  const pendingMs = milestones.filter((m: any) => m.status === 'completed' && !msIds.has(m.id));
  const createAr = async (m: any) => {
    try {
      await departmentWorkspaceService.convertMilestoneToAr({
        milestoneId: m.id, projectId: ws.projectId, projectName: (ws.project as any)?.name || 'Dự án',
        milestoneTitle: m.title, amount: Number((ws.project as any)?.winningPrice ?? (ws.project as any)?.budget ?? 0),
        customer: (ws.project as any)?.clientName || (ws.project as any)?.investor || 'Chủ đầu tư', dueDate: m.dueDate,
      });
      load();
      showToast({ type: 'success', title: 'Đã tạo AR', message: `Từ mốc "${m.title}"` });
    } catch {
      showToast({ type: 'error', title: 'Tạo AR thất bại', message: 'Vui lòng thử lại.' });
    }
  };
  return (
    <div className="space-y-4">
      {pendingMs.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm">
          <div className="font-bold mb-2">Mốc đã xong chưa có AR ({pendingMs.length})</div>
          {pendingMs.map((m: any) => (
            <div key={m.id} className="flex justify-between items-center py-1">
              <span>{m.title}</span>
              <button onClick={() => createAr(m)} className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg">Tạo AR 1-click</button>
            </div>
          ))}
        </div>
      )}
      {ars.length === 0 ? (
        <div className="py-10 text-center text-sm text-gray-400">Chưa có khoản phải thu nào.</div>
      ) : ars.map((a: any) => (
        <div key={a.id} className="flex justify-between bg-white rounded-2xl border p-4 text-sm">
          <span className="font-bold">{a.desc_text || a.id}</span>
          <span>{Number(a.amount || 0).toLocaleString('vi-VN')} đ · {a.status}</span>
        </div>
      ))}
    </div>
  );
}

export function ProjDocsPage() {
  const ws = useWs();
  const { showToast } = useNotifications();
  const [reports, setReports] = useState<any[]>(ws.reports);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const load = async () => {
    try { setReports(await getProjectReports(ws.projectId)); } catch { /* giữ dữ liệu cũ */ }
  };
  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      await saveProjectReport(ws.projectId, { title: title.trim(), content, status: 'draft', progress: 0 });
      setTitle(''); setContent(''); load(); ws.reload();
      showToast({ type: 'success', title: 'Đã tạo báo cáo', message: title.trim() });
    } catch {
      showToast({ type: 'error', title: 'Tạo báo cáo thất bại', message: 'Vui lòng thử lại.' });
    }
  };
  return (
    <div className="space-y-4">
      <form onSubmit={create} className="bg-white rounded-2xl border p-4 space-y-2">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Tiêu đề báo cáo" className="w-full px-3 py-2 border rounded-xl text-sm outline-none" />
        <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Nội dung (không bắt buộc)" rows={2} className="w-full px-3 py-2 border rounded-xl text-sm outline-none" />
        <button className="px-4 py-2 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700">Thêm báo cáo</button>
      </form>
      {reports.length === 0 ? (
        <div className="py-10 text-center text-sm text-gray-400">Chưa có báo cáo nào.</div>
      ) : reports.map((r: any) => (
        <div key={r.id} className="bg-white rounded-2xl border p-4 text-sm">
          <div className="font-bold">{r.title}</div>
          <div className="text-xs text-gray-500 mt-0.5">Tiến độ {r.progress ?? 0}% · {r.status}</div>
          {r.content && <div className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{r.content}</div>}
        </div>
      ))}
    </div>
  );
}

export function ProjTeamPage() {
  const ws = useWs();
  const { showToast } = useNotifications();
  const { users = [], departments = [] } = useData();
  const [members, setMembers] = useState<any[]>([]);
  const [depts, setDepts] = useState<any[]>((ws.project as any)?.participatingDepartments || []);
  const [pickUser, setPickUser] = useState('');
  const [pickDept, setPickDept] = useState('');
  const load = async () => {
    try {
      const [m, d] = await Promise.all([getProjectMembers(ws.projectId), getProjectDepartments(ws.projectId)]);
      setMembers(m); setDepts(d);
    } catch { /* giữ dữ liệu cũ */ }
  };
  useEffect(() => { load(); }, [ws.projectId]);
  const addMember = async () => {
    if (!pickUser) return;
    try {
      await addProjectMember(ws.projectId, pickUser, 'member');
      setPickUser(''); load();
      showToast({ type: 'success', title: 'Đã thêm thành viên', message: '' });
    } catch {
      showToast({ type: 'error', title: 'Thêm thất bại', message: 'Vui lòng thử lại.' });
    }
  };
  const addDept = async () => {
    if (!pickDept) return;
    try {
      await addProjectDepartment(ws.projectId, pickDept, 'member');
      setPickDept(''); load(); ws.reload();
    } catch {
      showToast({ type: 'error', title: 'Thêm thất bại', message: 'Vui lòng thử lại.' });
    }
  };
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div className="bg-white rounded-2xl border p-4 space-y-2">
        <div className="text-sm font-bold">Thành viên ({members.length})</div>
        <div className="flex gap-2">
          <select value={pickUser} onChange={(e) => setPickUser(e.target.value)} className="flex-1 px-3 py-2 border rounded-xl text-sm outline-none">
            <option value="">— Chọn nhân sự —</option>
            {(users || []).map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          <button onClick={addMember} className="px-3 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl">Thêm</button>
        </div>
        {members.map((m: any) => (
          <div key={m.userId} className="flex justify-between items-center text-sm border-b border-gray-100 py-1.5">
            <span>{m.name || m.userId} <span className="text-xs text-gray-400">· {m.role}</span></span>
            <button
              onClick={async () => {
                try {
                  await removeProjectMember(ws.projectId, m.userId);
                  load();
                } catch {
                  showToast({ type: 'error', title: 'Xóa thất bại', message: 'Vui lòng thử lại.' });
                }
              }}
              className="text-xs font-bold text-rose-600 hover:underline"
            >
              Xóa
            </button>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-2xl border p-4 space-y-2">
        <div className="text-sm font-bold">Phòng ban tham gia ({depts.length})</div>
        <div className="flex gap-2">
          <select value={pickDept} onChange={(e) => setPickDept(e.target.value)} className="flex-1 px-3 py-2 border rounded-xl text-sm outline-none">
            <option value="">— Chọn phòng ban —</option>
            {(departments || []).map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <button onClick={addDept} className="px-3 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl">Thêm</button>
        </div>
        {depts.map((d: any) => (
          <div key={d.departmentId} className="flex justify-between items-center text-sm border-b border-gray-100 py-1.5">
            <span>{d.departmentName} <span className="text-xs text-gray-400">· {d.role}</span></span>
            <button
              onClick={async () => {
                try {
                  await removeProjectDepartment(ws.projectId, d.departmentId);
                  load(); ws.reload();
                } catch {
                  showToast({ type: 'error', title: 'Xóa thất bại', message: 'Vui lòng thử lại.' });
                }
              }}
              className="text-xs font-bold text-rose-600 hover:underline"
            >
              Xóa
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
