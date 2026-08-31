# Testing rules

Existing backend test command:
`npm run test --workspace=backend`

Existing backend test runner:
Vitest.

For frontend changes:
`npm run build --workspace=frontend`

For full development startup:
`npm run dev`

Verification selection:

- Backend business logic/API: focused Vitest test + broader backend test when practical.
- Auth/RBAC: positive + negative authorization cases.
- Database: migration/schema test plus relevant API tests.
- Frontend: TypeScript/Vite build + relevant manual flow.
- Realtime: test sender and receiver behavior when practical.
- Mail/AI: test validation/error boundaries without real production credentials.

Never invent a successful test result.
