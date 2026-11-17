import { fingerprint, redact } from "./redact.js";
import type { Finding, Hit, Severity, Surface } from "./types.js";

// Dedupes by surface + fingerprint: one key seen 400 times is one finding with count 400.
export class Collector {
  private map = new Map<string, Finding>();
  skipped: string[] = [];

  add(h: Hit, surface: Surface, file: string, line: number, severity: Severity): void {
    const fp = fingerprint(h.secret);
    const key = `${surface}:${fp}`;
    const f = this.map.get(key);
    if (f) f.count++;
    else this.map.set(key, { provider: h.provider, surface, severity, file, line, preview: redact(h.secret), fp, count: 1 });
  }

  get findings(): Finding[] {
    return [...this.map.values()];
  }
}
