import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { ConfigCheck } from "../types.js";

interface Settings {
  permissions?: { deny?: unknown[] };
  env?: Record<string, unknown>;
}

async function load(p: string): Promise<Settings | null> {
  try {
    return JSON.parse(await readFile(p, "utf8")) as Settings;
  } catch {
    return null;
  }
}

// Reports config state only; behavior claims come from third-party tests, so details say "verify".
export async function checkAgentConfig(home: string, cwd: string, env: NodeJS.ProcessEnv): Promise<ConfigCheck[]> {
  const files = [join(home, ".claude/settings.json"), join(cwd, ".claude/settings.json"), join(cwd, ".claude/settings.local.json")];
  const settings = (await Promise.all(files.map(load))).filter((s): s is Settings => s !== null);
  if (settings.length === 0) {
    return [{ name: "Claude Code settings", status: "unknown", detail: "No settings.json found; Claude Code defaults apply." }];
  }
  const denies = settings.flatMap((s) => (s.permissions?.deny ?? []).map(String));
  const scrub = env.CLAUDE_CODE_SUBPROCESS_ENV_SCRUB || settings.some((s) => s.env?.CLAUDE_CODE_SUBPROCESS_ENV_SCRUB);
  return [
    denies.some((d) => /Read\(.*\.env/.test(d))
      ? { name: "Deny Read(.env)", status: "ok", detail: "A deny rule for .env exists. It blocks file tools but may not stop shell commands (verify)." }
      : { name: "Deny Read(.env)", status: "warn", detail: "No deny rule for .env in Claude Code settings. Agents can read .env files by default." },
    scrub
      ? { name: "Subprocess env scrub", status: "ok", detail: "CLAUDE_CODE_SUBPROCESS_ENV_SCRUB is set (verify behavior against current docs)." }
      : { name: "Subprocess env scrub", status: "warn", detail: "CLAUDE_CODE_SUBPROCESS_ENV_SCRUB is not set; agent subprocesses inherit your env vars (verify against current docs)." },
  ];
}
