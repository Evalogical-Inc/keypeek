# keypeek runbook

Operational steps for maintainers. Keep this short and current.

## Local setup
```
npm install
npm test          # compiles with tsc, runs node:test on dist/test
node dist/src/cli.js --help
```
Requires Node 20+. There are no runtime dependencies; keep it that way (trust is the product).

## Invariants (do not break; each has a test)
1. Read-only: never write, move or delete user files.
2. No network, no telemetry.
3. Never print a full secret. Only a 4-char prefix, length and 8-char SHA-256 fingerprint.

Any PR touching `src/scanners/`, `src/report.ts` or `src/redact.ts` must keep `test/keypeek.test.ts` green, including the leak and read-only tests.

## Add a provider pattern
1. Add `[name, regex]` to `PROVIDERS` in `src/patterns.ts`. Anchor with `\b` and require a realistic minimum length.
2. Add a positive case and a placeholder/negative case in `test/keypeek.test.ts`. Build fake keys at runtime (string concatenation) so no secret-looking literal is committed; GitHub push protection will block it otherwise.
3. Run `npm test`, then a real run (`node dist/src/cli.js --json`) and confirm no new false-positive flood.

## Add an agent transcript source
Add the path to `SOURCES` in `src/scanners/transcripts.ts`. Scan as plain text lines; do not parse vendor schemas.

## Triage a false-positive report
1. Ask for the rule name shown in the report (e.g. `generic:DB_PASSWORD`) and the surface. Never ask for the secret value.
2. Provider rule at fault: tighten the regex. Generic rule at fault: adjust `PLACEHOLDER` or the entropy/shape checks in `scanLine`.
3. Add a regression test with a runtime-built fixture.

## Triage a missed-secret report
Same as above, in reverse. If the format is a new provider, add a pattern. If it is a new location, add a scanner source.

## Release
1. `npm test` passes on `main` and CI is green.
2. Bump `version` in `package.json` (semver; new provider patterns = minor).
3. `git tag vX.Y.Z && git push --tags`.
4. `npm publish` (`prepublishOnly` runs the tests; `publishConfig` already sets public access). Check `npm pack --dry-run` lists only `dist/src`, README, LICENSE.
5. Create a GitHub release with notes: new patterns, behavior changes, known limits.

Published as `@evalogical/keypeek` (public, under the `evalogical` npm org). The installed command is `keypeek`. Publishing needs an npm account that is a member of the org, and may ask for a one-time 2FA code (`npm publish --otp=<code>`).

## Security reports
See `SECURITY.md`. A bug that prints, writes or transmits a secret is severity high: fix, release and publish an advisory.
