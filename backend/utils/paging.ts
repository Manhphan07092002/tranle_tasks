/**
 * Shared `?limit` / `?page` parsing for list endpoints.
 *
 * `parseInt(req.query.limit) || 50` passes the value straight into SQL, so
 * `?limit=100000000` asks the database for the whole table — in `admin.ts` that
 * is the entire company-wide audit log. It also accepts negatives, which MySQL
 * treats as an error, and `page=1e9` produces an offset far past the end.
 *
 * Every list route should clamp here so one helper defines the ceiling.
 */
export const DEFAULT_LIMIT = 50;
/** Matches the activity-log ceiling; high enough for a big admin table, low enough to stay a page. */
export const MAX_LIMIT = 200;
/** Bounded so a huge page number cannot turn into a full-table scan offset. */
export const MAX_PAGE = 1000;

export interface Paging {
  limit: number;
  page: number;
  offset: number;
}

export function resolvePaging(
  query: Record<string, unknown>,
  options: { defaultLimit?: number; maxLimit?: number; maxPage?: number } = {},
): Paging {
  const defaultLimit = options.defaultLimit ?? DEFAULT_LIMIT;
  const maxLimit = options.maxLimit ?? MAX_LIMIT;
  const maxPage = options.maxPage ?? MAX_PAGE;

  const rawLimit = Number(Array.isArray(query.limit) ? query.limit[0] : query.limit);
  const limit = Number.isFinite(rawLimit) && rawLimit > 0
    ? Math.min(Math.trunc(rawLimit), maxLimit)
    : defaultLimit;

  const rawPage = Number(Array.isArray(query.page) ? query.page[0] : query.page);
  const page = Number.isFinite(rawPage) && rawPage > 0
    ? Math.min(Math.trunc(rawPage), maxPage)
    : 1;

  return { limit, page, offset: (page - 1) * limit };
}

/** Clause + params for `ORDER BY createdAt DESC LIMIT ? OFFSET ?`. */
export function pagingSql(paging: Paging): { clause: string; params: unknown[] } {
  return { clause: ' LIMIT ? OFFSET ?', params: [paging.limit, paging.offset] };
}

/**
 * Offset form for endpoints the UI pages with `?offset=` rather than `?page=`
 * (the admin DB browser). A raw `Math.max(Number(offset), 0)` also passes `NaN`
 * through, which MySQL rejects.
 */
export function resolveOffsetPaging(
  query: Record<string, unknown>,
  defaultLimit: number,
  maxLimit: number,
): { limit: number; offset: number } {
  const rawLimit = Number(Array.isArray(query.limit) ? query.limit[0] : query.limit);
  const limit = Number.isFinite(rawLimit) && rawLimit > 0
    ? Math.min(Math.trunc(rawLimit), maxLimit)
    : defaultLimit;

  const rawOffset = Number(Array.isArray(query.offset) ? query.offset[0] : query.offset);
  const offset = Number.isFinite(rawOffset) && rawOffset > 0
    ? Math.min(Math.trunc(rawOffset), MAX_LIMIT * MAX_PAGE)
    : 0;

  return { limit, offset };
}
