import { join } from "node:path";
import type { Collector } from "../collector.js";
import { scanFile } from "../scan.js";

export const FILES =[".zsh_history", ".bash_history", ".local/share/fish/fish_history"];

export async function scanHistory(home: string, c: Collector): Promise<void> {
  for (const f of FILES) await scanFile(join(home, f), "history", "high", c, true);
}
