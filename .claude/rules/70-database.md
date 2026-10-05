# Database rules

TranLe Tasks has both SQLite and PostgreSQL support.

- Inspect both database paths before making storage assumptions.
- Preserve existing records during schema changes.
- Prefer deterministic/idempotent migrations.
- Check indexes, foreign keys, uniqueness and nullability.
- Do not reset the production database.
- Do not make SQLite-specific behavior silently incompatible with PostgreSQL.
- When changing `db.ts`, inspect initialization, migration and seed behavior.
- When changing schema, update affected backend types, queries and tests.
- For large-data or concurrency concerns, explicitly assess the PostgreSQL path.
