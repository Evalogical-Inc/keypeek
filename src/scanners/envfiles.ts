import type { Collector } from "../collector.js";
import { scanFile, walk } from "../scan.js";

const SKIP = new Set(["node_modules", "Library", "Applications", "Movies", "Music", "Pictures", "venv", "dist", "build", "target", "vendor", "Pods"]);
const ENV = /^\.env(\..+)?$/;
const TEMPLATE = /\.(example|sample|template|dist)$/;

// Dot-directories are skipped (covers .git); .env files inside them are not scanned.
export async function scanEnvFiles(roots: string[], c: Collector): Promise<void> {
  for (const root of roots) {
    const files = walk(root, { maxDepth: 6, skipDir: (n) => n.startsWith(".") || SKIP.has(n), match: (n) => ENV.test(n) && !TEMPLATE.test(n) });
    for await (const f of files) await scanFile(f, "envfile", "medium", c, true);
  }
}
