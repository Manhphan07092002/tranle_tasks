# TranLe Tasks — Antigravity Project Agent Pack

This folder is the Antigravity-native companion to the project's `.claude/` harness.

Use:
- `.agents/rules/` for persistent project constraints.
- `.agents/workflows/` for repeatable slash-command workflows.
- `.agents/skills/` for reusable task-specific knowledge.

Antigravity currently uses `.agents/rules` and `.agents/skills` for workspace-local customizations; older `.agent/*` paths remain backward compatible. Rules and workflows are Markdown-based, and workflows are invoked with `/workflow-name`.

This pack is intentionally project-specific to TranLe Tasks. It does not contain API keys, provider credentials or secrets.
