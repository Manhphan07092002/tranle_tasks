# Frontend rules

Current stack:
React 19, Vite 6, TypeScript, Tailwind CSS 4, React Router 7, TanStack React Query, Socket.IO client, Recharts, DOMPurify.

Rules:

- Preserve existing routing and auth behavior.
- Use React Query for server state where the project already does so.
- Invalidate/update the relevant query cache after mutations.
- Keep realtime updates consistent with the existing Socket.IO/context patterns.
- Sanitize user-controlled HTML before rendering.
- Preserve responsive layouts and existing visual language.
- Handle loading, empty, error and permission states.
- Keep browser code free of server-only secrets.
- Reuse existing components before creating another equivalent component.
- Do not turn `App.tsx` into a larger god component; when touching it, look for a small extraction seam.
