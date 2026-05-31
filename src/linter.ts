import { parseEnv } from "./parser.ts";
import { looksLikeSecret } from "./secrets.ts";
import { parseAnnotations, validateValue } from "./annotations.ts";

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
  /** Keys that must be present even if no example is given. */
  requiredKeys?: string[];
  /** Keys excluded from every key-specific rule (missing/extra/empty/duplicate). */
  ignoreKeys?: string[];
  /** Override the severity of a rule, or turn it "off". */
  rules?: Record<string, Severity | "off">;
}

export interface LintResult {
  findings: Finding[];
  errorCount: number;
  warningCount: number;
}

// Common .gitignore patterns that cause a top-level `.env` to be ignored.
const IGNORE_PATTERNS = new Set([".env", "/.env", ".env*", "*.env", "**/.env"]);

function gitignoresEnv(gitignore: string): boolean {
  const lines = gitignore
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.includes("!.env")) return false; // explicitly un-ignored
  return lines.some((line) => IGNORE_PATTERNS.has(line));
}

/** Run all checks and return findings plus error/warning counts. */
export function lint(input: LintInput): LintResult {
  const findings: Finding[] = [];
  const env = parseEnv(input.env);
  const envKeys = new Set(env.entries.map((e) => e.key));
  const required = input.requiredKeys ?? [];

  for (const dup of env.duplicates) {
    findings.push({ severity: "error", rule: "duplicate-key", message: `Duplicate key "${dup.key}"`, key: dup.key, line: dup.line });
  }

  const example = input.example !== undefined ? parseEnv(input.example) : undefined;
  const exampleKeys = example ? new Set(example.entries.map((e) => e.key)) : undefined;

  // Every example key + every configured required key must be present.
  const expected = new Set<string>(required);
  if (exampleKeys) for (const key of exampleKeys) expected.add(key);
  for (const key of expected) {
    if (!envKeys.has(key)) {
      findings.push({ severity: "error", rule: "missing-key", message: `Missing key "${key}"`, key });
    }
  }

  // Extra keys are only meaningful when an example defines the full surface.
  if (exampleKeys) {
    const known = new Set([...exampleKeys, ...required]);
    for (const entry of env.entries) {
      if (!known.has(entry.key)) {
        findings.push({ severity: "warning", rule: "extra-key", message: `Extra key "${entry.key}" not in example`, key: entry.key, line: entry.line });
      }
    }
  }

  if (example) {
    // The example file is committed — flag any value that looks like a real secret.
    for (const entry of example.entries) {
      if (entry.value !== "" && looksLikeSecret(entry.value)) {
        findings.push({ severity: "error", rule: "exposed-secret", message: `Possible real secret committed in example for "${entry.key}" — use a placeholder`, key: entry.key });
      }
    }
    // Validate .env values against schema annotations declared in the example.
    const annotations = parseAnnotations(input.example!);
    if (annotations.size) {
      for (const entry of env.entries) {
        const ann = annotations.get(entry.key);
        if (ann && entry.value !== "") {
          const problem = validateValue(entry.value, ann);
          if (problem) findings.push({ severity: "error", rule: "invalid-value", message: `"${entry.key}" ${problem}`, key: entry.key, line: entry.line });
        }
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

  return finalize(findings, input.ignoreKeys, input.rules);
}

function finalize(raw: Finding[], ignoreKeys: string[] | undefined, rules: Record<string, Severity | "off"> | undefined): LintResult {
  const ignored = new Set(ignoreKeys ?? []);
  const findings: Finding[] = [];
  for (const f of raw) {
    if (f.key !== undefined && ignored.has(f.key)) continue;
    const override = rules?.[f.rule];
    if (override === "off") continue;
    findings.push(override ? { ...f, severity: override } : f);
  }
  const errorCount = findings.filter((f) => f.severity === "error").length;
  return { findings, errorCount, warningCount: findings.length - errorCount };
}
