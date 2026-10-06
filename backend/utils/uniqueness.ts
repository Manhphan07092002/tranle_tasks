/**
 * Server-side uniqueness guards for columns that identify an account or a
 * business record.
 *
 * `users.email` had no check anywhere and no `UNIQUE` constraint in the schema.
 * That matters more than a normal duplicate-value bug because login resolves it
 * with `SELECT * FROM users WHERE lower(email) = lower(?)` (`routes/auth.ts:95`)
 * and `db.get` takes the first row. Two users sharing an email therefore means
 * one of them is locked out and, worse, the account you land in after
 * authenticating is whichever row MySQL happens to return — so a password check
 * can succeed against a *different* account than the one the person meant to
 * use. `/auth/forgot-password` resolves the same way, so the reset link can land
 * on the wrong mailbox.
 *
 * Contract numbers are checked too, but only case-sensitively, which is why
 * `HD-001` and `hd-001` both passed.
 *
 * A `UNIQUE` index would be the real fix, but this repo has a `_migrations`
 * table with no runner, so it cannot be applied safely from here — the checks
 * below are the enforceable substitute. Keep them case-insensitive to match how
 * login looks the value up.
 */

export class DuplicateFieldError extends Error {
  readonly field: string;
  constructor(field: string, message: string) {
    super(message);
    this.name = 'DuplicateFieldError';
    this.field = field;
  }
}

const normalize = (value: string) => value.trim().toLowerCase();

/**
 * Throws `DuplicateFieldError` when another row already holds `value`.
 * `excludeId` lets an update keep its own current value.
 *
 * `db` is the minimal surface used, so tests can pass a stub.
 */
export async function assertUnique(
  db: {
    get: (sql: string, params?: unknown[]) => Promise<any>;
  },
  opts: { table: string; column: string; value: unknown; excludeId?: string; label?: string },
): Promise<void> {
  const raw = opts.value;
  if (raw === undefined || raw === null) return;
  const value = String(raw).trim();
  if (value === '') return;

  // `table`/`column` are never user input here — they are literal strings from
  // the route files — but keep the interpolation obviously safe anyway.
  if (!/^[a-zA-Z_]+$/.test(opts.table) || !/^[a-zA-Z_]+$/.test(opts.column)) {
    throw new Error(`[uniqueness] illegal identifier: ${opts.table}.${opts.column}`);
  }

  const params: unknown[] = [normalize(value)];
  let sql = `SELECT id FROM \`${opts.table}\` WHERE LOWER(\`${opts.column}\`) = ?`;
  if (opts.excludeId) {
    sql += ' AND id != ?';
    params.push(opts.excludeId);
  }
  sql += ' LIMIT 1';

  const existing = await db.get(sql, params);
  if (existing) {
    throw new DuplicateFieldError(
      opts.column,
      `${opts.label ?? opts.column} "${value}" đã được sử dụng. Vui lòng chọn giá trị khác.`,
    );
  }
}
