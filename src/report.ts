import { homedir } from "node:os";
import type { AuditResult, Finding, Severity, Surface } from "./types.js";

export interface RenderOptions {
  all?: boolean; // show every finding instead of the top rows per section
  cols?: number; // terminal width
  color?: boolean;
  home?: string; // shown as ~ in paths
}

const SEV_ORDER: Severity[] = ["high", "medium", "low"];
const SURFACES: { key: Surface; title: string; note: string }[] = [
  { key: "transcript", title: "Agent transcripts", note: "already in a model's context, rotate these" },
  { key: "history", title: "Shell history", note: "any agent with shell access can read it" },
  { key: "envfile", title: ".env files", note: "agents read these by default" },
  { key: "procenv", title: "Environment variables", note: "inherited by every subprocess an agent starts" },
];
const TOP_ROWS = 8;

// Middle-truncates so both the start (which agent / project) and the filename stay visible.
function fit(s: string, width: number): string {
  if (s.length <= width) return s;
  const head = Math.ceil((width - 1) * 0.4);
  return s.slice(0, head) + "…" + s.slice(s.length - (width - 1 - head));
}
function clip(s: string, width: number): string {
  return s.length <= width ? s : s.slice(0, width - 1) + "…";
}

export function renderReport(r: AuditResult, o: RenderOptions = {}): string {
  const color = o.color ?? (Boolean(process.stdout.isTTY) && !process.env.NO_COLOR);
  const cols = Math.max(60, Math.min(o.cols ?? process.stdout.columns ?? 100, 140));
  const home = o.home ?? homedir();
  const c = (code: string, s: string) => (color ? `\x1b[${code}m${s}\x1b[0m` : s);
  const bold = (s: string) => c("1", s);
  const dim = (s: string) => c("2", s);
  const sevColor: Record<Severity, string> = { high: "31", medium: "33", low: "36" };
  const gradeColor = r.score >= 75 ? "32" : r.score >= 55 ? "33" : "31";
  const tilde = (p: string) => (home && p.startsWith(home) ? "~" + p.slice(home.length) : p);

  const out: string[] = [];
  out.push(bold("keypeek") + dim("  what your AI agents can see. Read-only, nothing leaves this machine."), "");

  const filled = Math.round(r.score / 5);
  out.push(`${bold("Score")}  ${c(gradeColor, "█".repeat(filled) + dim("░".repeat(20 - filled)))}  ${bold(`${r.score}/100`)}  grade ${c(gradeColor, bold(r.grade))}`);
  const n = (s: Severity) => r.findings.filter((f) => f.severity === s).length;
  out.push(
    r.findings.length === 0
      ? c("32", "No secrets found in the scanned locations.")
      : `${bold(String(r.findings.length))} findings: ${c(sevColor.high, `${n("high")} high`)} · ${c(sevColor.medium, `${n("medium")} medium`)} · ${c(sevColor.low, `${n("low")} low`)}`,
    "",
  );

  const sorted = [...r.findings].sort((a, b) => SEV_ORDER.indexOf(a.severity) - SEV_ORDER.indexOf(b.severity) || b.count - a.count);
  const PROV = 22;
  const PREV = 12;
  const fixed = 2 + 6 + 1 + PROV + 1 + PREV + 1 + 6 + 1; // indent, sev, gaps, seen
  const locW = Math.max(20, cols - fixed);

  for (const s of SURFACES) {
    const list = sorted.filter((f: Finding) => f.surface === s.key);
    if (!list.length) continue;
    out.push(`${bold(`${s.title} (${list.length})`)}  ${dim(s.note)}`);
    out.push(dim(`  ${"SEV".padEnd(6)} ${"TYPE".padEnd(PROV)} ${"VALUE".padEnd(PREV)} ${"SEEN".padEnd(6)} LOCATION`));
    const shown = o.all ? list : list.slice(0, TOP_ROWS);
    for (const f of shown) {
      const where = f.line ? `${tilde(f.file)}:${f.line}` : f.file;
      const type = f.provider.startsWith("generic:") ? f.provider.slice(8) : f.provider;
      out.push(`  ${c(sevColor[f.severity], f.severity.padEnd(6))} ${clip(type, PROV).padEnd(PROV)} ${f.preview.padEnd(PREV)} ${`x${f.count}`.padEnd(6)} ${fit(where, locW)}`);
    }
    if (list.length > shown.length) out.push(dim(`  … and ${list.length - shown.length} more (run with --all, or --json for everything)`));
    out.push("");
  }

  out.push(bold("Agent config"));
  for (const k of r.checks) {
    const mark = k.status === "ok" ? c("32", "✓") : k.status === "warn" ? c("33", "!") : dim("?");
    out.push(`  ${mark} ${k.name}: ${k.detail}`);
  }
  if (r.skipped.length) out.push("", dim(`Skipped ${r.skipped.length} file(s) over 50MB.`));

  if (r.findings.length) {
    out.push("", bold("Next steps"));
    out.push("  1. Rotate anything under transcripts or shell history first. It has already been exposed.");
    out.push("  2. Move secrets out of project .env files into a secrets manager or the OS keychain.");
    out.push("  3. Add a deny rule for .env in your agent's settings, then run keypeek again.");
  }
  out.push("", dim("Values are never printed: only a 4-char prefix, the length and a hash fingerprint (#hash in --json)."));
  return out.join("\n");
}
