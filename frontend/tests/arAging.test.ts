import { describe, expect, it } from 'vitest';
import {
  ageArRecords, sumBucket, countBucket, classifyBucket, ageDays, isOpenAr,
} from '../components/finance/arAging';

const TODAY = '2026-10-02';
const daysAgo = (n: number) => {
  const d = new Date(`${TODAY}T00:00:00`);
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

describe('arAging — xếp tuổi nợ', () => {
  it('classifyBucket đúng ngưỡng 30/60/90', () => {
    expect(classifyBucket(null)).toBe('current');
    expect(classifyBucket(0)).toBe('current');
    expect(classifyBucket(30)).toBe('current');
    expect(classifyBucket(31)).toBe('b31_60');
    expect(classifyBucket(60)).toBe('b31_60');
    expect(classifyBucket(61)).toBe('b61_90');
    expect(classifyBucket(90)).toBe('b61_90');
    expect(classifyBucket(91)).toBe('bad');
  });

  it('isOpenAr loại paid/cancelled (mọi case)', () => {
    expect(isOpenAr({ status: 'pending' })).toBe(true);
    expect(isOpenAr({ status: 'Paid' })).toBe(false);
    expect(isOpenAr({ status: 'CANCELLED' })).toBe(false);
    expect(isOpenAr({})).toBe(true);
  });

  it('ageArRecords gom đúng bucket + sắp xếp giảm dần', () => {
    const rows = ageArRecords([
      { id: 'a', customer: 'X', amount: '1000', dueDate: daysAgo(10), status: 'pending' },
      { id: 'b', customer: 'Y', amount: 8000, dueDate: daysAgo(45), status: 'pending' },
      { id: 'c', customer: 'Z', amount: 5000, dueDate: daysAgo(100), status: 'pending' },
      { id: 'd', customer: 'Paid', amount: 99999, dueDate: daysAgo(200), status: 'paid' },
      { id: 'e', customer: 'NoDate', amount: 100, status: 'pending' },
    ], TODAY);
    expect(rows.map((r) => r.id)).toEqual(['b', 'c', 'a', 'e']);
    expect(rows.find((r) => r.id === 'a')?.bucket).toBe('current');
    expect(rows.find((r) => r.id === 'b')?.bucket).toBe('b31_60');
    expect(rows.find((r) => r.id === 'c')?.bucket).toBe('bad');
    expect(rows.find((r) => r.id === 'e')?.bucket).toBe('current');
    expect(sumBucket(rows, 'b31_60')).toBe(8000);
    expect(countBucket(rows, 'bad')).toBe(1);
  });

  it('ageDays chịu được datetime + chuỗi rác', () => {
    expect(ageDays('2026-09-22', TODAY)).toBe(10);
    expect(ageDays('not-a-date', TODAY)).toBeNull();
    expect(ageDays(undefined, TODAY)).toBeNull();
  });
});
