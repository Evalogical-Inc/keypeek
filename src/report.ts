import type { AuditResult, Severity } from "./types.js";

const useColor = process.stdout.isTTY && !process.env.NO_COLOR;
const paint = (code: number, s: string) => (useColor ? `\x1b[${code}m${s}\x1b[0m` : s);
const SEV: Record<Severity, (s: string) => string> = { high: (s) => paint(31, s), medium: (s) => paint(33, s), low: (s) => paint(36, s) };
const ORDER: Severity[] = ["high", "medium", "low"];

const SURFACE_NOTE: Record<string, string> = {
  transcript: "Agent transcripts: the key was already in a model's context. Rotate it.",
  history: "Shell history: any agent with shell access can read this file.",
  envfile: ".env files: agents can read these by default.",
  procenv: "Environment variables: inherited by every subprocess an agent starts.",
};

export function renderReport(r: AuditResult): string {
  const out: string[] = [];
  out.push(paint(1, "keypeek") + "  what your AI agents can see (read-only, nothing leaves this machine)", "");
  out.push(`Score: ${paint(1, `${r.score}/100`)}  Grade: ${paint(1, r.grade)}`, "");

  if (r.findings.length === 0) out.push("No secrets found in the scanned locations.", "");
  const sorted = [...r.findings].sort((a, b) => ORDER.indexOf(a.severity) - ORDER.indexOf(b.severity));
  for (const surface of ["transcript", "history", "envfile", "procenv"]) {
    const list = sorted.filter((f) => f.surface === surface);
    if (!list.length) continue;
    out.push(paint(1, `${surface} (${list.length})`) + "  " + SURFACE_NOTE[surface]);
    for (const f of list) {
      const where = f.line ? `${f.file}:${f.line}` : f.file;
      out.push(`  ${SEV[f.severity](f.severity.padEnd(6))} ${f.provider.padEnd(22)} ${f.preview.padEnd(10)} #${f.fp}  x${f.count}  ${where}`);
    }
    out.push("");
  }

  out.push(paint(1, "Agent config"));
  for (const c of r.checks) out.push(`  ${c.status === "ok" ? "ok  " : c.status === "warn" ? "warn" : "?   "} ${c.name}: ${c.detail}`);
  if (r.skipped.length) out.push("", `Skipped ${r.skipped.length} file(s) over 50MB:`, ...r.skipped.map((s) => `  ${s}`));
  out.push("", "Values are never printed: only a 4-char prefix, length and a hash fingerprint.");
  return out.join("\n");
}
