---
name: ctc-debug
description: Debug CTC Task issues by reproducing, tracing and fixing the root cause instead of guessing.
---

# Debug workflow

1. Reproduce the failure.
2. Capture the exact error and entry point.
3. Trace frontend → API → middleware → route → DB/service when applicable.
4. Search for the same symbol/pattern elsewhere.
5. Identify the smallest root cause.
6. Add or update a regression test.
7. Fix the cause, not just the symptom.
8. Run the focused test and relevant broader checks.
9. Review the final diff for unrelated changes.
