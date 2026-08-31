---
name: ctc-frontend
description: Frontend conventions for React/Vite/TypeScript/Tailwind/React Query/Socket.IO.
activation: glob
globs: frontend/**/*.{ts,tsx,css}
---

- Use TypeScript and avoid new `any`.
- Reuse existing components and hooks.
- Use React Query for server state where the project already does.
- Update/invalidate caches after mutations.
- Preserve Socket.IO subscription cleanup.
- Handle loading, empty, error and permission states.
- Preserve responsive behavior and existing visual language.
- Sanitize user-controlled HTML with the existing DOMPurify path.
- Never put provider/server secrets in browser code.
- Do not grow `App.tsx` into a larger god component.
