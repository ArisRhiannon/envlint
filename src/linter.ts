import { parseEnv } from "./parser";

export type Severity = "error" | "warning";

export interface Finding {
  severity: Severity;
  rule: string;
  message: string;
  key?: string;
  line?: number;
}

export interface LintInput {
  env: string;
  example?: string;
  gitignore?: string;
  strict?: boolean;
}

export interface LintResult {
  findings: Finding[];
  errorCount: number;
  warningCount: number;
}

function gitignoresEnv(gitignore: string): boolean {
  return gitignore
    .split(/\r?\n/)
    .map((line) => line.trim())
    .some((line) => line === ".env" || line === ".env*" || line === "*.env");
}

/** Run all checks and return findings plus error/warning counts. */
export function lint(input: LintInput): LintResult {
  const findings: Finding[] = [];
  const env = parseEnv(input.env);
  const envKeys = new Set(env.entries.map((e) => e.key));

  for (const dup of env.duplicates) {
    findings.push({ severity: "error", rule: "duplicate-key", message: `Duplicate key "${dup.key}"`, key: dup.key, line: dup.line });
  }

  if (input.example !== undefined) {
    const exampleKeys = new Set(parseEnv(input.example).entries.map((e) => e.key));
    for (const key of exampleKeys) {
      if (!envKeys.has(key)) {
        findings.push({ severity: "error", rule: "missing-key", message: `Missing key "${key}" defined in example`, key });
      }
    }
    for (const entry of env.entries) {
      if (!exampleKeys.has(entry.key)) {
        findings.push({ severity: "warning", rule: "extra-key", message: `Extra key "${entry.key}" not in example`, key: entry.key, line: entry.line });
      }
    }
  }

  for (const entry of env.entries) {
    if (entry.value === "") {
      findings.push({ severity: input.strict ? "error" : "warning", rule: "empty-value", message: `Empty value for "${entry.key}"`, key: entry.key, line: entry.line });
    }
  }

  if (input.gitignore !== undefined && !gitignoresEnv(input.gitignore)) {
    findings.push({ severity: "error", rule: "gitignore-unsafe", message: ".env is not ignored by .gitignore — secrets may be committed" });
  }

  const errorCount = findings.filter((f) => f.severity === "error").length;
  return { findings, errorCount, warningCount: findings.length - errorCount };
}
