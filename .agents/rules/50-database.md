---
name: tranle-database
description: SQLite/PostgreSQL database safety rules.
activation: model_decision
---

Before schema changes inspect:
- `backend/db.ts`
- `backend/db_pg.ts`
- migration/initialization behavior
- affected queries/tests

Preserve existing data.
Prefer deterministic/idempotent migrations.
Check indexes, foreign keys, uniqueness and nullability.
Do not reset production data.
Do not introduce SQLite-only behavior that silently breaks PostgreSQL.
