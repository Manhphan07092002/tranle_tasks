---
name: tranle-security
description: Perform a focused security review of a TranLe Tasks change.
---

Check evidence for:

- auth bypass
- RBAC bypass
- IDOR/resource leakage
- SQL/injection issues
- XSS/unsafe HTML
- upload/path traversal
- secret exposure
- mail credential exposure
- AI key exposure
- insecure admin actions
- rate-limit abuse
- sensitive information in logs/responses

For each finding:
severity → location → impact → remediation.

Do not invent vulnerabilities without repository evidence.
Never print actual secret values.
