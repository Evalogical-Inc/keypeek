import type { Collector } from "../collector.js";
import { scanLine } from "../patterns.js";

// Env vars are inherited by every subprocess an agent starts, so they count as reachable.
export function scanProcEnv(env: NodeJS.ProcessEnv, c: Collector): void {
  for (const [name, value] of Object.entries(env)) {
    if (!value) continue;
    for (const h of scanLine(`${name}=${value}`, true)) c.add(h, "procenv", "(process environment)", 0, "low");
  }
}
