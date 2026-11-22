import type { Hit } from "./types.js";

const PROVIDERS: [string, RegExp][] = [
  ["Anthropic", /sk-ant-[A-Za-z0-9_-]{20,}/g],
  ["OpenAI", /\bsk-(?!ant-)(?:proj-)?[A-Za-z0-9_-]{32,}/g],
  ["GitHub", /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{36,}\b/g],
  ["GitHub", /\bgithub_pat_[A-Za-z0-9_]{50,}/g],
  ["AWS", /\bAKIA[0-9A-Z]{16}\b/g],
  ["Stripe", /\b[sr]k_live_[A-Za-z0-9]{20,}/g],
  ["Google", /\bAIza[0-9A-Za-z_-]{35}\b/g],
  ["Slack", /\bxox[abprs]-[A-Za-z0-9-]{10,}/g],
  ["HuggingFace", /\bhf_[A-Za-z0-9]{34,}\b/g],
  ["JWT", /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g],
  ["PrivateKey", /-----BEGIN (?:[A-Z]+ )?PRIVATE KEY-----/g],
];

// A variable or setting name that suggests it holds a secret. Same words as the GENERIC rule.
export const SECRET_NAME = /^[A-Z0-9_]*(?:KEY|TOKEN|SECRET|PASSWORD|PASSWD)[A-Z0-9_]*$/i;

const GENERIC = /\b([A-Z0-9_]*(?:KEY|TOKEN|SECRET|PASSWORD|PASSWD)[A-Z0-9_]*)\s*[=:]\s*["']?([^\s"']{16,})/gi;
const PLACEHOLDER = /your|example|changeme|placeholder|xxxx|\*\*\*|^[$<{]/i;

export function entropy(s: string): number {
  const f = new Map<string, number>();
  for (const c of s) f.set(c, (f.get(c) ?? 0) + 1);
  let h = 0;
  for (const n of f.values()) h -= (n / s.length) * Math.log2(n / s.length);
  return h;
}

// generic=true also flags NAME=value pairs; only use it where the line is config, not prose or code.
export function scanLine(line: string, generic: boolean): Hit[] {
  if (line.length < 16) return [];
  const hits: Hit[] = [];
  for (const [provider, re] of PROVIDERS) {
    for (const m of line.matchAll(re)) {
      if (!/EXAMPLE|PLACEHOLDER|XXXX/i.test(m[0])) hits.push({ provider, secret: m[0] });
    }
  }
  if (generic) {
    for (const m of line.matchAll(GENERIC)) {
      const v = m[2];
      // real secrets start alphanumeric and contain a digit; this drops code fragments like `=\`Name` or `deleteKey,`
      if (PLACEHOLDER.test(v) || entropy(v) < 3.5 || !/^[A-Za-z0-9]/.test(v) || !/\d/.test(v)) continue;
      if (hits.some((h) => v.includes(h.secret) || h.secret.includes(v))) continue;
      hits.push({ provider: `generic:${m[1].toUpperCase()}`, secret: v });
    }
  }
  return hits;
}
