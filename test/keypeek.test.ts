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
