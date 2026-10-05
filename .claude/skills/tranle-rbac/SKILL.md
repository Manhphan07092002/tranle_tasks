---
name: tranle-rbac
description: Implement or review TranLe Tasks role/permission and resource-scope behavior.
---

# RBAC workflow

For each protected action define:

- authenticated?
- role/permission?
- resource owner?
- department scope?
- admin override?
- API enforcement?
- frontend affordance?

Test both allowed and denied cases.

Never rely on frontend route hiding as authorization.
