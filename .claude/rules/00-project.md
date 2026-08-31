# CTC Task project rules

## Repository layout

- `frontend/`: React/Vite browser application.
- `backend/`: Express/TypeScript API, persistence, mail, AI, realtime and schedulers.
- `backend/routes/`: domain APIs.
- `backend/middleware/`: authentication and validation.
- `backend/tests/`: Vitest tests.
- `backend/db.ts`: SQLite/data initialization and migration-heavy area.
- `backend/db_pg.ts`: PostgreSQL path.
- `backend/socket.ts`: realtime layer.
- `backend/mailer.ts`: mail integration.
- `frontend/services/`: browser API/service integration.
- `frontend/contexts/`: cross-cutting client state.
- `frontend/pages/`, `components/`, `hooks/`, `utils/`: UI/domain layers.

## Working style

- Search first.
- Reuse existing patterns.
- Make the smallest coherent change.
- Prefer vertical slices over broad rewrites.
- Keep feature, refactor and formatting changes separate.
- If a requirement conflicts with current behavior, explain the conflict before changing behavior.
