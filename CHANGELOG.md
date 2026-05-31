# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/) and this project adheres to
[Semantic Versioning](https://semver.org/).

## [1.0.0] - 2026-05-31

First stable release. Commits to a public API surface under SemVer — see the
"Stability" section of the README. Published as `@arisrhiannon/envlint`.

### Added

- `invalid-annotation` rule: unrecognized `@directives` in the example (e.g. a
  misspelled `@typ`) now produce a warning instead of being silently ignored.
- `## Limitations` and `## Stability` sections in the README.
- 13 adversarial tests (ReDoS guard, unknown directives, URL strictness, secret
  false-positive/negative corpus, BOM/CRLF parsing).

### Fixed

- **ReDoS:** a pathological `@pattern` (e.g. `(a+)+$`) could hang the process.
  Patterns with nested unbounded quantifiers are now rejected, and the tested
  value length is capped.
- **`@type url`** now requires an `http`/`https` scheme and a host, rejecting
  values like `javascript:alert(1)`.
- **`exposed-secret`** no longer false-positives on URLs / connection strings.
- `--quiet` no longer prints a summary line when there is nothing to report.

## [0.2.0] - 2026-05-31

### Changed

- **Relicensed to MIT** (was source-available AGPL + commercial). envlint is now
  fully OSI open source.
- **Runs on Node with no Bun.** The package is published as plain JavaScript and
  works via `npx envlint` / `npm i -g envlint` on Node >= 18. TypeScript source
  is compiled with `tsc`; tests run on `node:test`.
- JSON output is now an array of per-file results.

### Added

- **Schema-as-comments.** Declare `# @type`, `# @enum`, and `# @pattern` hints in
  `.env.example`; envlint validates `.env` values against them statically
  (`invalid-value`). No runtime or dependency required.
- **Leaked-secret detection.** Flags real-looking secrets accidentally committed
  to `.env.example` via token-prefix and entropy heuristics (`exposed-secret`).
- **GitHub Actions output.** `--format github` emits annotations that appear
  inline on the pull-request diff.
- Configuration file `.envlintrc.json` with `requiredKeys`, `ignoreKeys`, and
  per-rule severity overrides (`--config` to point elsewhere).
- Check multiple env files in one run: `envlint .env .env.local`.
- Programmatic API: `lint`, `parseEnv`, `loadConfig`, `parseAnnotations`,
  `validateValue`, `looksLikeSecret`, with bundled type declarations.
- More accurate `.gitignore` matching: `/.env`, `**/.env`, `*.env`, and `!.env`.

## [0.1.0]

- Initial release: missing/duplicate/extra keys, empty values, and
  `.gitignore` safety checks with a single self-contained binary.
