# TypeScript rules

- Keep TypeScript strict and explicit.
- Do not introduce new `any` unless there is a documented boundary reason.
- Reuse existing domain types.
- Avoid duplicated request/response interfaces when a shared type already exists.
- Narrow unknown values rather than casting blindly.
- Keep async error paths explicit.
- Do not suppress compiler errors with `@ts-ignore` unless unavoidable and explained.
