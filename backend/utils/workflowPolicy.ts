/**
 * Workflow state machine for approval-gated records (reports, revenue reports).
 *
 * The hole this closes: an `Approved` record was fully mutable. `PUT` only ever
 * compared permissions, so after sign-off anybody who could still edit the row —
 * the department head, the director — could rewrite the title and content while
 * `status` stayed `Approved`. `approvedAt`/`approvedBy` kept pointing at the
 * original verdict, so the stored record no longer matched the approval that
 * justified it, and a re-save refreshed `approvedBy` to whoever happened to
 * press save.
 *
 * Rule (agreed with the product owner): `Approved` freezes the substance —
 * title, content and figures. `Pending *` states stay editable by the author,
 * because that is how a returned report gets fixed and resubmitted. Unfreezing
 * an approved record is an explicit act reserved for Admin/Director, and it
 * clears the approval fields and writes an audit event.
 */

export const APPROVED = 'Approved';
export const REJECTED = 'Rejected';

/** Fields whose value is part of what a reviewer approved. */
export type FrozenField = 'title' | 'content' | 'totalPreTax' | 'totalDelivered' | 'totalCumulative';

const FROZEN_CONTENT_FIELDS: FrozenField[] = ['title', 'content'];
const FROZEN_REVENUE_FIELDS: FrozenField[] = ['title', 'content', 'totalPreTax', 'totalDelivered', 'totalCumulative'];

export function frozenFieldsFor(kind: 'report' | 'revenue'): FrozenField[] {
  return kind === 'revenue' ? [...FROZEN_REVENUE_FIELDS] : [...FROZEN_CONTENT_FIELDS];
}

/** A verdict is a status *change* into Approved/Rejected, not merely a payload that names one. */
export function isVerdictChange(fromStatus: string | null | undefined, toStatus: string | null | undefined): boolean {
  return fromStatus !== toStatus && (toStatus === APPROVED || toStatus === REJECTED);
}

export function isDecisionStatus(status: string | null | undefined): boolean {
  return status === APPROVED || status === REJECTED;
}

/**
 * `attachments` is re-derived from the documents table on every save, so it
 * differs between two otherwise identical payloads. It is metadata about the
 * file rows, not part of the reviewed substance.
 */
function stripInjectedKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripInjectedKeys);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (k === 'attachments') continue;
      out[k] = stripInjectedKeys(v);
    }
    return out;
  }
  return value;
}

function tryParseJson(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return value;
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

/** Stable stringify with sorted keys so key order never reads as a change. */
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(',')}}`;
}

/**
 * Money arrives as `1000`, `"1000"`, `1000.00` or `"1.000,00"` depending on which
 * screen typed it. Comparing as strings would flag a pure formatting change as
 * tampering and block a legitimate no-op save, so numeric-looking values compare
 * numerically.
 */
function numericValue(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed === '') return null;
  const normalized = /^-?[\d.,\s]+$/.test(trimmed) ? trimmed.replace(/[\s,](?=\d{3}\b)/g, '').replace(/\.(?=\d{3}\b)/g, '').replace(',', '.') : trimmed;
  if (!/^-?\d*\.?\d+$/.test(normalized)) return null;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

export function valuesEqual(a: unknown, b: unknown): boolean {
  const na = numericValue(a);
  const nb = numericValue(b);
  if (na !== null || nb !== null) return na !== null && nb !== null && na === nb;

  const ca = stripInjectedKeys(tryParseJson(a));
  const cb = stripInjectedKeys(tryParseJson(b));
  if (typeof ca === 'object' && ca !== null) return stableStringify(ca) === stableStringify(cb);
  return stableStringify(ca) === stableStringify(cb);
}

/**
 * Which frozen fields actually changed. `null`/`undefined` on either side means
 * "not provided", which is not the same as "changed" — an absent field must not
 * be reported as tampering.
 */
export function changedFrozenFields(
  existing: Record<string, unknown>,
  next: Record<string, unknown>,
  fields: FrozenField[],
): FrozenField[] {
  return fields.filter((field) => {
    const before = existing[field];
    const after = next[field];
    if (after === undefined) return false;
    if (before === null || before === undefined) return after !== null && after !== '';
    return !valuesEqual(before, after);
  });
}

export interface FrozenGuard {
  /** The record was Approved and this request is not the explicit reopen act. */
  isApproved: boolean;
  /** Approved -> something else: needs Admin/Director. */
  isReopen: boolean;
  /** Frozen fields this request would rewrite. */
  changed: FrozenField[];
}

/**
 * Pure inspection of an update against the current row. The route decides what to
 * do with it; this only reports the facts so the rule stays testable on its own.
 */
export function inspectUpdate(
  kind: 'report' | 'revenue',
  existing: Record<string, unknown>,
  next: Record<string, unknown>,
): FrozenGuard {
  const currentStatus = (existing.status as string) ?? null;
  const nextStatus = (next.status as string) ?? currentStatus;
  const isApproved = currentStatus === APPROVED;
  const isReopen = isApproved && nextStatus !== APPROVED;
  const changed = changedFrozenFields(existing, next, frozenFieldsFor(kind));
  return { isApproved, isReopen, changed };
}
