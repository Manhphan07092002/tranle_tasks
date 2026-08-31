---
name: ctc-project
description: Core CTC Task project rules. Apply to all CTC Task development.
activation: always_on
---

# CTC Task project context

Repository root:
`ctc-task-main`

Main areas:
- `frontend/`: React/Vite browser application.
- `backend/`: Express/TypeScript API, database, mail, AI, realtime and schedulers.
- `backend/routes/`: domain APIs.
- `backend/middleware/`: auth and validation.
- `backend/tests/`: Vitest.
- `frontend/services/`: API/service clients.
- `frontend/contexts/`: cross-cutting client state.

Known stack:
- React 19, Vite 6, TypeScript, Tailwind CSS 4
- React Router 7
- TanStack React Query
- Socket.IO
- Express 5, Zod, JWT, bcryptjs
- SQLite + PostgreSQL support
- Nodemailer, IMAPFlow, mailparser
- Google GenAI/Gemini
- Vitest

Core behavior:
1. Research the current implementation before changing it.
2. Reuse existing patterns.
3. Keep scope narrow.
4. Preserve API contracts unless explicitly changing them.
5. Test before declaring completion.
