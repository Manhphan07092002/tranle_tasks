---
name: tranle-git
description: Git hygiene and change-scope rules.
activation: always_on
---

Before commit:
- inspect `git status`
- inspect relevant diff
- check for secrets
- ensure no unrelated files changed

Never force-push, rewrite history or delete user changes without explicit permission.
Keep feature/refactor/formatting changes separate.
