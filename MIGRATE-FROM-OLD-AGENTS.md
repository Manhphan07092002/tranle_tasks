# Migration from the previous `.agents/` pack

The previous project pack used `.agents/`. The current ECC Antigravity guide documents `.agent/` as the Antigravity runtime surface, with:

- `rules/` → `.agent/rules/`
- commands → `.agent/workflows/`
- agents → `.agent/skills/`

Therefore this pack intentionally uses `.agent/`.

## Recommended migration

1. Backup the current `.agents/`.
2. Extract this package into `E:\tranle_tasks`.
3. Remove or archive the old `.agents/` after confirming no other harness depends on it.
4. Restart/reload Antigravity.
5. Test `/plan`, `/feature-dev`, `/code-review` and `/verify`.

Do not keep two conflicting Antigravity rule/workflow packs active.
