# TranLe AI
Description: Safely modify Gemini/AI functionality.

Steps:
1. Locate actual Google GenAI/provider usage.
2. Trace browser → backend/provider boundary.
3. Ensure provider secrets remain server-side.
4. Validate user input.
5. Treat model output as untrusted.
6. Handle timeout/error/rate-limit paths.
7. Mock the provider boundary for tests where practical.
