---
name: ctc-refactor
description: Perform behavior-preserving refactors in CTC Task hotspots.
---

Use when touching large or high-risk modules such as `frontend/App.tsx`, `backend/db.ts`, `backend/server.ts` or large route modules.

Rules:
- establish current behavior first;
- one responsibility per extraction;
- no opportunistic redesign;
- keep API behavior stable;
- run verification after each meaningful extraction;
- keep the final diff easy to review.
