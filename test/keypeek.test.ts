import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { runAudit } from "../src/audit.js";
import { scanLine } from "../src/patterns.js";
import { redact } from "../src/redact.js";
import { renderReport } from "../src/report.js";

// Built at runtime so no secret-looking literal is committed (GitHub push protection).
const body = "aB3dE5fG7hJ9kL1mN3pQ5rS7tU9vW1xY";
const ANT = "sk-" + "ant-" + body;
const OPENAI = "sk-" + body + "Zz";
const AWS = "AKIA" + "ABCDEFGHIJKLMNOP";

test("detects provider keys and keeps anthropic distinct from openai", () => {
  assert.equal(scanLine(`key=${ANT}`, false)[0].provider, "Anthropic");
  assert.equal(scanLine(`key=${OPENAI}`, false)[0].provider, "OpenAI");
  assert.equal(scanLine(`aws ${AWS}`, false)[0].provider, "AWS");
});

test("ignores placeholders and example keys", () => {
  assert.equal(scanLine("OPENAI_API_KEY=your-api-key-goes-here-123456", true).length, 0);
  assert.equal(scanLine("AKIAIOSFODNN7EXAMPLE", false).length, 0);
  assert.equal(scanLine("API_SECRET=aaaaaaaaaaaaaaaaaaaaaaaa", true).length, 0); // low entropy
});

test("generic rule flags high-entropy NAME=value but not twice with a provider hit", () => {
  const hits = scanLine(`OPENAI_API_KEY=${OPENAI}`, true);
  assert.equal(hits.length, 1);
  assert.equal(scanLine("DB_PASSWORD=Xk9#mQ2vLp7RtZ4wBn8s", true)[0].provider, "generic:DB_PASSWORD");
});

test("redact exposes only a 4-char prefix and the length", () => {
  assert.equal(redact(ANT), `sk-a…(${ANT.length})`);
});

function fixture() {
  const home = mkdtempSync(join(tmpdir(), "keypeek-"));
  const proj = join(home, "proj");
  mkdirSync(proj);
  writeFileSync(join(proj, ".env"), `OPENAI_API_KEY=${OPENAI}\nOTHER=1\n`);
  writeFileSync(join(proj, ".env.example"), `OPENAI_API_KEY=${OPENAI}\n`); // template: ignored
  mkdirSync(join(home, ".claude/projects/p"), { recursive: true });
  const line = JSON.stringify({ text: `here is my key ${ANT}` }) + "\n";
  writeFileSync(join(home, ".claude/projects/p/s.jsonl"), line.repeat(5));
  writeFileSync(join(home, ".zsh_history"), `: 1:0;export AWS_KEY=${AWS}\n`);
  return { home, proj };
}

test("audit finds each surface, dedupes repeats, skips templates", async () => {
  const { home } = fixture();
  const r = await runAudit({ home, roots: [home], cwd: home, history: true, env: {} });
  const by = (s: string) => r.findings.filter((f) => f.surface === s);
  assert.equal(by("envfile").length, 1);
  assert.equal(by("transcript").length, 1);
  assert.equal(by("transcript")[0].count, 5);
  assert.equal(by("history").length, 1);
  assert.ok(r.score < 100);
});

test("raw secrets never appear in text or JSON output", async () => {
  const { home } = fixture();
  const r = await runAudit({ home, roots: [home], cwd: home, history: true, env: { MY_API_TOKEN: OPENAI } });
  const out = renderReport(r) + JSON.stringify(r);
  for (const secret of [ANT, OPENAI, AWS, body]) assert.ok(!out.includes(secret), "leaked a secret");
});

test("audit is read-only: file mtimes unchanged", async () => {
  const { home, proj } = fixture();
  const files = [join(proj, ".env"), join(home, ".zsh_history"), join(home, ".claude/projects/p/s.jsonl")];
  const before = files.map((f) => statSync(f).mtimeMs);
  await runAudit({ home, roots: [home], cwd: home, history: true, env: {} });
  assert.deepEqual(files.map((f) => statSync(f).mtimeMs), before);
});

test("score caps each surface so many findings do not zero it", async () => {
  const { score } = await import("../src/score.js");
  const f = (i: number) => ({ provider: "x", surface: "envfile" as const, severity: "high" as const, file: "f", line: i, preview: "p", fp: String(i), count: 1 });
  const many = Array.from({ length: 50 }, (_, i) => f(i));
  assert.equal(score(many, []).score, 80); // envfile capped at 20
});

test("report fits the terminal width and keeps filenames visible", async () => {
  const { home } = fixture();
  const r = await runAudit({ home, roots: [home], cwd: home, history: true, env: {} });
  const text = renderReport(r, { cols: 80, color: false, home });
  for (const line of text.split("\n")) assert.ok(line.length <= 100, `line too wide: ${line.length}`);
  assert.ok(text.includes("~/.zsh_history") && text.includes("Next steps"));
});

test("an unknown flag gives a one-line message and exit code 2", async () => {
  const { spawnSync } = await import("node:child_process");
  const r = spawnSync(process.execPath, [join(import.meta.dirname, "../src/cli.js"), "--verison"], { encoding: "utf8" });
  assert.equal(r.status, 2);
  assert.ok(/Unknown option '--verison'/.test(r.stderr) && r.stderr.trim().split("\n").length === 1, r.stderr);
});

