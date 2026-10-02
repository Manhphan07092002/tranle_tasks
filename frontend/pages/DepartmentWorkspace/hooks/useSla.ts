import { useEffect, useState } from 'react';
import { apiFetch } from '../../../services/api';

export interface SlaPolicy {
  id: string;
  ticketType: string;
  priority: string;
  responseHours: number;
  resolveHours: number;
}

export type SlaTicketType = 'cs' | 'om' | 'it';

const CLOSED = new Set(['closed', 'resolved', 'done', 'completed', 'cancelled', 'rejected']);

/** Chuẩn hóa priority/severity — mirror backend/schedulers/slaEscalation.ts */
export function normalizePriority(raw: unknown): string {
  const v = String(raw || '').toLowerCase().trim();
  if (v === 'critical' || v === 'urgent' || v === 'khẩn cấp') return 'critical';
  if (v === 'high' || v === 'major' || v === 'cao') return 'high';
  if (v === 'low' || v === 'minor' || v === 'thấp') return 'low';
  return 'medium';
}

function priorityOf(type: SlaTicketType, t: any): string {
  if (type === 'om') return normalizePriority(t.severity);
  return normalizePriority(t.priority);
}

/** true khi ticket mở mà đã quá response SLA (theo policy hoặc slaDueAt do server gán). */
export function isSlaBreached(type: SlaTicketType, t: any, policies: SlaPolicy[], now = Date.now()): boolean {
  if (!t || CLOSED.has(String(t.status || '').toLowerCase())) return false;
  if (t.slaDueAt) {
    const d = new Date(t.slaDueAt).getTime();
    if (Number.isFinite(d)) return d < now;
  }
  const base = t.createdAt || t.time;
  if (!base) return false;
  const created = new Date(String(base).length <= 10 ? `${base}T00:00:00` : base).getTime();
  if (!Number.isFinite(created)) return false;
  const p = policies.find((x) => x.ticketType === type && x.priority === priorityOf(type, t));
  if (!p) return false;
  return now - created > Number(p.responseHours) * 3600 * 1000;
}

/** Nạp policies SLA 1 lần — dùng cho badge "Quá SLA" ở CSKH/O&M/IT. */
export function useSlaPolicies() {
  const [policies, setPolicies] = useState<SlaPolicy[]>([]);
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await apiFetch('/api/sla-policies');
        if (mounted && res.ok) {
          const data = await res.json();
          if (mounted && Array.isArray(data)) setPolicies(data);
        }
      } catch {
        /* offline -> fallback heuristic ở component */
      }
    })();
    return () => { mounted = false; };
  }, []);
  return policies;
}
