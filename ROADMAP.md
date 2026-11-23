# Roadmap

keypeek is small on purpose. Ideas are tracked as GitHub issues labelled [`roadmap`](https://github.com/Evalogical-Inc/keypeek/issues?q=is%3Aissue+label%3Aroadmap). Vote with a thumbs-up on the ones you want, or open a [discussion](https://github.com/Evalogical-Inc/keypeek/discussions) for a new idea.

## Where it is going
keypeek started as an audit of which secrets AI coding agents can read. The direction is a security layer for AI-assisted development: find what is exposed, warn while the agent works, and check again automatically.

1. **Audit** (shipped): `.env` files, chat transcripts and shell history, with a score.
2. **Live guard** (shipped, unreleased): Claude Code hooks that ask before an agent reads a secret and warn when one leaks.
3. **Wider coverage** (next): more places credentials live, certificates, and licence risk.
4. **Automation** (next): pre-commit, CI annotations and code scanning output.

## Principles that will not change
Read-only scanning, no network, no telemetry, never print a full secret. Anything that writes to disk (such as a fix mode) must be opt-in, a separate command, and clearly named.

## Shipped
- Claude Code plugin and skill, MCP server, GitHub Action, MCP registry listing, landing page
- `keypeek guard` live hooks (merged, ships in the next release)

## Next
- More exposure surfaces: cloud, SSH, registry and MCP credentials ([#27](https://github.com/Evalogical-Inc/keypeek/issues/27))
- Live guard v2: block writes of keys, pre-commit hook, session summary ([#30](https://github.com/Evalogical-Inc/keypeek/issues/30))
- Certificate and key-material checks ([#28](https://github.com/Evalogical-Inc/keypeek/issues/28))
- Shareable grade badge ([#3](https://github.com/Evalogical-Inc/keypeek/issues/3))

## Later
- Licence checks: paid-software keys and dependency licence risk ([#29](https://github.com/Evalogical-Inc/keypeek/issues/29))
- SARIF output, PR annotations, GitHub App (exploring) ([#31](https://github.com/Evalogical-Inc/keypeek/issues/31))
- Fix mode: deny rules and keychain migration, opt-in ([#5](https://github.com/Evalogical-Inc/keypeek/issues/5))
- Windows support ([#6](https://github.com/Evalogical-Inc/keypeek/issues/6))
- Cursor SQLite chat store scanning ([#7](https://github.com/Evalogical-Inc/keypeek/issues/7))
- Homebrew tap ([#8](https://github.com/Evalogical-Inc/keypeek/issues/8))

## Not planned
Uploading findings anywhere, accounts, or any feature that needs the network to scan. A hosted service, if it ever exists, would be a separate optional product, not part of the scanner.
