---
name: ctc-feature
description: Implement a CTC Task feature using repository-first research and verification.
---

# CTC feature workflow

## Phase 1 — Research
Inspect:
- relevant frontend page/component/service
- relevant backend route/middleware
- database access
- shared types
- existing tests
- realtime behavior if applicable

## Phase 2 — Plan
Write:
- current behavior
- requested behavior
- affected files
- data/API flow
- RBAC implications
- migration implications
- verification plan

## Phase 3 — Implement
Implement the smallest complete vertical slice.
Reuse existing patterns.

## Phase 4 — Verify
Run focused tests/builds.
Then inspect the diff for:
- accidental scope
- security regression
- API contract changes
- stale cache/realtime issues

## Phase 5 — Report
State exactly:
- changed files
- behavior
- commands run
- results
- remaining limitations
