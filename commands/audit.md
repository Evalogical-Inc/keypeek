---
description: Run keypeek and explain which secrets your AI agents can read
---

Run `npx --yes @evalogical/keypeek --json --no-history` and summarize the result: the grade-relevant findings first (high, then medium, then low), then any failing `checks` with their suggested fix. Name each finding by provider, surface and file, never by its preview. Do not open any flagged file. Do not change anything without asking; if a deny rule is missing, show the exact rule and ask before adding it.
