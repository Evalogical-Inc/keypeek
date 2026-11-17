# keypeek

**See which secrets your AI coding agents can read.**

[![ci](https://github.com/Evalogical-Inc/keypeek/actions/workflows/ci.yml/badge.svg)](https://github.com/Evalogical-Inc/keypeek/actions/workflows/ci.yml)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
![node >=20](https://img.shields.io/badge/node-%3E%3D20-brightgreen)
[![npm](https://img.shields.io/npm/v/@evalogical/keypeek)](https://www.npmjs.com/package/@evalogical/keypeek)
![dependencies: 0](https://img.shields.io/badge/runtime%20dependencies-0-brightgreen)

Claude Code, Cursor, Codex and friends read your `.env` files, keep full transcripts on disk, and hand your shell environment to every command they run. keypeek looks at those places, tells you what is exposed, and gives you a score.

- **Read-only.** It never writes, moves or deletes anything.
- **Local.** No network, no telemetry, zero runtime dependencies.
- **Safe to run.** It never prints a secret: only a 4-character prefix, the length, and a hash fingerprint.

```
npx @evalogical/keypeek
```

Or install it once and run `keypeek`:

```
npm install -g @evalogical/keypeek
keypeek
```

## Example

Output from a throwaway demo home folder with fake keys (in a real terminal it is colored):

```
keypeek  what your AI agents can see. Read-only, nothing leaves this machine.

Score  ██████████░░░░░░░░░░  50/100  grade D
5 findings: 2 high · 3 medium · 0 low

Agent transcripts (1)  already in a model's context, rotate these
  SEV    TYPE                   VALUE        SEEN   LOCATION
  high   Anthropic              sk-a…(39)    x3     ~/.claude/projects/app/session.jsonl:1

Shell history (1)  any agent with shell access can read it
  SEV    TYPE                   VALUE        SEEN   LOCATION
  high   AWS                    AKIA…(20)    x1     ~/.zsh_history:1

.env files (3)  agents read these by default
  SEV    TYPE                   VALUE        SEEN   LOCATION
  medium JWT_SECRET             Xk9m…(20)    x1     ~/work/blog/.env:1
  medium OpenAI                 sk-a…(37)    x1     ~/work/shop-api/.env:1
  medium Stripe                 sk_l…(40)    x1     ~/work/shop-api/.env:2

Agent config
  ? Claude Code settings: No settings.json found; Claude Code defaults apply.

Next steps
  1. Rotate anything under transcripts or shell history first. It has already been exposed.
  2. Move secrets out of project .env files into a secrets manager or the OS keychain.
  3. Add a deny rule for .env in your agent's settings, then run keypeek again.

Values are never printed: only a 4-char prefix, the length and a hash fingerprint (#hash in --json).
```

Each row reads: severity, type (provider or rule), redacted value `prefix…(length)`, how many times it appeared (`x3`), and where. Long lists show the top rows per section; use `--all` for everything. `--json` also includes a hash fingerprint per finding so you can track a key without seeing it.

## What it checks

| Surface | Where | Severity | Why it matters |
|---|---|---|---|
| transcript | `~/.claude`, `~/.codex`, `~/.gemini`, `~/.cursor` | high | The key was already in a model's context. Rotate it. |
| history | `~/.zsh_history`, `~/.bash_history`, fish history | high | Any agent with shell access can read these files. |
| envfile | `.env*` files under your home (or `--path`) | medium | Agents read these by default. Templates (`.env.example`) are skipped. |
| procenv | environment variables of the shell that runs keypeek | low | Inherited by every subprocess an agent starts. |
| config | Claude Code `settings.json` | | Is `.env` denied? Is subprocess env scrubbing set? |

Detected formats: Anthropic, OpenAI, GitHub, AWS access keys, Stripe, Google API keys, Slack, Hugging Face, JWTs, private-key headers, plus a conservative `NAME=value` rule for names containing KEY, TOKEN, SECRET or PASSWORD with a high-entropy value.

The score starts at 100 and loses points per finding, capped per surface so one noisy folder cannot hide progress elsewhere. Grades: A 90+, B 75+, C 55+, D 35+, F below.

## Usage

```
keypeek [options]

  --path <dir>        directory to scan for .env files (repeatable, default: home)
  --no-history        skip shell history files
  --all               show every finding (default: top rows per section)
  --json              machine-readable output
  --fail-on <level>   exit 1 if a finding at this severity or above exists (low|medium|high)
  -v, --version
  -h, --help
```

Exit codes: `0` ok, `1` a finding met `--fail-on`, `2` usage error or crash.

```
keypeek --path ~/work --no-history          # just your projects
keypeek --json | jq '.findings[] | select(.severity=="high")'
keypeek --fail-on high                      # use as a pre-flight check or in CI
```

`--json` returns `{ findings, checks, skipped, score, grade }`. Each finding has `provider`, `surface`, `severity`, `file`, `line`, `preview`, `fp` and `count`. There is no field that holds a full secret.

## If keypeek finds something

1. **Rotate it first.** Anything in a transcript or history has already been in a model's context or on disk in plaintext. Treat it as exposed.
2. Move secrets out of project `.env` files and out of shell history: use a secrets manager or your OS keychain, and inject them at run time (for example `op run -- <command>` with 1Password, or the Doppler and Infisical CLIs).
3. Add a deny rule so your agent's file tools skip `.env`. In Claude Code `settings.json`:
   ```json
   { "permissions": { "deny": ["Read(./.env)", "Read(./.env.*)"] } }
   ```
   A deny rule is not a full barrier: shell commands can still read the file. Keep real secrets out of the project folder where you can.
4. Clear old transcripts you no longer need, and rerun keypeek to confirm.

Check your agent's current docs for exact permission syntax, and for subprocess environment scrubbing options (third-party posts mention a `CLAUDE_CODE_SUBPROCESS_ENV_SCRUB` setting; keypeek reports whether it is set but has not verified its behavior).

## How it differs from other tools

- **gitleaks, trufflehog, GitGuardian** find secrets in repositories and can be pointed at any folder. They do not know where AI agents keep transcripts, do not rank by how exposed a secret is to an agent, and do not check agent settings. keypeek is narrower on purpose.
- **Secrets managers and proxies** (1Password CLI, Doppler, Infisical, OneCLI) prevent the problem by keeping secrets out of the agent's reach. keypeek tells you whether you have the problem today. They work well together: audit, fix, audit again.

## Privacy and safety

- Read-only: enforced by a test that checks file modification times before and after a scan.
- No network: there is no HTTP code in the package. Read `src/`; it is small.
- No full secrets in output: enforced by a test over both text and JSON output.
- Symlinks are not followed, so a scan cannot wander outside the folders it was given.
- Unreadable files are skipped silently; files over 50MB are skipped and listed.

## Known limits

- Pattern-based. Expect some misses (new key formats) and a few false positives (high-entropy values that are not secrets).
- Transcripts are scanned as plain text lines because agent file formats change between versions. Cursor's SQLite chat store is not scanned.
- `.env` files inside dot-directories are not scanned.
- The config checks report whether a setting exists, not whether it fully protects you.
- macOS and Linux. Windows is untested.

## Docs

- [Runbook](docs/RUNBOOK.md): maintainer steps (add patterns, triage, release)
- [Changelog](CHANGELOG.md)
- [Contributing](CONTRIBUTING.md)
- [Security policy](SECURITY.md)

## Develop

```
npm install
npm test          # compiles, then runs node:test
node dist/src/cli.js
```

## Roadmap

Only if people use it: a fix mode (deny rules, keychain migration), a shareable report, a GitHub Action, a team tier. Ideas and false-positive reports are welcome as issues.

## License

MIT
