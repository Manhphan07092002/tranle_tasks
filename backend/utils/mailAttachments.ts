/**
 * Choosing which attachments to inline into a `GET /api/mail/message/:uid`
 * response.
 *
 * The old code mapped every attachment under 5MB straight to base64 with no cap
 * on count or total size. `simpleParser` already holds the whole message in
 * memory, and base64 inflates by a third, so a single mail carrying 60 x 4MB
 * attachments produced a ~320MB response body assembled entirely in RAM. The
 * folder lock is held for the duration, so one request stalls every other read
 * of that mailbox.
 *
 * Attachments past the budget keep their filename, content type and size, so the
 * UI can still show what the mail contains; only the bytes are withheld.
 */

export const PER_ATTACHMENT_INLINE_LIMIT = 5 * 1024 * 1024;
export const MAX_INLINE_TOTAL_BYTES = 20 * 1024 * 1024;
export const MAX_INLINE_ATTACHMENTS = 10;

export interface RawAttachment {
  filename?: string;
  contentType?: string;
  size?: number;
  content: Buffer;
}

export interface ListedAttachment {
  filename?: string;
  contentType?: string;
  size?: number;
  /** base64 payload, or null when the attachment exceeded its budget. */
  content: string | null;
}

export interface InlineSelection {
  attachments: ListedAttachment[];
  /** How many attachments were left out of the response. */
  omitted: number;
  inlineBytes: number;
}

export function selectInlineAttachments(
  attachments: readonly RawAttachment[] = [],
  limits: {
    perAttachment?: number;
    maxTotalBytes?: number;
    maxCount?: number;
  } = {},
): InlineSelection {
  const perAttachment = limits.perAttachment ?? PER_ATTACHMENT_INLINE_LIMIT;
  const maxTotalBytes = limits.maxTotalBytes ?? MAX_INLINE_TOTAL_BYTES;
  const maxCount = limits.maxCount ?? MAX_INLINE_ATTACHMENTS;

  const out: ListedAttachment[] = [];
  let inlineBytes = 0;
  let omitted = 0;

  for (const a of attachments) {
    // A missing/NaN size would otherwise pass every `>=` test and get inlined.
    const size = Number.isFinite(a.size as number) && (a.size as number) > 0 ? (a.size as number) : Infinity;
    const tooBig = size >= perAttachment;
    const overBudget = inlineBytes + size > maxTotalBytes;
    const tooMany = out.length >= maxCount;

    if (tooBig || overBudget || tooMany) {
      omitted++;
      out.push({ filename: a.filename, contentType: a.contentType, size: a.size, content: null });
      continue;
    }

    inlineBytes += size;
    out.push({
      filename: a.filename,
      contentType: a.contentType,
      size: a.size,
      content: a.content.toString('base64'),
    });
  }

  return { attachments: out, omitted, inlineBytes };
}
