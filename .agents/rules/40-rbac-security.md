---
name: tranle-rbac-security
description: Security and authorization rules for protected TranLe Tasks features.
activation: model_decision
---

For every protected operation check:
- authentication
- permission/role
- resource ownership
- department scope
- admin override
- server-side enforcement

UI hiding is not authorization.

Never hardcode or print:
- JWT secrets
- database credentials
- SMTP/IMAP credentials
- Google/Gemini API keys
- encryption/session secrets

Treat AI output, uploaded files and email content as untrusted.
