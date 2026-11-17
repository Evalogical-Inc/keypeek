# keypeek

See which secrets your AI coding agents can read.

Claude Code, Cursor and Codex read your `.env` files, keep full transcripts on disk, and pass your shell environment to every command they run. Secret scanners check your git history. keypeek checks the places your agents actually look.

```
npx keypeek
```

## What it checks

| Surface | Where | Why it matters |
|---|---|---|
| transcript | `~/.claude`, `~/.codex`, `~/.gemini`, `~/.cursor` | The key was already in a model's context. Rotate it. |
| history | `~/.zsh_history`, `~/.bash_history`, fish | Any agent with shell access can read these. |
| envfile | `.env*` files under your home (or `--path`) | Agents read these by default. |
| procenv | environment variables of the current shell | Inherited by every subprocess an agent starts. |
| config | Claude Code `settings.json` | Is `.env` denied? Is subprocess env scrubbing on? |

You get a 0-100 score and a grade. Duplicates collapse into one finding with a count.

## Privacy and safety

- **Read-only.** keypeek never writes, moves or deletes anything.
- **No network, no telemetry.** Zero runtime dependencies; the whole scanner is in `src/`.
- **Never prints a secret.** Output is a 4-character prefix, the length, and an 8-character SHA-256 fingerprint. Tests assert the full value never appears in text or JSON output.

## Options

```
--path <dir>       directory to scan for .env files (repeatable, default: home)
--no-history       skip shell history files
--json             machine-readable output
--fail-on <level>  exit 1 if a finding at this severity or above exists (low|medium|high)
```

`--fail-on` makes it usable in CI or a pre-flight script.

## Known limits

- Pattern-based: ~11 provider formats plus a conservative `NAME=value` rule for names containing KEY, TOKEN, SECRET or PASSWORD. Expect some misses and a few false positives.
- `.env` files inside dot-directories are skipped; files over 50MB are skipped and listed.
- Transcripts are scanned as plain text lines, since agent file formats change between versions. Cursor's SQLite chat store is not scanned.
- The config checks report state only. Whether a deny rule or env scrub fully stops an agent is third-party reported, so verify against current docs.
- macOS and Linux. Windows is untested.

## Docs

- [Runbook](docs/RUNBOOK.md): maintainer steps (add patterns, triage, release)
- [Contributing](CONTRIBUTING.md)
- [Security policy](SECURITY.md)

## Develop

```
npm install
npm test
node dist/src/cli.js
```

## Roadmap (only if people use it)

Fix mode (deny rules, keychain migration), shareable HTML report, GitHub Action, team tier.

MIT
