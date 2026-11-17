# Notes for AI coding agents working on keypeek

keypeek audits which secrets AI coding agents can read on a machine. Trust is the whole product, so these rules are strict.

## Invariants (each has a test in `test/keypeek.test.ts`; keep them green)
1. **Read-only.** Never write, move or delete user files.
2. **No network.** No HTTP, no telemetry, no update checks.
3. **Never output a full secret.** Only a 4-char prefix, the length and an 8-char SHA-256 fingerprint may leave `src/redact.ts`.

## Conventions
- Zero runtime dependencies. Use Node built-ins. Dev deps are `typescript` and `@types/node` only.
- Tests use `node:test`. Build fake keys at runtime (string concatenation). Never commit a real or realistic-looking key literal.
- Never print, log or paste real secrets in commits, issues, PRs or test fixtures.
- Run `npm test` before finishing. It compiles with `tsc` and runs `dist/test/*.test.js`.

## Where things live
`src/patterns.ts` (detection), `src/scanners/` (one file per surface), `src/report.ts` (terminal output), `src/score.ts`. Maintainer steps are in `docs/RUNBOOK.md`.
