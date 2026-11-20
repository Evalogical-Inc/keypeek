import { basename } from "node:path";
import { scanLine, SECRET_NAME } from "./patterns.js";
import { fingerprint, redact } from "./redact.js";
import { ENV, TEMPLATE } from "./scanners/envfiles.js";
import { FILES as HISTORY_FILES } from "./scanners/history.js";
import type { Hit } from "./types.js";

// Claude Code hook handler. Reads one hook event, returns a decision or null (no opinion).
// Read-only and offline like the audit: it looks at the event JSON only and never at the files it names.
// Only redacted previews (4-char prefix + length) ever appear in its output.

export interface HookInput {
  hook_event_name?: string;
  tool_name?: string;
  tool_input?: Record<string, unknown>;
  tool_response?: unknown;
  prompt?: string;
}

export type Decision = Record<string, unknown> | null;

// Claude Code hook event names, as sent in hook_event_name and echoed back in hookSpecificOutput.hookEventName.
const PRE_TOOL_USE = "PreToolUse";
const POST_TOOL_USE = "PostToolUse";
const USER_PROMPT_SUBMIT = "UserPromptSubmit";

const HISTORY = new Set(HISTORY_FILES.map((f) => basename(f)));
const FILE_TOOLS = new Set(["Read", "Edit", "MultiEdit"]);

// Why a path is sensitive, or null. Mirrors what the audit treats as an env file or a history file.
export function sensitivePath(p: string): string | null {
  const name = basename(p.replace(/\/+$/, ""));
  if (ENV.test(name) && !TEMPLATE.test(name)) return `a .env file (${name})`;
  if (HISTORY.has(name)) return `your shell history (${name})`;
  if (/^\/proc\/[^/]+\/environ$/.test(p)) return "a process environment (/proc/…/environ)";
  return null;
}

const str = (v: unknown): string => (typeof v === "string" ? v : "");

// Strips quotes so `cat ".env"` and `cat '.env'` read like `cat .env`.
const words = (s: string) => s.split(/\s+/).map((w) => w.replace(/^["']+|["']+$/g, "")).filter(Boolean);

export function checkBash(cmd: string): string | null {
  // Any word that names a sensitive file: cat .env, source .env, grep KEY ~/.zsh_history, $(cat .env)
  for (const tok of cmd.split(/[\s;|&()<>`'"=]+/)) {
    const why = tok && sensitivePath(tok);
    if (why) return `this command touches ${why}. Any keys in it would go into the model's context.`;
  }
  for (const seg of cmd.split(/\|\||&&|[;|\n&]/)) {
    const w = words(seg);
    while (w.length && (w[0] === "sudo" || w[0] === "command" || /^[A-Za-z_][A-Za-z0-9_]*=/.test(w[0]))) w.shift();
    if (!w.length) continue;
    const [cmd0, ...args] = [basename(w[0]), ...w.slice(1)];
    const flagsOnly = args.every((a) => a.startsWith("-"));
    const dump = "this command prints your environment variables, including any API keys in them.";
    if (cmd0 === "env" && flagsOnly) return dump;
    if (cmd0 === "printenv" && (args.length === 0 || args.some((a) => SECRET_NAME.test(a)))) return args.length ? `this command prints a secret-named variable (${args.find((a) => SECRET_NAME.test(a))}).` : dump;
    if ((cmd0 === "export" || cmd0 === "declare" || cmd0 === "typeset") && flagsOnly) return dump;
    if (cmd0 === "set" && args.length === 0) return dump;
    if (cmd0 === "echo" || cmd0 === "printf") {
      for (const m of seg.matchAll(/\$\{?([A-Za-z_][A-Za-z0-9_]*)/g)) {
        if (SECRET_NAME.test(m[1])) return `this command prints a secret-named variable ($${m[1]}).`;
      }
    }
  }
  return null;
}

export function checkTool(tool: string, input: Record<string, unknown>): string | null {
  if (FILE_TOOLS.has(tool)) {
    const why = sensitivePath(str(input.file_path));
    return why && `${tool} would load ${why} into the model's context.`;
  }
  if (tool === "Grep") {
    const why = sensitivePath(str(input.path));
    if (why) return `Grep would search ${why} and put matching lines in the model's context.`;
    const glob = str(input.glob);
    if (/(^|[/{,])\.env/.test(glob) && !TEMPLATE.test(glob)) return `Grep would search .env files (${glob}) and put matching lines in the model's context.`;
    return null;
  }
  if (tool === "Bash") return checkBash(str(input.command));
  return null;
}

// Collects every string inside a tool response (objects, arrays), so keys are matched on their own lines
// rather than inside JSON-escaped text where "\n" would glue onto the key.
function strings(v: unknown, out: string[], depth = 0): string[] {
  if (depth > 20) return out;
  if (typeof v === "string") out.push(v);
  else if (Array.isArray(v)) for (const x of v) strings(x, out, depth + 1);
  else if (v && typeof v === "object") for (const x of Object.values(v)) strings(x, out, depth + 1);
  return out;
}

// Provider formats only (generic=false): tool output and prompts are prose and code, not config.
export function findKeys(text: string[]): Hit[] {
  const seen = new Map<string, Hit>();
  for (const t of text) for (const line of t.split("\n")) for (const h of scanLine(line, false)) seen.set(fingerprint(h.secret), h);
  return [...seen.values()];
}

function describe(hits: Hit[]): string {
  const shown = hits.slice(0, 3).map((h) => `${h.provider} ${redact(h.secret)}`).join(", ");
  return hits.length > 3 ? `${shown} and ${hits.length - 3} more` : shown;
}

export function decide(e: HookInput): Decision {
  const event = e.hook_event_name;
  if (event === PRE_TOOL_USE && e.tool_name && e.tool_input && typeof e.tool_input === "object") {
    const why = checkTool(e.tool_name, e.tool_input);
    if (!why) return null;
    return {
      hookSpecificOutput: {
        hookEventName: PRE_TOOL_USE,
        permissionDecision: "ask",
        permissionDecisionReason: `keypeek: ${why} Allow only if you mean to share it.`,
      },
    };
  }
  if (event === POST_TOOL_USE) {
    const hits = findKeys(strings(e.tool_response, []));
    if (!hits.length) return null;
    const what = describe(hits);
    const n = hits.length === 1 ? "a key" : `${hits.length} keys`;
    return {
      systemMessage: `keypeek: ${e.tool_name ?? "tool"} output contained ${n} (${what}). It is now in the model's context: rotate it.`,
      hookSpecificOutput: {
        hookEventName: POST_TOOL_USE,
        additionalContext: `keypeek: the ${e.tool_name ?? "tool"} output above contains ${n} (${what}). Do not repeat the value in replies, files or commands. Tell the user to rotate it.`,
      },
    };
  }
  if (event === USER_PROMPT_SUBMIT) {
    const hits = findKeys([str(e.prompt)]);
    if (!hits.length) return null;
    return {
      decision: "block",
      reason: `keypeek: your message contains ${hits.length === 1 ? "a key" : `${hits.length} keys`} (${describe(hits)}), so it was not sent to the model. Remove it and refer to the key by its environment variable name instead.`,
    };
  }
  return null;
}

// Fails open: unreadable input or any error means no output and exit 0, so the guard never breaks a session.
export async function runGuard(): Promise<void> {
  try {
    let raw = "";
    for await (const chunk of process.stdin) raw += chunk;
    const d = decide(JSON.parse(raw) as HookInput);
    if (d) process.stdout.write(JSON.stringify(d) + "\n");
  } catch {
    // no opinion
  }
}
