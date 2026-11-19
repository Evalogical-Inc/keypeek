# Changelog

Format follows [Keep a Changelog](https://keepachangelog.com). Versions follow semver.

## [Unreleased]

## [0.2.0] - 2026-11-19

### Added
- `keypeek mcp`: a read-only MCP server (stdio, no dependencies) with one tool, `audit_secret_exposure`. Counts only by default; file paths with `details: true`; never values, previews or fingerprints.
- `docs/agents.md`: setup for Codex, other MCP clients and an `AGENTS.md` snippet.
- Claude Code plugin: a `keypeek` skill and a `/keypeek:audit` command (install with `/plugin marketplace add Evalogical-Inc/keypeek`). The plugin files live in the repository and are not part of the npm package.
- Website link in the package metadata and README.

### Fixed
- An unknown flag (for example a typo like `--verison`) now prints a one-line message and exits with code 2 instead of a raw error.

## [0.1.1] - 2026-11-18

### Added
- Scanning status line on terminals, so a slow scan on a large home folder no longer looks frozen. It goes to stderr and only on a terminal, so `--json` and piped output are unchanged.

### Changed
- README rewritten around the story, with how-it-works, a verify-it-yourself section, comparison and FAQ.
- New logo and banner.

## [0.1.0] - 2026-11-17

First version. Read-only audit of agent transcripts, shell history, `.env` files and process environment.

### Added
- 0-100 score and grade, capped per surface.
- Terminal report with score bar, severity summary, aligned columns, `~` paths, width-aware truncation, per-section row cap and next steps.
- `--json`, `--all`, `--path`, `--no-history`, `--fail-on`, `--version`.
- Never prints a full secret, no network, zero runtime dependencies.
- Runbook, contributing guide, security policy, CI on Ubuntu and macOS (Node 20 and 22).
