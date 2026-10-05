---
name: tranle-api
description: Add or change a TranLe Tasks backend API safely.
---

# API workflow

1. Find the route under `backend/routes/`.
2. Find its frontend consumer under `frontend/services/` or related code.
3. Inspect `backend/middleware/auth.ts` and `validate.ts`.
4. Define request/response behavior.
5. Validate input with existing Zod conventions.
6. Enforce permission and resource ownership.
7. Update frontend types/cache/realtime behavior.
8. Add success, validation-failure and authorization-failure tests where practical.
9. Run backend tests and frontend build when both sides changed.
