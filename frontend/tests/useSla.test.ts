import { describe, expect, it } from 'vitest';
import { normalizePriority, isSlaBreached, type SlaPolicy } from '../pages/DepartmentWorkspace/hooks/useSla';

const POLICIES: SlaPolicy[] = [
  { id: 'sla-cs-high', ticketType: 'cs', priority: 'high', responseHours: 8, resolveHours: 72 },
  { id: 'sla-cs-medium', ticketType: 'cs', priority: 'medium', responseHours: 24, resolveHours: 120 },
];

const NOW = new Date('2026-10-02T08:00:00.000Z').getTime();
const hoursAgo = (h: number) => new Date(NOW - h * 3600 * 1000).toISOString();

describe('useSla helpers', () => {
  it('normalizePriority gom severity về 4 mức', () => {
    expect(normalizePriority('critical')).toBe('critical');
    expect(normalizePriority('major')).toBe('high');
    expect(normalizePriority('minor')).toBe('low');
    expect(normalizePriority('')).toBe('medium');
  });

  it('ticket đóng không bao giờ quá SLA', () => {
    expect(isSlaBreached('cs', { status: 'Resolved', createdAt: hoursAgo(100) }, POLICIES, NOW)).toBe(false);
    expect(isSlaBreached('cs', { status: 'closed', createdAt: hoursAgo(100) }, POLICIES, NOW)).toBe(false);
  });

  it('ticket high quá 8h -> breach, trong hạn -> không', () => {
    const old = { status: 'open', priority: 'high', createdAt: hoursAgo(9) };
    const fresh = { status: 'open', priority: 'high', createdAt: hoursAgo(7) };
    expect(isSlaBreached('cs', old, POLICIES, NOW)).toBe(true);
    expect(isSlaBreached('cs', fresh, POLICIES, NOW)).toBe(false);
  });

  it('slaDueAt quá khứ -> breach bất kể policy', () => {
    const t = { status: 'open', priority: 'low', createdAt: hoursAgo(1), slaDueAt: hoursAgo(0.5) };
    expect(isSlaBreached('cs', t, [], NOW)).toBe(true);
  });

  it('thiếu createdAt hoặc policy -> không breach (an toàn)', () => {
    expect(isSlaBreached('cs', { status: 'open' }, POLICIES, NOW)).toBe(false);
    expect(isSlaBreached('cs', { status: 'open', createdAt: hoursAgo(100) }, [], NOW)).toBe(false);
  });
});
