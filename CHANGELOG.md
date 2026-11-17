# Changelog

Format follows [Keep a Changelog](https://keepachangelog.com). Versions follow semver.

## [Unreleased]

### Added
- `--version` and `--all` flags.
- Terminal report: score bar, severity summary, aligned columns, `~` paths, width-aware truncation, per-section row cap and next steps.
- Runbook, contributing guide, security policy, CI on Ubuntu and macOS (Node 20 and 22).

### Fixed
- Test script now works on Node 20 (shell expands the test glob).

## [0.1.0] - 2026-11-17

First version. Read-only audit of agent transcripts, shell history, `.env` files and process environment, with a per-surface score, `--json` and `--fail-on`.
