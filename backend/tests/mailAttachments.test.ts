import { describe, expect, it } from 'vitest';
import {
  MAX_INLINE_ATTACHMENTS,
  MAX_INLINE_TOTAL_BYTES,
  PER_ATTACHMENT_INLINE_LIMIT,
  selectInlineAttachments,
} from '../utils/mailAttachments.js';

const MB = 1024 * 1024;
const att = (sizeBytes: number, name = 'f') => ({
  filename: `${name}.bin`,
  contentType: 'application/octet-stream',
  size: sizeBytes,
  content: Buffer.alloc(0),
});

describe('selectInlineAttachments — chặn thư có quá nhiều attachment', () => {
  it('60 attachment 4MB từng cái không tạo ra response 320MB nữa', () => {
    // Đây là hình thức tấn công: simpleParser đã giữ cả thư trong RAM, rồi mọi
    // file dưới 5MB đều bị base64 nhét vào JSON.
    const r = selectInlineAttachments(Array.from({ length: 60 }, (_, i) => att(4 * MB, `a${i}`)));
    expect(r.inlineBytes).toBeLessThanOrEqual(MAX_INLINE_TOTAL_BYTES);
    expect(r.attachments).toHaveLength(60);
    // Phần lớn phải bị bỏ bytes, nhưng vẫn liệt kê tên + kích thước.
    expect(r.omitted).toBeGreaterThan(30);
    expect(r.attachments[59].content).toBeNull();
    expect(r.attachments[59].size).toBe(4 * MB);
  });

  it('attachment đơn lẻ vượt trần không được nhúng', () => {
    const r = selectInlineAttachments([att(PER_ATTACHMENT_INLINE_LIMIT)]);
    expect(r.attachments[0].content).toBeNull();
    expect(r.omitted).toBe(1);
  });

  it('tổng ngân sách byte áp dụng xuyên suốt, không chỉ từng file', () => {
    const r = selectInlineAttachments(
      Array.from({ length: 10 }, (_, i) => att(3 * MB, `b${i}`)),
      { maxCount: 100 },
    );
    expect(r.inlineBytes).toBeLessThanOrEqual(MAX_INLINE_TOTAL_BYTES);
    // 20MB / 3MB = 6 file đầu lọt, phần còn lại thì không.
    expect(r.omitted).toBe(4);
  });

  it('giới hạn số lượng, kể cả khi file rất nhỏ', () => {
    const r = selectInlineAttachments(Array.from({ length: 50 }, (_, i) => att(10, `c${i}`)));
    expect(r.attachments).toHaveLength(50);
    expect(r.attachments.filter((a) => a.content !== null)).toHaveLength(MAX_INLINE_ATTACHMENTS);
    expect(r.omitted).toBe(40);
  });

  it('thư bình thường vài file nhỏ không bị ảnh hưởng', () => {
    const withData = [{ ...att(1024, 'bao-cao'), content: Buffer.from('x') }];
    const r = selectInlineAttachments(withData);
    expect(r.omitted).toBe(0);
    expect(r.attachments[0].content).toBe(Buffer.from('x').toString('base64'));
    expect(r.attachments[0].filename).toBe('bao-cao.bin');
  });

  it('size thiếu/NaN bị coi là vô hạn chứ không lọt qua mọi phép so sánh', () => {
    const r = selectInlineAttachments([
      { filename: 'x.bin', contentType: 'application/octet-stream', size: undefined as any, content: Buffer.alloc(0) },
      { filename: 'y.bin', contentType: 'application/octet-stream', size: NaN as any, content: Buffer.alloc(0) },
    ]);
    expect(r.omitted).toBe(2);
    expect(r.inlineBytes).toBe(0);
  });

  it('thư không có attachment thì không lỗi', () => {
    const r = selectInlineAttachments([]);
    expect(r).toEqual({ attachments: [], omitted: 0, inlineBytes: 0 });
  });
});
