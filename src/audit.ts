import { Collector } from "./collector.js";
import { checkAgentConfig } from "./scanners/agentconfig.js";
import { scanEnvFiles } from "./scanners/envfiles.js";
import { scanHistory } from "./scanners/history.js";
import { scanProcEnv } from "./scanners/procenv.js";
import { scanTranscripts } from "./scanners/transcripts.js";
import { score } from "./score.js";
import type { AuditResult } from "./types.js";

export interface AuditOptions {
  home: string;
  roots: string[];
  cwd: string;
  history: boolean;
  env: NodeJS.ProcessEnv;
}

export async function runAudit(o: AuditOptions): Promise<AuditResult> {
  const c = new Collector();
  await scanEnvFiles(o.roots, c);
  await scanTranscripts(o.home, c);
  if (o.history) await scanHistory(o.home, c);
  scanProcEnv(o.env, c);
  const checks = await checkAgentConfig(o.home, o.cwd, o.env);
  const findings = c.findings;
  return { findings, checks, skipped: c.skipped, ...score(findings, checks) };
}
