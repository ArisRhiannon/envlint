# envlint

> Zero-dependency CLI that validates your `.env` against `.env.example` — catch missing keys, duplicates, empty values and an unsafe `.gitignore` **before** they break a deploy.

[![CI](https://github.com/ArisRhiannon/envlint/actions/workflows/ci.yml/badge.svg)](https://github.com/ArisRhiannon/envlint/actions/workflows/ci.yml)
[![License: AGPL-3.0 + Commercial](https://img.shields.io/badge/license-AGPL--3.0%20%2B%20Commercial-blue.svg)](LICENSE)

Misconfigured environment variables are one of the most common causes of "works on my machine" bugs and broken production deploys. `envlint` is a tiny, fast checker that drops into local workflows and CI.

- **No dependencies.** A single self-contained binary, or run directly with [Bun](https://bun.sh).
- **CI-friendly.** Clear exit codes and `--json` output.
- **Safe by default.** Warns when `.env` isn't ignored by Git.

## Install

```sh
curl -fsSL https://raw.githubusercontent.com/ArisRhiannon/envlint/main/install.sh | sh
```

Or build from source:

```sh
git clone https://github.com/ArisRhiannon/envlint
cd envlint
bun run build        # produces ./envlint
```

## Usage

```sh
envlint                       # check ./.env against ./.env.example
envlint .env.production       # check a specific file
envlint --example .env.sample
envlint --strict              # empty values become errors
envlint --json                # machine-readable output
```

### Example output

```text
$ envlint
✖ missing-key: Missing key "DATABASE_URL" defined in example
⚠ extra-key: Extra key "DEBUG" not in example (.env:7)
⚠ empty-value: Empty value for "API_URL" (.env:4)

1 error(s), 2 warning(s)
```

## Rules

| Rule | Severity | Description |
|------|----------|-------------|
| `missing-key` | error | A key in the example file is absent from `.env` |
| `duplicate-key` | error | The same key is defined more than once |
| `gitignore-unsafe` | error | `.env` is not ignored by `.gitignore` |
| `extra-key` | warning | A key in `.env` is not present in the example file |
| `empty-value` | warning | A key has an empty value (becomes an error with `--strict`) |

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
      - uses: oven-sh/setup-bun@v2
      - run: curl -fsSL https://raw.githubusercontent.com/ArisRhiannon/envlint/main/install.sh | sh
      - run: ~/.local/bin/envlint --strict
```

## Exit codes

| Code | Meaning |
|------|---------|
| `0` | No errors |
| `1` | Errors found |
| `2` | Usage error |

## Development

```sh
bun test         # run the test suite
bun run build    # compile a single binary
```

## Contributing

Issues and pull requests are welcome. Please run `bun test` before submitting.

## Support

No pressure — a star or a helpful issue means a lot. If `envlint` happened to save you
some time, an optional tip is welcome at `0x4705fA2de020E2D7F7FE08f5dD4585710897f3E1`
(ETH / any EVM chain).

## License

Source-available — **not** OSI open source. Free under the GNU **AGPL-3.0** for
individuals, non-profits, and organizations below **US$1M annual revenue and 50
employees**; larger organizations require a commercial license. See [LICENSE](LICENSE).

© 2026 Aris Rhiannon
