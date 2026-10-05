---
name: tranle-mail
description: Change TranLe Tasks mail functionality safely.
---

Inspect:
- `backend/routes/mail.ts`
- `backend/mailer.ts`
- IMAPFlow/mailparser usage
- frontend mail consumers

Protect:
- SMTP/IMAP credentials
- message headers
- attachment metadata/content
- HTML message rendering
- mailbox ownership

Test provider failure, malformed input and authorization boundaries without using production credentials.
