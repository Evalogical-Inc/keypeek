<p align="center"><img src="https://raw.githubusercontent.com/Evalogical-Inc/keypeek/main/docs/keypeek-banner.svg?v=4" alt="keypeek: see which secrets your AI coding agents can read" width="900"></p>

<!-- mcp-name: io.github.Evalogical-Inc/keypeek -->
# keypeek

**See which secrets your AI coding agents can read.** One command, a few seconds, nothing changed, nothing shown.

**Website:** [keypeek.vercel.app](https://keypeek.vercel.app)

[![website](https://img.shields.io/badge/website-keypeek.vercel.app-f4ac24)](https://keypeek.vercel.app)
[![ci](https://github.com/Evalogical-Inc/keypeek/actions/workflows/ci.yml/badge.svg)](https://github.com/Evalogical-Inc/keypeek/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@evalogical/keypeek)](https://www.npmjs.com/package/@evalogical/keypeek)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
![node >=20](https://img.shields.io/badge/node-%3E%3D20-brightgreen)
![runtime dependencies: 0](https://img.shields.io/badge/runtime%20dependencies-0-brightgreen)

```
npx @evalogical/keypeek
```

<p align="center"><img src="https://raw.githubusercontent.com/Evalogical-Inc/keypeek/main/docs/keypeek-demo.gif" alt="keypeek scanning a demo home folder with fake keys: score 40 out of 100, grade D" width="800"></p>

## Why keypeek exists

You hand an AI coding agent your project. It reads your files, runs your commands, and keeps a full transcript of everything it saw. Most developers never check what that adds up to.

Keys end up in places you do not think about: old `.env` files, shell history, and pasted into agent chats. Nobody did anything wrong. It is what a normal week of building with AI looks like.

Secret scanners look at git history. Secrets managers keep new secrets out of reach. Neither answers the question you actually have today: *what can my AI agents see on this machine right now?*

keypeek answers that in a few seconds, without changing anything, and without ever showing you a secret.

- **Read-only.** It never writes, moves or deletes anything.
- **Local.** No network, no telemetry, zero runtime dependencies.
- **Safe to run.** It never prints a secret: only a 4-character prefix, the length, and a hash fingerprint.

## Quick start

```
npx @evalogical/keypeek
```

Or install it once and run `keypeek`:

```
npm install -g @evalogical/keypeek
keypeek
```

Needs Node 20 or newer. macOS and Linux. A Homebrew install is [planned](https://github.com/Evalogical-Inc/keypeek/issues/8).

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

## How it works

1. **Find.** It looks in the places agents look: transcripts, shell history, `.env` files and the environment of your shell.
2. **Match.** Known key formats plus a conservative rule for `NAME=value` pairs with high-entropy values.
3. **Rank.** A key already in a transcript counts for more than a key in an unused `.env`. The score is capped per surface so one noisy folder cannot hide progress elsewhere.
4. **Redact.** Only a 4-character prefix, the length and a hash fingerprint leave the scanner. The full value is never stored in a result.

## What it checks

| Surface | Where | Severity | Why it matters |
|---|---|---|---|
| transcript | `~/.claude`, `~/.codex`, `~/.gemini`, `~/.cursor` | high | The key was already in a model's context. Rotate it. |
| history | `~/.zsh_history`, `~/.bash_history`, fish history | high | Any agent with shell access can read these files. |
| envfile | `.env*` files under your home (or `--path`) | medium | Agents read these by default. Templates (`.env.example`) are skipped. |
| procenv | environment variables of the shell that runs keypeek | low | Inherited by every subprocess an agent starts. |
| config | Claude Code `settings.json` | | Is `.env` denied? Is subprocess env scrubbing set? |

Detected formats: Anthropic, OpenAI, GitHub, AWS access keys, Stripe, Google API keys, Slack, Hugging Face, JWTs, private-key headers, plus the generic rule for names containing KEY, TOKEN, SECRET or PASSWORD.

The score starts at 100 and loses points per finding. Grades: A 90+, B 75+, C 55+, D 35+, F below.

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

## Use it from Claude Code

keypeek ships a Claude Code plugin: a skill that runs the audit when you ask whether your keys are exposed, and a `/keypeek:audit` command.

```
/plugin marketplace add Evalogical-Inc/keypeek
/plugin install keypeek@keypeek
```

It runs the same read-only CLI through `npx`, tells Claude not to open flagged files, and never changes anything without asking. Note that the report lists where your secrets live (paths and 4-character previews, never values), so it enters the chat; run the audit when you want it. The live guard below is separate and runs on every session.

### Live guard

The plugin also turns on `keypeek guard`, a set of Claude Code hooks that act while the agent works, not after:

| When | What it catches | What happens |
|---|---|---|
| Before a tool runs | `Read`, `Edit` or `Grep` on a `.env` file (not `.env.example`) or a shell history file; shell commands that read those files (`cat .env`, `source .env`), dump the environment (`env`, `printenv`, `export -p`) or print a secret-named variable (`echo $API_TOKEN`) | Claude Code asks you first. Using a variable without printing it (`curl -H "Bearer $API_KEY"`) is not flagged |
| After a tool runs | A known key format in the tool's output | You get a warning to rotate the key; Claude is told not to repeat it |
| When you send a message | A known key format in your prompt | The message is blocked before it reaches the model |

Like the audit, the guard is read-only and offline: it looks only at the hook event Claude Code sends, never opens the files it names, and only ever shows a 4-character preview. If anything goes wrong it stays silent and lets the call through, so it cannot break a session. It runs the plugin's own built copy of keypeek when there is one, otherwise a global `keypeek` (`npm install -g @evalogical/keypeek`), otherwise `npx`.

Limits: a script that loads `.env` itself (for example `dotenv` in `npm start`) is not seen before it runs; only its output is checked. Commands the agent starts still inherit your environment variables, so also set `CLAUDE_CODE_SUBPROCESS_ENV_SCRUB`. A blocked prompt may still be kept in Claude Code's local prompt history. To turn the guard off, disable the keypeek plugin.

## Use it from other AI agents

For Codex, Cursor, Gemini CLI and any MCP client, `keypeek mcp` runs a read-only MCP server with one tool. By default it returns only the score and counts per surface; file paths only when asked, and never values or previews (needs keypeek 0.2.0 or later). For Codex, add this to `~/.codex/config.toml`:

```toml
[mcp_servers.keypeek]
command = "npx"
args = ["-y", "@evalogical/keypeek", "mcp"]
```

Agents without MCP can use an `AGENTS.md` snippet. Copy-paste setup for each is in [docs/agents.md](docs/agents.md).

## Use it in CI

A GitHub Action fails the job when a checkout contains a `.env` file with a real key. A CI runner has no agent transcripts or shell history, so it checks files only, and it ignores the job's own environment so it never flags the runner's secrets.

```yaml
- uses: actions/checkout@v4
- uses: Evalogical-Inc/keypeek@v1
  with:
    path: .          # directory to scan (default: .)
    fail-on: medium  # low, medium or high (default: medium; a key in a .env file is medium)
```

Use a Linux or macOS runner with Node 20 or later (GitHub's hosted runners have it). The report prints the 4-character preview and the file path into the job log, so keep that in mind for public repositories. Pin `version:` if you want a specific keypeek release.

## If keypeek finds something

1. **Rotate it first.** Anything in a transcript or history has already been in a model's context or on disk in plaintext. Treat it as exposed.
2. Move secrets out of project `.env` files and out of shell history: use a secrets manager or your OS keychain, and inject them at run time (for example `op run -- <command>` with 1Password, or the Doppler and Infisical CLIs).
3. Add a deny rule so your agent's file tools skip `.env`. In Claude Code `settings.json`:
   ```json
   { "permissions": { "deny": ["Read(./.env)", "Read(./.env.*)"] } }
   ```
   A deny rule is not a full barrier: shell commands can still read the file. Keep real secrets out of the project folder where you can.
4. Clear old transcripts you no longer need, and run keypeek again to confirm.

Check your agent's current docs for exact permission syntax, and for subprocess environment scrubbing options (third-party posts mention a `CLAUDE_CODE_SUBPROCESS_ENV_SCRUB` setting; keypeek reports whether it is set but has not verified its behavior).

## Trust: verify it yourself

The tool is small on purpose (about 430 lines of TypeScript, zero runtime dependencies), so you can check the promises instead of taking our word for it.

- **Read-only:** a test compares file modification times before and after a scan.
- **No full secrets in output:** a test scans both the text and JSON output for the full value.
- **No network, no writes, no spawned processes:** run this in a clone. It should print nothing.

  ```
  grep -rE "node:(http|https|http2|net|tls|dns|dgram|child_process)|fetch\(|writeFile|appendFile|createWriteStream" src
  ```
- Symlinks are not followed, so a scan cannot wander outside the folders it was given.
- Unreadable files are skipped silently; files over 50MB are skipped and listed.

Found a way it breaks these promises? See the [security policy](SECURITY.md).

## Who it's for

- **Vibe coders and solo builders** who let Claude Code, Cursor or Codex run in their projects and want to know what those tools can reach.
- **Developers with a messy home folder:** old `.env` files, keys pasted into shell history, keys pasted into chats.
- **Small teams and agencies** that want a quick check before handing a laptop or repo to an AI agent.

## How it differs from other tools

- **gitleaks, trufflehog, GitGuardian** find secrets in repositories and can be pointed at any folder. They do not know where AI agents keep transcripts, do not rank by how exposed a secret is to an agent, and do not check agent settings. keypeek is narrower on purpose.
- **Secrets managers and proxies** (1Password CLI, Doppler, Infisical, OneCLI) prevent the problem by keeping secrets out of the agent's reach. keypeek tells you whether you have the problem today. They work well together: audit, fix, audit again.

## FAQ

**Does it send my data anywhere?** No. There is no network code in the package, and no telemetry.

**Can it change or delete my files?** No. It only reads. A test checks that file modification times are unchanged after a scan.

**Will it show me my secrets?** No. It prints a 4-character prefix and the length, never the full value.

**It found a key in a transcript. What now?** Rotate the key. A transcript means a model has already seen it. Clearing the transcript afterwards is optional.

**Is it a replacement for gitleaks or a secrets manager?** No. Use those to prevent and catch leaks. keypeek checks what your AI agents can reach on this machine.

**Does it work on Windows?** Not tested yet. See the [roadmap](ROADMAP.md).

## Known limits

- Pattern-based. Expect some misses (new key formats) and a few false positives (high-entropy values that are not secrets). Help us with [more key formats](https://github.com/Evalogical-Inc/keypeek/issues/14).
- Transcripts are scanned as plain text lines because agent file formats change between versions. Cursor's SQLite chat store is not scanned.
- `.env` files inside dot-directories are not scanned.
- The config checks report whether a setting exists, not whether it fully protects you.
- macOS and Linux. Windows is untested.

## Roadmap

Ideas live as [GitHub issues](https://github.com/Evalogical-Inc/keypeek/issues?q=is%3Aissue+label%3Aroadmap), summarized in [ROADMAP.md](ROADMAP.md): a landing page, a Claude Code plugin, a shareable grade badge, a GitHub Action, an opt-in fix mode, Windows support. Questions and ideas are welcome in [Discussions](https://github.com/Evalogical-Inc/keypeek/discussions).

## Contributing and docs

- [Contributing](CONTRIBUTING.md) · [Runbook](docs/RUNBOOK.md) (add patterns, triage, release) · [Changelog](CHANGELOG.md) · [Security policy](SECURITY.md) · [Code of conduct](CODE_OF_CONDUCT.md)

```
npm install
npm test          # compiles, then runs node:test
node dist/src/cli.js
```

## License

MIT
