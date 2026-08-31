# Mail, AI and realtime rules

## Mail
Trace:
frontend mail UI → backend mail route → mailer/IMAP layer → provider.

Never move SMTP/IMAP credentials to the frontend.

## AI
Trace:
frontend assistant/request → backend AI route/service where applicable → Google GenAI/provider.

Do not expose provider credentials in `VITE_*` browser variables.

## Realtime
Trace:
mutation/API → server Socket.IO event → client listener → query/state update.

Avoid duplicate listeners, stale subscriptions and cache/state divergence.
