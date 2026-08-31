# Research-first rule

Before modifying code:

1. Locate the current implementation.
2. Trace the caller → service → API → database flow when relevant.
3. Search for another existing implementation of the same pattern.
4. Inspect tests for the affected behavior.
5. Inspect configuration/env usage if infrastructure is involved.
6. Only then propose the change.

For architecture questions, cite concrete repository paths in the response.

Do not infer that a dependency is used merely because it appears in `package.json`; verify actual imports/usages.
