---
name: ctc-ai
description: Change CTC Task Gemini/AI features with server-side secret handling and untrusted-output boundaries.
---

Rules:
- Locate actual `@google/genai` usage before changing architecture.
- Keep provider credentials out of browser bundles.
- Validate user input before sending to the provider.
- Treat model output as untrusted.
- Do not execute model-generated commands/code.
- Handle provider timeout/error/rate-limit cases.
- Keep AI behavior deterministic enough for tests by mocking the provider boundary.
