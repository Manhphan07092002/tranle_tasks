---
name: tranle-backend
description: Backend API conventions and security boundaries.
activation: glob
globs: backend/**/*.ts
---

- Validate all untrusted request input.
- Enforce authentication and authorization server-side.
- Reuse existing auth/validation middleware patterns.
- Preserve response shapes and HTTP semantics.
- Keep route handlers focused.
- Do not expose secrets, stack traces or database internals.
- Do not silently swallow database, mail or AI errors.
- Consider rate limiting for expensive/public endpoints.
