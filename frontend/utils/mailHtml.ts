import DOMPurify from 'dompurify';

/**
 * HTML that arrives by mail is attacker-controlled: any external sender can put
 * markup into `mail.html`. It is rendered in two places:
 *   - ReadingPane  (read view)
 *   - ComposeModal (reply / forward / resend quote, via innerHTML)
 * Both must pass through sanitizeMailHtml before reaching innerHTML.
 */

/**
 * Tags we never want in mail HTML, even though DOMPurify's default profile
 * allows some of them:
 * - form / input / button / select / textarea: phishing credential capture.
 *   The mail body is same-origin and unsandboxed, so an inbound email could
 *   render a convincing fake "Session expired" login form inside the app.
 * - iframe / object / embed / link / meta / base: nested browsing contexts and
 *   base-URL / meta-refresh redirection.
 */
const FORBID_TAGS = [
  'form', 'input', 'button', 'select', 'textarea', 'option', 'optgroup', 'label', 'fieldset',
  'iframe', 'frame', 'frameset', 'object', 'embed', 'applet',
  'link', 'meta', 'base',
];

/** Attributes that turn a link/anchor into a state-changing or beacon request. */
const FORBID_ATTR = ['formaction', 'action', 'ping', 'target'];

const SANITIZE_CONFIG = {
  // HTML profile only: excludes SVG/MathML, which have their own script vectors.
  USE_PROFILES: { html: true } as const,
  FORBID_TAGS,
  FORBID_ATTR,
  // Reject javascript:/data: on href/src — never allow unknown protocols.
  ALLOW_UNKNOWN_PROTOCOLS: false,
};

/** Sanitize untrusted mail HTML. Returns '' for null/undefined input. */
export function sanitizeMailHtml(html?: string | null): string {
  if (!html) return '';
  const raw = String(html);
  // DOMPurify silently returns its input UNCHANGED when there is no DOM
  // (isSupported === false). Never let that fail open: degrade to escaped text,
  // which renders as visible content instead of executable markup.
  if (!DOMPurify.isSupported) return escapeHtml(raw);
  try {
    return DOMPurify.sanitize(raw, SANITIZE_CONFIG);
  } catch {
    return escapeHtml(raw);
  }
}

const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/** Escape a value for interpolation into an HTML string. */
export function escapeHtml(value?: string | null): string {
  if (value === null || value === undefined) return '';
  return String(value).replace(/[&<>"']/g, (ch) => HTML_ENTITIES[ch]);
}

/**
 * Version marker for the persisted compose draft.
 *
 * Drafts are stored in localStorage. Before this existed, a poisoned draft
 * (built from an inbound email's HTML) survived every reload and was re-injected
 * into the compose editor on each visit to /mail. Bumping the version drops
 * every draft written by an older build, once, so those payloads are purged.
 */
export const MAIL_DRAFT_VERSION = '2';
const MAIL_DRAFT_VERSION_KEY = 'mail_draft_version';

/**
 * One-time migration: drop any draft persisted before the sanitizer existed.
 * Returns true when a draft was purged.
 */
export function purgeLegacyMailDraft(): boolean {
  try {
    if (localStorage.getItem(MAIL_DRAFT_VERSION_KEY) === MAIL_DRAFT_VERSION) return false;
    const hadDraft = localStorage.getItem('mail_draft') !== null;
    localStorage.removeItem('mail_draft');
    localStorage.setItem(MAIL_DRAFT_VERSION_KEY, MAIL_DRAFT_VERSION);
    return hadDraft;
  } catch {
    return false;
  }
}