test("mcp server: lists one read-only tool, returns counts without secrets, paths only on request", async () => {
  const { spawn } = await import("node:child_process");
  const { home } = fixture();
  const p = spawn(process.execPath, [join(import.meta.dirname, "../src/cli.js"), "mcp"], { env: { ...process.env, HOME: home, USERPROFILE: home }, cwd: home });
  const lines: any[] = [];
  let buf = "";
  p.stdout.on("data", (d) => {
    buf += d;
    for (let i = buf.indexOf("\n"); i >= 0; i = buf.indexOf("\n")) (lines.push(JSON.parse(buf.slice(0, i))), (buf = buf.slice(i + 1)));
  });
  const send = (o: object) => p.stdin.write(JSON.stringify(o) + "\n");
  const wait = async (n: number) => { for (let i = 0; i < 200 && lines.length < n; i++) await new Promise((r) => setTimeout(r, 50)); };
  send({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18" } });
  send({ jsonrpc: "2.0", method: "notifications/initialized" }); // no reply expected
  send({ jsonrpc: "2.0", id: 2, method: "tools/list" });
  send({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "audit_secret_exposure", arguments: {} } });
  send({ jsonrpc: "2.0", id: 4, method: "tools/call", params: { name: "audit_secret_exposure", arguments: { details: true, history: true } } });
  send({ jsonrpc: "2.0", id: 5, method: "nope" });
  await wait(5);
  p.kill();
  assert.equal(lines.length, 5);
  assert.equal(lines[0].result.serverInfo.name, "keypeek");
  assert.equal(lines[1].result.tools.length, 1);
  assert.equal(lines[1].result.tools[0].annotations.readOnlyHint, true);
  const counts = JSON.parse(lines[2].result.content[0].text);
  assert.ok(counts.total >= 2 && !("findings" in counts));
  const detailed = JSON.parse(lines[3].result.content[0].text);
  assert.ok(detailed.findings.length === detailed.total && detailed.findings.every((f: any) => !("preview" in f) && !("fp" in f)));
  assert.equal(lines[4].error.code, -32601);
  const all = JSON.stringify(lines);
  for (const secret of [ANT, OPENAI, AWS, body, "sk-a…"]) assert.ok(!all.includes(secret), "leaked a secret");
});

test("guard asks before an agent reads .env or history files, and allows templates", async () => {
  const { decide } = await import("../src/guard.js");
  const pre = (tool_name: string, tool_input: object) => decide({ hook_event_name: "PreToolUse", tool_name, tool_input: tool_input as Record<string, unknown> });
  const asks = (d: any) => d?.hookSpecificOutput?.permissionDecision === "ask";
  assert.ok(asks(pre("Read", { file_path: "/home/u/proj/.env" })));
  assert.ok(asks(pre("Read", { file_path: "/home/u/proj/.env.local" })));
  assert.ok(asks(pre("Edit", { file_path: "/home/u/.zsh_history" })));
  assert.ok(asks(pre("Grep", { pattern: "KEY", glob: "**/.env*" })));
  assert.equal(pre("Read", { file_path: "/home/u/proj/.env.example" }), null);
  assert.equal(pre("Read", { file_path: "/home/u/proj/src/env.ts" }), null);
  assert.equal(pre("Write", { file_path: "/home/u/proj/.env" }), null);
});

test("guard asks before shell commands that print secrets, not ones that only use them", async () => {
  const { checkBash } = await import("../src/guard.js");
  for (const c of ["cat .env", "source ./.env && npm start", "grep KEY '.env.production'", "echo $(cat proj/.env)", "env", "env | grep KEY", "printenv", "printenv OPENAI_API_KEY", "echo $API_TOKEN", 'echo "${DB_PASSWORD}"', "export -p", "tail ~/.bash_history"]) {
    assert.ok(checkBash(c), `should ask: ${c}`);
  }
  for (const c of ["ls -la", "npm test", 'curl -H "Authorization: Bearer $API_KEY" https://x', "env NODE_ENV=test node app.js", "export PATH=$PATH:/x", "cat .env.example", "printenv HOME", "echo $HOME"]) {
    assert.equal(checkBash(c), null, `should allow: ${c}`);
  }
});

test("guard warns when tool output contains a key and blocks prompts with keys, never echoing them", async () => {
  const { decide } = await import("../src/guard.js");
  const post: any = decide({ hook_event_name: "PostToolUse", tool_name: "Bash", tool_response: { stdout: `ok\n${ANT}\n`, stderr: "" } });
  assert.ok(post.systemMessage.includes("Anthropic") && post.hookSpecificOutput.additionalContext.includes("rotate"));
  assert.equal(decide({ hook_event_name: "PostToolUse", tool_name: "Bash", tool_response: { stdout: "all good" } }), null);
  const prompt: any = decide({ hook_event_name: "UserPromptSubmit", prompt: `use this key ${OPENAI} and ${AWS}` });
  assert.equal(prompt.decision, "block");
  assert.ok(prompt.reason.includes("2 keys"));
  assert.equal(decide({ hook_event_name: "UserPromptSubmit", prompt: "set OPENAI_API_KEY in .env please" }), null);
  const all = JSON.stringify([post, prompt]);
  for (const secret of [ANT, OPENAI, AWS, body]) assert.ok(!all.includes(secret), "leaked a secret");
});

test("guard CLI reads one event from stdin and fails open on bad input", async () => {
  const { spawnSync } = await import("node:child_process");
  const cli = join(import.meta.dirname, "../src/cli.js");
  const run = (input: string) => spawnSync(process.execPath, [cli, "guard"], { input, encoding: "utf8" });
  const ok = run(JSON.stringify({ hook_event_name: "PreToolUse", tool_name: "Read", tool_input: { file_path: "/x/.env" } }));
  assert.equal(ok.status, 0);
  assert.equal(JSON.parse(ok.stdout).hookSpecificOutput.permissionDecision, "ask");
  const bad = run("not json");
  assert.equal(bad.status, 0);
  assert.equal(bad.stdout, "");
  assert.equal(run(JSON.stringify({ hook_event_name: "Stop" })).stdout, "");
});
