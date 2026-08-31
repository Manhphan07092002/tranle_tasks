# RBAC and data-isolation rules

CTC Task contains users, roles, departments, admin functions and business data.

For every protected feature ask:

1. Who may call this endpoint?
2. Which role/permission is required?
3. Is the user allowed to access this specific resource?
4. Is department/ownership scope enforced server-side?
5. Can an ID from another user's record be substituted?
6. Does the frontend merely hide the action while the backend still enforces it?

A UI-only permission check is never sufficient.

When modifying admin, roles, users, departments, contracts, clients, documents, mail or reports, add/adjust negative authorization tests when practical.
