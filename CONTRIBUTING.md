# Contributing

Thanks for helping. The three invariants come first: **read-only, no network, never print a full secret.** PRs that weaken them will be declined.

## Workflow
1. Fork, branch, `npm install`.
2. Make the change with a test (`test/keypeek.test.ts`, `node:test`).
3. `npm test` must pass.
4. Open a PR describing what it detects or fixes.

## Rules
- No new runtime dependencies.
- Fake keys in tests are built at runtime (concatenation); never commit a real or realistic-looking literal.
- Never paste real secrets into issues or PRs.

Adding a provider or transcript source: see [docs/RUNBOOK.md](docs/RUNBOOK.md).
