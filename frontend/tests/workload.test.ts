import { describe, expect, it } from 'vitest';
import { classifyLoad } from '../components/DepartmentWorkspace/WorkloadTab';

describe('WorkloadTab classifyLoad', () => {
  it('vượt định mức -> OVERLOADED', () => {
    expect(classifyLoad(41, 40)).toBe('OVERLOADED');
  });

  it('từ 80% định mức -> AT_CAPACITY', () => {
    expect(classifyLoad(32, 40)).toBe('AT_CAPACITY');
    expect(classifyLoad(40, 40)).toBe('AT_CAPACITY');
  });

  it('dưới 80% -> UNDERUTILIZED', () => {
    expect(classifyLoad(31.9, 40)).toBe('UNDERUTILIZED');
    expect(classifyLoad(0, 40)).toBe('UNDERUTILIZED');
  });
});
