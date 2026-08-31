---
name: ctc-research-first
description: Require repository inspection before implementation or architecture claims.
activation: model_decision
---

Before coding:
- inspect the relevant files;
- trace caller → API → middleware → service/database when applicable;
- search for existing patterns;
- inspect relevant tests;
- inspect environment/config usage;
- state assumptions explicitly.

Do not infer usage from package.json alone. Confirm actual imports/usages.
