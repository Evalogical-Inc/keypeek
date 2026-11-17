export type Surface = "transcript" | "history" | "envfile" | "procenv";
export type Severity = "high" | "medium" | "low";

export interface Hit {
  provider: string;
  secret: string;
}

export interface Finding {
  provider: string;
  surface: Surface;
  severity: Severity;
  file: string;
  line: number;
  preview: string; // redacted, never the full secret
  fp: string; // short sha256 fingerprint
  count: number;
}

export interface ConfigCheck {
  name: string;
  status: "ok" | "warn" | "unknown";
  detail: string;
}

export interface AuditResult {
  findings: Finding[];
  checks: ConfigCheck[];
  skipped: string[];
  score: number;
  grade: string;
}
