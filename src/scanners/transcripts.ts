import { stat } from "node:fs/promises";
import { join } from "node:path";
import type { Collector } from "../collector.js";
import { scanFile, walk } from "../scan.js";

// Plain-text line scan on purpose: transcript schemas change between agent versions.
const SOURCES = [".claude/projects", ".claude/history.jsonl", ".codex/sessions", ".codex/history.jsonl", ".gemini/tmp", ".cursor/projects"];
const EXT = /\.(jsonl|json|log|txt|md)$/;

export async function scanTranscripts(home: string, c: Collector): Promise<void> {
  for (const s of SOURCES) {
    const p = join(home, s);
    const st = await stat(p).catch(() => null);
    if (!st) continue;
    if (st.isFile()) await scanFile(p, "transcript", "high", c, false);
    else for await (const f of walk(p, { maxDepth: 8, skipDir: (n) => n === "node_modules", match: (n) => EXT.test(n) })) await scanFile(f, "transcript", "high", c, false);
  }
}
