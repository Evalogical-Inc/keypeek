# Roadmap

keypeek is small on purpose. Ideas are tracked as GitHub issues labelled [`roadmap`](https://github.com/Evalogical-Inc/keypeek/issues?q=is%3Aissue+label%3Aroadmap). Vote with a thumbs-up on the ones you want, or open a [discussion](https://github.com/Evalogical-Inc/keypeek/discussions) for a new idea.

## Principles that will not change
Read-only scanning, no network, no telemetry, never print a full secret. Anything that writes to disk (such as a fix mode) must be opt-in, a separate command, and clearly named.

## Next
- Landing page
- Claude Code plugin and skill (run the audit from inside your agent)
- Shareable grade badge (stdout SVG, no file writes)

## Later
- GitHub Action
- Fix mode: deny rules and keychain migration, opt-in
- Windows support
- Cursor SQLite chat store scanning

## Not planned
Uploading findings anywhere, accounts, or any feature that needs the network to scan.
