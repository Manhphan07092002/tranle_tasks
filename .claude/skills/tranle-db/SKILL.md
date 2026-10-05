---
name: tranle-db
description: Safely change the TranLe Tasks SQLite/PostgreSQL data layer.
---

# Database workflow

1. Inspect `backend/db.ts`, `backend/db_pg.ts` and existing history/migration logic.
2. Identify schema and data dependencies.
3. Decide migration/backfill strategy.
4. Preserve existing records.
5. Implement deterministically.
6. Verify clean and existing-data scenarios when possible.
7. Run affected Vitest tests.
8. Check SQLite/PostgreSQL compatibility.
