#!/usr/bin/env bun
import { existsSync, readFileSync } from "node:fs";
import { lint } from "./linter";

const VERSION = "0.1.0";

const HELP = `envlint v${VERSION} — validate .env files against .env.example, for CI and local dev.

Usage:
  envlint [options] [env-file]

Options:
  -e, --example <file>  Example file to compare against (default: .env.example)
  -s, --strict          Treat warnings (e.g. empty values) as errors
  -j, --json            Output findings as JSON
  -q, --quiet           Print errors only
  -h, --help            Show this help
  -v, --version         Show version

Exit codes:
  0  no errors    1  errors found    2  usage error`;

function fail(message: string): never {
  console.error(`envlint: ${message}`);
  process.exit(2);
}

const args = process.argv.slice(2);
const opts = { example: ".env.example", strict: false, json: false, quiet: false };
let envPath = ".env";
let envPathSet = false;

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === "-h" || arg === "--help") { console.log(HELP); process.exit(0); }
  else if (arg === "-v" || arg === "--version") { console.log(VERSION); process.exit(0); }
  else if (arg === "-s" || arg === "--strict") opts.strict = true;
  else if (arg === "-j" || arg === "--json") opts.json = true;
  else if (arg === "-q" || arg === "--quiet") opts.quiet = true;
  else if (arg === "-e" || arg === "--example") {
    const next = args[++i];
    if (!next) fail("--example requires a file path");
    opts.example = next;
  } else if (arg.startsWith("-")) fail(`unknown option "${arg}"`);
  else if (!envPathSet) { envPath = arg; envPathSet = true; }
  else fail(`unexpected argument "${arg}"`);
}

if (!existsSync(envPath)) fail(`env file "${envPath}" not found`);

const read = (path: string) => (existsSync(path) ? readFileSync(path, "utf8") : undefined);

const result = lint({
  env: readFileSync(envPath, "utf8"),
  example: read(opts.example),
  gitignore: read(".gitignore"),
  strict: opts.strict,
});

if (opts.json) {
  console.log(JSON.stringify(result, null, 2));
} else {
  const visible = opts.quiet ? result.findings.filter((f) => f.severity === "error") : result.findings;
  for (const f of visible) {
    const tag = f.severity === "error" ? "\u2716" : "\u26a0";
    const loc = f.line ? ` (${envPath}:${f.line})` : "";
    console.log(`${tag} ${f.rule}: ${f.message}${loc}`);
  }
  if (result.findings.length === 0) console.log(`\u2714 ${envPath}: no issues found`);
  else console.log(`\n${result.errorCount} error(s), ${result.warningCount} warning(s)`);
}

process.exit(result.errorCount > 0 ? 1 : 0);
