# Security rules

## Secrets

Never commit or print:
- JWT secrets
- database credentials
- SMTP/IMAP credentials
- Google/Gemini API keys
- encryption keys
- session/token secrets
- private deployment credentials

If a real credential is discovered in source/history/logs, do not reproduce it in the response. Recommend rotation/removal.

## Uploads

For `backend/routes/upload.ts` and document/attachment flows:
- validate size and type server-side;
- do not trust the browser MIME type;
- prevent path traversal;
- avoid serving executable content;
- store files outside executable source paths when possible.

## Mail

Treat email addresses, headers, attachments and message bodies as untrusted input. Do not expose mail credentials to frontend code.

## AI

AI output is untrusted. Do not execute generated code/commands automatically. Keep provider credentials on the server.

## Browser content

Use the existing DOMPurify path for user-controlled HTML. Never introduce raw `dangerouslySetInnerHTML` without a documented sanitization boundary.
