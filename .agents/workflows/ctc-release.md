# CTC Release
Description: Pre-commit/release safety checklist.

Steps:
1. Inspect git status.
2. Inspect staged/unstaged diff.
3. Search changed files for accidental secrets.
4. Verify relevant tests/builds.
5. Review database/config changes.
6. Check unrelated files.
7. Summarize risks.
8. Do not push or rewrite history unless explicitly requested.
