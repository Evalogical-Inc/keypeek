import { createReadStream } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { createInterface } from "node:readline";
import type { Collector } from "./collector.js";
import { scanLine } from "./patterns.js";
import type { Severity, Surface } from "./types.js";

// shortcut: files over 50MB are skipped (and reported), raise if real transcripts exceed it.
const MAX_BYTES = 50 * 1024 * 1024;

export async function scanFile(file: string, surface: Surface, severity: Severity, c: Collector, generic: boolean): Promise<void> {
  try {
    const st = await stat(file);
    if (!st.isFile()) return;
    if (st.size > MAX_BYTES) return void c.skipped.push(file);
    const rl = createInterface({ input: createReadStream(file, { encoding: "utf8" }), crlfDelay: Infinity });
    let n = 0;
    for await (const line of rl) {
      n++;
      for (const h of scanLine(line, generic)) c.add(h, surface, file, n, severity);
    }
  } catch {
    // unreadable file (permissions, vanished mid-scan): skip it, never fail the audit
  }
}

interface WalkOpts {
  maxDepth: number;
  skipDir: (name: string) => boolean;
  match: (name: string) => boolean;
}

export async function* walk(root: string, o: WalkOpts, depth = 0): AsyncGenerator<string> {
  let ents;
  try {
    ents = await readdir(root, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of ents) {
    if (e.isSymbolicLink()) continue; // avoids loops and escaping the scan roots
    const p = join(root, e.name);
    if (e.isDirectory()) {
      if (depth < o.maxDepth && !o.skipDir(e.name)) yield* walk(p, o, depth + 1);
    } else if (e.isFile() && o.match(e.name)) yield p;
  }
}
