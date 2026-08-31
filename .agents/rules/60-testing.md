---
name: ctc-testing
description: CTC Task verification rules.
activation: always_on
---

Typical checks:
- backend: `npm run test --workspace=backend`
- frontend: `npm run build --workspace=frontend`
- development integration: `npm run dev`

Select the smallest relevant checks for the change.

Never claim PASS unless the command actually ran.
Report PASS / FAIL / NOT RUN.
For auth/RBAC changes, test allowed and denied paths.
For database changes, test migration/data preservation where practical.
