# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/) and this project adheres to
[Semantic Versioning](https://semver.org/).

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
