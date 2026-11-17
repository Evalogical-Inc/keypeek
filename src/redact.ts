import { createHash } from "node:crypto";

// Only a 4-char prefix and the length ever leave this module.
export function redact(secret: string): string {
  return `${secret.slice(0, 4)}…(${secret.length})`;
}

export function fingerprint(secret: string): string {
  return createHash("sha256").update(secret).digest("hex").slice(0, 8);
}
