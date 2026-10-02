import { useMemo, useState } from 'react';
import { TaskStatus } from '../../types';

export type WorkloadState = 'OVERLOADED' | 'AT_CAPACITY' | 'UNDERUTILIZED';

/** Giờ ước tính mặc định cho task thiếu estimatedHours. */
export const DEFAULT_EST_HOURS = 2;
/** Trần định mức tuần (168h = 24×7) chống nhập liệu sai. */
export const MAX_CAPACITY_HOURS = 168;

export interface MemberLoad {
  userId: string;
  name: string;
  openTasks: number;
  estHours: number;
  overdue: number;
  capacity: number;
  state: WorkloadState;
}

export function classifyLoad(estHours: number, capacity: number): WorkloadState {  if (estHours > capacity) return 'OVERLOADED';
  if (estHours >= capacity * 0.8) return 'AT_CAPACITY';
  return 'UNDERUTILIZED';
}

const STATE_META: Record<WorkloadState, { label: string; cls: string }> = {
  OVERLOADED: { label: 'Quá tải', cls: 'bg-rose-100 text-rose-700' },
  AT_CAPACITY: { label: 'Vừa đủ', cls: 'bg-amber-100 text-amber-700' },
  UNDERUTILIZED: { label: 'Còn dư địa', cls: 'bg-emerald-100 text-emerald-700' },
};

interface WorkloadTabProps {
  deptTasks: any[];
  deptMembers: any[];
  capacity: number;
  todayStr: string;
  canEditCapacity: boolean;
  onSaveCapacity: (hours: number) => Promise<void>;
}

/** Bảng tải công việc Employee × việc mở / giờ ước tính / định mức / quá hạn. */
export function WorkloadTab({ deptTasks, deptMembers, capacity, todayStr, canEditCapacity, onSaveCapacity }: WorkloadTabProps) {
  const [draft, setDraft] = useState<string>(String(capacity));
  const [saving, setSaving] = useState(false);

  const rows = useMemo<MemberLoad[]>(() => {
    return (deptMembers || []).map((m: any) => {
      const mine = (deptTasks || []).filter(
        (t: any) => t.status !== TaskStatus.DONE && ((t.assignees || []).includes(m.id)),
      );
      const estHours = mine.reduce((s: number, t: any) => s + (Number(t.estimatedHours) || DEFAULT_EST_HOURS), 0);
      const overdue = mine.filter((t: any) => t.dueDate && t.dueDate < todayStr).length;
      return {
        userId: m.id,
        name: m.name || m.id,
        openTasks: mine.length,
        estHours: Math.round(estHours * 10) / 10,
        overdue,
        capacity,
        state: classifyLoad(estHours, capacity),
      };
    }).sort((a, b) => b.estHours - a.estHours);
  }, [deptTasks, deptMembers, capacity, todayStr]);

  const overloaded = rows.filter((r) => r.state === 'OVERLOADED').length;

  const save = async () => {
    const h = Math.min(MAX_CAPACITY_HOURS, Math.max(1, Math.floor(Number(draft) || capacity)));
    setSaving(true);
    try {
      await onSaveCapacity(h);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-gray-200 dark:border-slate-700">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Định mức phòng: {capacity}h/tuần · {overloaded} người quá tải
        </span>
        {canEditCapacity && (
          <span className="flex items-center gap-2 ml-auto">
            <input
              type="number"
              min={1}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="40"
              className="w-20 px-2 py-1.5 border border-gray-200 rounded-lg text-sm outline-none"
            />
            <button onClick={save} disabled={saving} className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 disabled:opacity-50">
              {saving ? '...' : 'Lưu định mức'}
            </button>
          </span>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="py-16 text-center text-slate-400 text-sm">Chưa có thành viên nào trong phòng ban</div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b border-gray-100">
                <th className="px-4 py-3 font-bold">Nhân sự</th>
                <th className="px-4 py-3 font-bold text-right">Việc mở</th>
                <th className="px-4 py-3 font-bold text-right">Ước tính (h)</th>
                <th className="px-4 py-3 font-bold text-right">Quá hạn</th>
                <th className="px-4 py-3 font-bold text-right">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const meta = STATE_META[r.state];
                const pct = Math.min(100, Math.round((r.estHours / Math.max(1, r.capacity)) * 100));
                return (
                  <tr key={r.userId} className="border-b border-gray-50 last:border-0">
                    <td className="px-4 py-3 font-semibold text-slate-800">{r.name}</td>
                    <td className="px-4 py-3 text-right">{r.openTasks}</td>
                    <td className="px-4 py-3 text-right">
                      {r.estHours}
                      <div className="h-1.5 bg-gray-100 rounded-full mt-1 overflow-hidden">
                        <div className={`h-full ${r.state === 'OVERLOADED' ? 'bg-rose-500' : r.state === 'AT_CAPACITY' ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${pct}%` }} />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-rose-600">{r.overdue || '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${meta.cls}`}>{meta.label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
