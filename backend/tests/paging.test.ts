import { describe, expect, it } from 'vitest';
import { MAX_LIMIT, MAX_PAGE, resolvePaging, resolveOffsetPaging } from '../utils/paging.js';

/**
 * The hole: `parseInt(req.query.limit) || 50` put the caller's string straight
 * into SQL, so `?limit=100000000` asked MySQL for the whole table. On
 * `/api/admin/activity-logs` that is the entire company-wide audit log, on
 * `/api/mail/inbox` it is an IMAP sequence range big enough to stall the flow.
 */
describe('resolvePaging — chặn limit không giới hạn', () => {
  it('giới hạn trên bằng MAX_LIMIT', () => {
    expect(resolvePaging({ limit: '100000000' }).limit).toBe(MAX_LIMIT);
    expect(resolvePaging({ limit: '999999' }).limit).toBe(MAX_LIMIT);
    expect(resolvePaging({ limit: '25' }).limit).toBe(25);
  });

  it('giá trị rác rơi về mặc định, không truyền NaN xuống SQL', () => {
    for (const q of [{}, { limit: 'abc' }, { limit: '-5' }, { limit: '0' }, { limit: '' }, { limit: 'NaN' }]) {
      expect(resolvePaging(q).limit).toBe(50);
    }
  });

  it('giới hạn page để offset không vượt quá xa', () => {
    expect(resolvePaging({ page: '99999999' }).page).toBe(MAX_PAGE);
    // Dạng khoa học vẫn là số hữu hạn nên bị chặn trên chứ không rơi về mặc định.
    expect(resolvePaging({ page: '1e9' }).page).toBe(MAX_PAGE);
    // NaN thì rơi về trang 1.
    expect(resolvePaging({ page: 'abc' }).page).toBe(1);
    expect(resolvePaging({ page: '3', limit: '10' }).offset).toBe(20);
  });

  it('offset luôn ở mức mà một lần quét bảng chịu được', () => {
    // page=MAX_PAGE, limit=MAX_LIMIT là trần offset hợp lệ lớn nhất.
    const { offset } = resolvePaging({ page: String(MAX_PAGE), limit: String(MAX_LIMIT) });
    expect(offset).toBe((MAX_PAGE - 1) * MAX_LIMIT);
    expect(offset).toBeLessThan(200_000);
  });

  it('mảng query do ?limit=1&limit=2 không lách được clamp', () => {
    expect(resolvePaging({ limit: ['1', '1000000'] }).limit).toBe(1);
    expect(resolvePaging({ limit: ['1000000', '1'] }).limit).toBe(MAX_LIMIT);
  });

  it('tôn trọng trần riêng cho từng endpoint', () => {
    expect(resolvePaging({ limit: '500' }, { maxLimit: 100 }).limit).toBe(100);
    expect(resolvePaging({ limit: '500' }, { defaultLimit: 20, maxLimit: 30 }).limit).toBe(30);
  });
});

describe('resolveOffsetPaging — DB browser dùng ?offset=', () => {
  it('offset âm hoặc NaN trở về 0', () => {
    expect(resolveOffsetPaging({ offset: '-10' }, 20, 100).offset).toBe(0);
    expect(resolveOffsetPaging({ offset: 'abc' }, 20, 100).offset).toBe(0);
    expect(resolveOffsetPaging({}, 20, 100).offset).toBe(0);
  });

  it('offset lớn vẫn bị chặn trên', () => {
    expect(resolveOffsetPaging({ offset: '999999999999' }, 20, 100).offset).toBeLessThanOrEqual(MAX_LIMIT * MAX_PAGE);
  });

  it('giữ mặc định limit khi không truyền', () => {
    expect(resolveOffsetPaging({}, 20, 100).limit).toBe(20);
    expect(resolveOffsetPaging({ limit: '100' }, 20, 100).limit).toBe(100);
  });
});
