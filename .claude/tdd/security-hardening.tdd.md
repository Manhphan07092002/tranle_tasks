# Security hardening TDD evidence

Source: production-readiness audit findings, translated into authorization and session-safety journeys during this implementation.

| # | Guarantee | Test | Type | Result | Evidence |
|---|---|---|---|---|---|
| 1 | An employee cannot create a permission-bearing role | `private-data-authorization.integration.test.ts` | integration | PASS | Initial RED returned 201; protected route returns 403. |
| 2 | Document metadata cannot name arbitrary server files | `private-data-authorization.integration.test.ts` | integration | PASS | Initial RED accepted `backend/server.ts`; only managed upload URLs are accepted. |
| 3 | Notes, notifications, and meeting ownership derive from the JWT principal | `private-data-authorization.integration.test.ts` | integration | PASS | Body/query spoofing is ignored and notification updates include owner filtering. |
| 4 | Department records are accessible only to the owning manager or global role | `departmentWorkspace.integration.test.ts` | integration | PASS | Scoped middleware covers records and KPI routes. |
| 5 | Password/lock changes revoke an older token | `private-data-authorization.integration.test.ts` | integration | PASS | Session-version mismatch returns 401. |

Validation:

- RED: `npm test --workspace=backend -- private-data-authorization.integration.test.ts` (5 intended failures before implementation).
- GREEN: `npm test --workspace=backend` (76 tests passed).
- Type safety: `npm run typecheck:backend` (passed).

Coverage is not configured in the repository, so no global percentage was produced. The added tests cover the authorization regressions exercised by this change; browser flows and the MySQL transaction architecture remain outside the current automated coverage.
