import { describe, expect, it } from 'vitest';
import {
  APPROVED,
  changedFrozenFields,
  inspectUpdate,
  isVerdictChange,
  valuesEqual,
} from '../utils/workflowPolicy.js';

const APPROVED_REPORT = {
  status: APPROVED,
  title: 'BC tháng 1',
  content: JSON.stringify({ summary: 'doanh thu 100 triệu', risk: 'thấp' }),
};

describe('isVerdictChange — phán quyết là chuyển trạng thái, không phải giá trị trong payload', () => {
  it('chỉ đúng khi trạng thái thực sự đổi sang Approved/Rejected', () => {
    expect(isVerdictChange('Pending', 'Approved')).toBe(true);
    expect(isVerdictChange('Pending Manager', 'Rejected')).toBe(true);
    expect(isVerdictChange('Approved', 'Approved')).toBe(false);
    expect(isVerdictChange('Rejected', 'Rejected')).toBe(false);
  });

  it('nộp duyệt không phải phán quyết', () => {
    expect(isVerdictChange('Draft', 'Pending')).toBe(false);
    expect(isVerdictChange('Draft', 'Pending Manager')).toBe(false);
    expect(isVerdictChange('Pending Manager', 'Pending Director')).toBe(false);
  });
});

describe('valuesEqual — so sánh phải chịu được khác biệt định dạng', () => {
  it('tiền bằng số, chuỗi số và dấu phẩy chấm đều bằng nhau', () => {
    expect(valuesEqual(1000, '1000')).toBe(true);
    expect(valuesEqual(1000, 1000.0)).toBe(true);
    expect(valuesEqual('1.000,00', 1000)).toBe(true);
    expect(valuesEqual('  1000  ', 1000)).toBe(true);
    expect(valuesEqual(1000, 1001)).toBe(false);
  });

  it('attachments do server tự chèn không được coi là thay đổi nội dung', () => {
    const approved = JSON.stringify({ summary: 'A', attachments: [{ name: 'a.pdf', url: '/u/a.pdf' }] });
    const resubmitted = JSON.stringify({ summary: 'A' });
    expect(valuesEqual(approved, resubmitted)).toBe(true);
  });

  it('thứ tự khoá JSON và thụt lề không tạo ra khác biệt', () => {
    expect(valuesEqual(JSON.stringify({ a: 1, b: 2 }), JSON.stringify({ b: 2, a: 1 }))).toBe(true);
    expect(valuesEqual(
      JSON.stringify({ lines: ['x', 'y'] }),
      JSON.stringify({ lines: ['x', 'y'] }),
    )).toBe(true);
  });

  it('đổi nội dung thật thì vẫn bị phát hiện', () => {
    expect(valuesEqual(JSON.stringify({ summary: 'A' }), JSON.stringify({ summary: 'B' }))).toBe(false);
    expect(valuesEqual(JSON.stringify({ a: 1 }), JSON.stringify({ a: 1, b: 2 }))).toBe(false);
  });
});

describe('changedFrozenFields — trường không gửi lên không phải là bị sửa', () => {
  const existing = { title: 'A', content: '{"x":1}', totalPreTax: 500 };

  it('bỏ qua trường vắng mặt trong payload', () => {
    expect(changedFrozenFields(existing, { title: 'A' }, ['title', 'content', 'totalPreTax'])).toEqual([]);
  });

  it('báo đúng trường thay đổi', () => {
    expect(changedFrozenFields(existing, { title: 'B' }, ['title', 'content', 'totalPreTax'])).toEqual(['title']);
    expect(changedFrozenFields(existing, { totalPreTax: 900 }, ['title', 'content', 'totalPreTax'])).toEqual(['totalPreTax']);
  });

  it('null và chuỗi rỗng ở trường chưa có giá trị được coi là không đổi', () => {
    expect(changedFrozenFields({ title: null }, { title: '' }, ['title'])).toEqual([]);
  });
});

describe('inspectUpdate — quy tắc đóng băng bản ghi Approved', () => {
  it('bản ghi Pending vẫn sửa tự do', () => {
    const guard = inspectUpdate('report', { status: 'Pending', title: 'A' }, { title: 'B', status: 'Pending' });
    // inspectUpdate chỉ BÁOO thay đổi; route chỉ chặn khi isApproved. Đây là điểm
    // mấu chốt: bản ghi Pending phải sửa được để tác giả rút lại và gửi lại.
    expect(guard.changed).toEqual(['title']);
    expect(guard.isApproved).toBe(false);
    expect(guard.isReopen).toBe(false);
  });

  it('bản ghi Approved bị chặn khi sửa title hoặc content', () => {
    expect(inspectUpdate('report', APPROVED_REPORT, { title: 'sửa tên' }).changed).toEqual(['title']);
    expect(inspectUpdate('report', APPROVED_REPORT, { content: '{"summary":"tuSua"}' }).changed).toEqual(['content']);
  });

  it('lưu lại y nguyên bản Approved thì không có gì thay đổi', () => {
    const guard = inspectUpdate('report', APPROVED_REPORT, {
      title: APPROVED_REPORT.title,
      content: JSON.stringify({ risk: 'thấp', summary: 'doanh thu 100 triệu' }),
      status: APPROVED,
    });
    expect(guard.isApproved).toBe(true);
    expect(guard.changed).toEqual([]);
  });

  it('chuyển khỏi Approved là mở lại, không phải sửa', () => {
    const guard = inspectUpdate('report', APPROVED_REPORT, { title: 'x', status: 'Pending' });
    expect(guard.isReopen).toBe(true);
  });

  it('bản ghi doanh thu còn đóng băng cả số liệu', () => {
    const existing = { status: APPROVED, title: 'DT', content: '{"a":1}', totalPreTax: 100, totalDelivered: 80, totalCumulative: 50 };
    expect(inspectUpdate('revenue', existing, { totalPreTax: 999 }).changed).toEqual(['totalPreTax']);
    expect(inspectUpdate('revenue', existing, { totalDelivered: '80' }).changed).toEqual([]);
    expect(inspectUpdate('revenue', existing, { totalCumulative: 51 }).changed).toEqual(['totalCumulative']);
  });
});
