import type { ConfigCheck, Finding, Surface } from "./types.js";

const WEIGHT = { high: 15, medium: 8, low: 2 };
// Per-surface caps (sum to 100) so one noisy surface can't zero the score and hide progress elsewhere.
const CAP: Record<Surface | "config", number> = { transcript: 40, history: 25, envfile: 20, procenv: 5, config: 10 };

export function score(findings: Finding[], checks: ConfigCheck[]): { score: number; grade: string } {
  const raw: Record<string, number> = { config: checks.filter((c) => c.status === "warn").length * 5 };
  for (const f of findings) raw[f.surface] = (raw[f.surface] ?? 0) + WEIGHT[f.severity];
  const penalty = Object.entries(raw).reduce((s, [k, v]) => s + Math.min(v, CAP[k as keyof typeof CAP]), 0);
  const score = Math.max(0, 100 - penalty);
  const grade = score >= 90 ? "A" : score >= 75 ? "B" : score >= 55 ? "C" : score >= 35 ? "D" : "F";
  return { score, grade };
}
