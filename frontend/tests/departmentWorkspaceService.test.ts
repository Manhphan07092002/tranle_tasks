import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { departmentWorkspaceService } from '../services/departmentWorkspaceService';

function mockFetchOnce(status: number, body: unknown) {
  const fetchMock = vi.fn(async () =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

beforeEach(() => {
  localStorage.setItem('tranle_token', 'test-token');
});

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe('departmentWorkspaceService — chịu lỗi API', () => {
  it('getRecords 200 mảng -> trả mảng', async () => {
    mockFetchOnce(200, [{ id: 'c1' }]);
    const data = await departmentWorkspaceService.getRecords('dept-legal', 'contracts');
    expect(data).toEqual([{ id: 'c1' }]);
  });

  it('getRecords 200 nhưng không phải mảng -> chuẩn hóa về [] (UI .map an toàn)', async () => {
    mockFetchOnce(200, { error: 'weird' });
    const data = await departmentWorkspaceService.getRecords('dept-legal', 'contracts');
    expect(data).toEqual([]);
  });

  it('getRecords 403 -> throw kèm status + message server', async () => {
    mockFetchOnce(403, { error: 'Forbidden: Bạn chỉ được xem dữ liệu của phòng ban mình' });
    const err: any = await departmentWorkspaceService
      .getRecords('dept-legal', 'contracts')
      .catch((e) => e);
    expect(err).toBeInstanceOf(Error);
    expect(err.status).toBe(403);
    expect(err.message).toContain('phòng ban mình');
  });

  it('getKpis 200 object -> trả object', async () => {
    mockFetchOnce(200, { totalContracts: 5 });
    const data = await departmentWorkspaceService.getKpis('dept-legal');
    expect(data).toEqual({ totalContracts: 5 });
  });

  it('getKpis 403 -> throw kèm status', async () => {
    mockFetchOnce(403, { error: 'Forbidden' });
    const err: any = await departmentWorkspaceService.getKpis('dept-legal').catch((e) => e);
    expect(err.status).toBe(403);
  });
});
