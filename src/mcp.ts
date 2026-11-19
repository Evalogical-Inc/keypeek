import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { createInterface } from "node:readline";
import { runAudit } from "./audit.js";
import type { AuditResult } from "./types.js";

// dist/src/mcp.js -> package root is two levels up
const VERSION: string = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8")).version;

// Minimal MCP server over stdio (newline-delimited JSON-RPC). One read-only tool, no dependencies.
const TOOL = {
  name: "audit_secret_exposure",
  description:
    "Read-only audit of which secrets AI coding agents can read on this machine (.env files, agent chat transcripts, shell history, process environment). Returns a score, a grade and counts per surface. Never returns secret values or previews. Set details=true only when the user asks where the secrets are.",
  inputSchema: {
    type: "object",
    properties: {
      details: { type: "boolean", description: "Also list each finding's provider, surface, severity, file and line. Default false: counts only." },
      history: { type: "boolean", description: "Include shell history files. Default false." },
    },
    additionalProperties: false,
  },
  annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
};

export function summarize(r: AuditResult, details: boolean) {
  const count = (key: "surface" | "severity") =>
    r.findings.reduce<Record<string, number>>((m, f) => ((m[f[key]] = (m[f[key]] ?? 0) + 1), m), {});
  return {
    score: r.score,
    grade: r.grade,
    total: r.findings.length,
    bySurface: count("surface"),
    bySeverity: count("severity"),
    checks: r.checks,
    skipped: r.skipped.length,
    // preview and fp are left out on purpose: an agent does not need them to explain the result.
    ...(details && { findings: r.findings.map(({ provider, surface, severity, file, line, count }) => ({ provider, surface, severity, file, line, count })) }),
  };
}

type Req = { jsonrpc?: string; id?: string | number | null; method?: string; params?: any };

async function handle(m: Req): Promise<object | null> {
  const reply = (result: object) => ({ jsonrpc: "2.0", id: m.id, result });
  const fail = (code: number, message: string) => ({ jsonrpc: "2.0", id: m.id ?? null, error: { code, message } });
  if (m.id === undefined) return null; // notification: no response
  switch (m.method) {
    case "initialize":
      return reply({ protocolVersion: m.params?.protocolVersion ?? "2025-06-18", capabilities: { tools: {} }, serverInfo: { name: "keypeek", version: VERSION } });
    case "ping":
      return reply({});
    case "tools/list":
      return reply({ tools: [TOOL] });
    case "tools/call": {
      if (m.params?.name !== TOOL.name) return fail(-32602, `Unknown tool: ${m.params?.name}`);
      try {
        const a = m.params.arguments ?? {};
        const home = homedir();
        const r = await runAudit({ home, roots: [home], cwd: process.cwd(), history: a.history === true, env: process.env });
        return reply({ content: [{ type: "text", text: JSON.stringify(summarize(r, a.details === true)) }] });
      } catch (e) {
        return reply({ isError: true, content: [{ type: "text", text: `keypeek failed: ${(e as Error).message}` }] });
      }
    }
    default:
      return fail(-32601, `Method not found: ${m.method}`);
  }
}

export async function serve(): Promise<void> {
  for await (const line of createInterface({ input: process.stdin })) {
    if (!line.trim()) continue;
    let out: object | null;
    try {
      out = await handle(JSON.parse(line));
    } catch {
      out = { jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } };
    }
    if (out) process.stdout.write(JSON.stringify(out) + "\n");
  }
}
