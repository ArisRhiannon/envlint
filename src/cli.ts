#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { lint, type LintResult } from "./linter.ts";
import { loadConfig } from "./config.ts";

const VERSION = "1.0.0";

const HELP = `envlint v${VERSION} — validate .env files against .env.example, for CI and local dev.

Usage:
  envlint [options] [env-file...]

Options:
  -e, --example <file>  Example file to compare against (default: .env.example)
  -c, --config <file>   Config file (default: .envlintrc.json if present)
  -s, --strict          Treat warnings (e.g. empty values) as errors
  -f, --format <fmt>    Output format: text (default), json, or github
  -j, --json            Shorthand for --format json
  -q, --quiet           Print errors only
  -h, --help            Show this help
  -v, --version         Show version

Examples:
  envlint                      check ./.env against ./.env.example
  envlint .env.production      check a specific file
  envlint .env .env.local      check several files at once
  envlint --strict --json      machine-readable output for CI

Schema (optional, declared in the example file):
  # @type url|int|number|port|bool|email
  # @enum a,b,c
  # @pattern <regex>

Exit codes:
  0  no errors    1  errors found    2  usage error`;

function fail(message: string): never {
  console.error(`envlint: ${message}`);
  process.exit(2);
}

const args = process.argv.slice(2);
const cli: { example?: string; config?: string; strict?: boolean; format?: "text" | "json" | "github"; quiet?: boolean } = {};
const files: string[] = [];

for (let i = 0; i < args.length; i++) {
  const arg = args[i]!;
  if (arg === "-h" || arg === "--help") { console.log(HELP); process.exit(0); }
  else if (arg === "-v" || arg === "--version") { console.log(VERSION); process.exit(0); }
  else if (arg === "-s" || arg === "--strict") cli.strict = true;
  else if (arg === "-j" || arg === "--json") cli.format = "json";
  else if (arg === "-q" || arg === "--quiet") cli.quiet = true;
  else if (arg === "-f" || arg === "--format") {
    const next = args[++i];
    if (!next) fail("--format requires a value");
    if (next !== "text" && next !== "json" && next !== "github") fail(`unknown format "${next}"`);
    cli.format = next;
  }
  else if (arg === "-e" || arg === "--example") { const next = args[++i]; if (!next) fail("--example requires a file path"); cli.example = next; }
  else if (arg === "-c" || arg === "--config") { const next = args[++i]; if (!next) fail("--config requires a file path"); cli.config = next; }
  else if (arg.startsWith("-")) fail(`unknown option "${arg}"`);
  else files.push(arg);
}

let config;
try { config = loadConfig(cli.config); } catch (e) { fail((e as Error).message); }

const example = cli.example ?? config.example ?? ".env.example";
const strict = cli.strict ?? config.strict ?? false;
const targets = files.length ? files : [".env"];

const read = (path: string) => (existsSync(path) ? readFileSync(path, "utf8") : undefined);
const gitignore = read(".gitignore");

const results: { file: string; result: LintResult }[] = [];
let totalErrors = 0;

targets.forEach((file, i) => {
  if (!existsSync(file)) fail(`env file "${file}" not found`);
  const result = lint({
    env: readFileSync(file, "utf8"),
    example: read(example),
    gitignore: i === 0 ? gitignore : undefined, // repo-level check runs once
    strict,
    requiredKeys: config.requiredKeys,
    ignoreKeys: config.ignoreKeys,
    rules: config.rules,
  });
  results.push({ file, result });
  totalErrors += result.errorCount;
});

const format = cli.format ?? "text";

if (format === "json") {
  console.log(JSON.stringify(results.map((r) => ({ file: r.file, ...r.result })), null, 2));
} else if (format === "github") {
  // GitHub Actions workflow commands — findings appear inline on the PR diff.
  for (const { file, result } of results) {
    for (const f of result.findings) {
      const level = f.severity === "error" ? "error" : "warning";
      const loc = f.line ? `file=${file},line=${f.line}` : `file=${file}`;
      console.log(`::${level} ${loc},title=${f.rule}::${f.message}`);
    }
  }
} else {
  const multi = results.length > 1;
  for (const { file, result } of results) {
    if (multi) console.log(`\n${file}`);
    const visible = cli.quiet ? result.findings.filter((f) => f.severity === "error") : result.findings;
    for (const f of visible) {
      const tag = f.severity === "error" ? "\u2716" : "\u26a0";
      const loc = f.line ? ` (${file}:${f.line})` : "";
      console.log(`${tag} ${f.rule}: ${f.message}${loc}`);
    }
    if (result.findings.length === 0) console.log(`\u2714 ${file}: no issues found`);
    else if (!cli.quiet || result.errorCount > 0) console.log(`${result.errorCount} error(s), ${result.warningCount} warning(s)`);
  }
}

process.exit(totalErrors > 0 ? 1 : 0);
