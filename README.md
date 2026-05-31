# envlint

> Zero-dependency CLI + library that validates your `.env` against `.env.example` — catch missing keys, duplicates, empty values and an unsafe `.gitignore` **before** they break a deploy.

[![CI](https://github.com/ArisRhiannon/envlint/actions/workflows/ci.yml/badge.svg)](https://github.com/ArisRhiannon/envlint/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@arisrhiannon/envlint.svg)](https://www.npmjs.com/package/@arisrhiannon/envlint)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

Misconfigured environment variables are one of the most common causes of "works on my machine" bugs and broken production deploys. `envlint` is a tiny, fast checker that drops into local workflows and CI.

- **Runs on Node.** Pure JavaScript on install — `npx @arisrhiannon/envlint`, no Bun, Rust, or system binary required.
- **Zero runtime dependencies.** Nothing pulled into your supply chain. Fully offline — never makes a network request.
- **CI-friendly.** Clear exit codes, `--json`, and native GitHub Actions annotations.
- **Safe by default.** Warns when `.env` isn't ignored by Git.
- **Configurable.** Tune rules, required keys, and ignores via `.envlintrc.json`.
- **Usable as a library.** Import `lint()` and wire it into your own tooling.

### What makes envlint different

Three things no other `.env` checker does — all static, offline, and zero-dependency:

- 🧬 **Schema-as-comments.** Add `# @type`, `# @enum`, and `# @pattern` hints to
  `.env.example` and envlint type-checks your `.env` values **in CI** — the safety
  of `envalid`/`zod`-style validation with **no runtime and no dependency** in your app.
- 🔓 **Leaked-secret detection.** `.env.example` is committed to git. envlint flags
  real API keys and tokens accidentally pasted there (entropy + provider-prefix
  heuristics) before they reach your history.
- 🟢 **PR-native output.** `--format github` surfaces every finding as an inline
  annotation on the exact line of the pull-request diff.

## Install

```sh
# one-off, no install
npx @arisrhiannon/envlint

# or install globally
npm install -g @arisrhiannon/envlint

# or as a dev dependency / library
npm install -D @arisrhiannon/envlint
```

Requires Node.js >= 18.

## Usage

```sh
envlint                       # check ./.env against ./.env.example
envlint .env.production       # check a specific file
envlint .env .env.local       # check several files at once
envlint --example .env.sample # use a different example file
envlint --strict              # empty values become errors
envlint --json                # machine-readable output
envlint --format github       # inline annotations in GitHub Actions
envlint --quiet               # print errors only
```

### Example output

```text
$ envlint
✖ missing-key: Missing key "DATABASE_URL"
⚠ extra-key: Extra key "DEBUG" not in example (.env:7)
⚠ empty-value: Empty value for "API_URL" (.env:4)

1 error(s), 2 warning(s)
```

## Rules

| Rule | Severity | Description |
|------|----------|-------------|
| `missing-key` | error | A key in the example (or `requiredKeys`) is absent from `.env` |
| `duplicate-key` | error | The same key is defined more than once |
| `gitignore-unsafe` | error | `.env` is not ignored by `.gitignore` |
| `exposed-secret` | error | A value in the committed `.env.example` looks like a real secret |
| `invalid-value` | error | A `.env` value violates a `@type`/`@enum`/`@pattern` annotation |
| `extra-key` | warning | A key in `.env` is not present in the example file |
| `empty-value` | warning | A key has an empty value (becomes an error with `--strict`) |
| `invalid-annotation` | warning | An unrecognized `@directive` in the example (likely a typo) |

## Schema annotations

Turn `.env.example` into a typed contract using comments — validated statically,
with **zero runtime and zero dependencies** in your application:

```sh
# .env.example
# @type url
DATABASE_URL=
# @type port
PORT=
# @enum development,production,test
NODE_ENV=
# @pattern ^sk-[A-Za-z0-9]{20,}$
OPENAI_API_KEY=
```

Now `envlint` fails CI if `DATABASE_URL` isn't a URL, `PORT` isn't 1–65535,
`NODE_ENV` is outside the set, or `OPENAI_API_KEY` doesn't match the pattern.

Supported `@type`s: `url`, `int`, `number`, `port`, `bool`, `email`. Annotations
attach to the next key; a blank line ends the block.

## Configuration

Drop a `.envlintrc.json` in your project root (or point at one with `--config`). CLI flags
take precedence over the config file.

```json
{
  "example": ".env.example",
  "strict": false,
  "requiredKeys": ["DATABASE_URL", "SECRET_KEY"],
  "ignoreKeys": ["NODE_ENV"],
  "rules": {
    "extra-key": "error",
    "empty-value": "off"
  }
}
```

- **`requiredKeys`** — keys that must be present even if you don't keep a full example file.
- **`ignoreKeys`** — keys excluded from every check (useful for local-only variables).
- **`rules`** — override any rule's severity to `"error"`, `"warning"`, or `"off"`.

## Programmatic API

```ts
import { lint } from "@arisrhiannon/envlint";
import { readFileSync } from "node:fs";

const result = lint({
  env: readFileSync(".env", "utf8"),
  example: readFileSync(".env.example", "utf8"),
  strict: true,
});

console.log(result.errorCount, result.findings);
```

`lint`, `parseEnv`, `loadConfig`, and all types are exported. The package ships type declarations.

## Use in CI

```yaml
# .github/workflows/env.yml
name: env
on: [pull_request]
jobs:
  envlint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npx --yes @arisrhiannon/envlint --strict --format github
```

## Exit codes

| Code | Meaning |
|------|---------|
| `0` | No errors |
| `1` | Errors found |
| `2` | Usage error |

## Limitations

envlint is a fast, offline, heuristic linter — not a secrets scanner or a runtime
validator. Specifically:

- **`exposed-secret` is best-effort.** It catches known token formats (AWS, GitHub,
  Slack, Stripe, Google, JWTs, PEM keys) and high-entropy strings, but it is a
  heuristic: it will miss low-entropy or unusual secrets, and **does not inspect
  URLs or connection strings** (to avoid false positives on templates like
  `postgres://user:password@localhost/db`). Use a dedicated scanner (e.g.
  `gitleaks`, `trufflehog`) for real secret-leak prevention.
- **`gitignore-unsafe` matches common patterns**, not the full gitignore grammar.
- **Schema annotations are static checks**, not a runtime validator. Use `envalid`,
  `zod`, or `env-schema` if you need typed env access inside your application.
- envlint does not load, expand (`${VAR}`), or evaluate your environment.

## Stability

`1.x` follows [SemVer](https://semver.org/). The stable public surface is:

- **CLI:** the documented flags, the `text`/`json`/`github` output formats, and the
  exit codes (`0`/`1`/`2`).
- **JSON output:** an array of `{ file, findings, errorCount, warningCount }`;
  each finding has `{ severity, rule, message, key?, line? }`.
- **Library:** the exports `lint`, `parseEnv`, `loadConfig`, `parseAnnotations`,
  `validateValue`, `looksLikeSecret`, and their types.
- **Rule names** are stable; new rules may be added in minor releases (default
  severities of existing rules will not change in a way that turns a passing run
  into a failing one within `1.x`).

Anything not listed here is internal and may change without a major bump.

## Development

envlint is written in TypeScript and runs on Node with no build step during development
(Node strips the types). Building from source produces plain JavaScript for npm.

```sh
npm install
npm test          # node --test (requires Node >= 22.18)
npm run typecheck # tsc --noEmit
npm run build     # emit dist/ (the published artifact)
```

## Contributing

Issues and pull requests are welcome — see [CONTRIBUTING.md](CONTRIBUTING.md). Please run
`npm test` and `npm run typecheck` before submitting.

## License

[MIT](LICENSE) © 2026 Aris Rhiannon
