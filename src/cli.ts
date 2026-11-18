#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { parseArgs } from "node:util";
import { runAudit } from "./audit.js";
import { renderReport } from "./report.js";
import type { Severity } from "./types.js";

const HELP = `keypeek: see which secrets your AI coding agents can read.
Read-only. No network. Secret values are never printed.

Usage: keypeek [options]
  --path <dir>        directory to scan for .env files (repeatable, default: home)
  --no-history        skip shell history files
  --all               show every finding (default: top rows per section)
  --json              machine-readable output
  --fail-on <level>   exit 1 if a finding at this severity or above exists (low|medium|high)
  -v, --version
  -h, --help
`;

const RANK: Record<Severity, number> = { low: 0, medium: 1, high: 2 };

async function main(): Promise<number> {
  const { values } = parseArgs({
    options: {
      path: { type: "string", multiple: true },
      "no-history": { type: "boolean" },
      all: { type: "boolean" },
      json: { type: "boolean" },
      "fail-on": { type: "string" },
      help: { type: "boolean", short: "h" },
      version: { type: "boolean", short: "v" },
    },
  });
  if (values.help) return console.log(HELP), 0;
  // dist/src/cli.js -> package root is two levels up
  if (values.version) return console.log(JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8")).version), 0;
  const failOn = values["fail-on"] as Severity | undefined;
  if (failOn && !(failOn in RANK)) return console.error(`--fail-on must be low, medium or high`), 2;

  const home = homedir();
  // Status goes to stderr, only on a terminal, so --json and piped output stay clean.
  const live = Boolean(process.stderr.isTTY) && !values.json;
  if (live) process.stderr.write("keypeek: scanning, this can take a few seconds…");
  const result = await runAudit({ home, roots: values.path ?? [home], cwd: process.cwd(), history: !values["no-history"], env: process.env });
  if (live) process.stderr.write("\r\x1b[2K");
  console.log(values.json ? JSON.stringify(result, null, 2) : renderReport(result, { all: values.all }));
  return failOn && result.findings.some((f) => RANK[f.severity] >= RANK[failOn]) ? 1 : 0;
}

main().then((code) => process.exit(code), (e) => (console.error(String(e)), process.exit(2)));
