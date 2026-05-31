# Contributing to envlint

Thanks for taking the time to contribute!

## Development setup

envlint is TypeScript that runs directly on modern Node (types are stripped at
runtime), so there's no build step while developing.

```sh
npm install
npm test          # node --test — requires Node >= 22.18 (native TS test running)
npm run typecheck # tsc --noEmit
npm run build     # emit dist/ — the JavaScript published to npm (runs on Node >= 18)
npm start -- --help
```

Runtime code must stay **zero-dependency** — only Node built-ins (`node:*`).

## Conventions

- **Commits:** [Conventional Commits](https://www.conventionalcommits.org/)
  (`feat:`, `fix:`, `docs:`, `chore:`, `test:`, `refactor:`, `ci:`).
- **Branches:** work on `feat/*` or `fix/*` and open a PR into `main`.
- **Versioning:** [SemVer](https://semver.org/); record changes in
  [CHANGELOG.md](CHANGELOG.md).
- Every change ships with tests and must pass `npm test` and `npm run typecheck`.

## Releasing (maintainers)

Publishing is automated by `.github/workflows/release.yml` on a version tag:

1. Bump `version` in `package.json` and the `VERSION` constant in `src/cli.ts`,
   update `CHANGELOG.md`, and commit.
2. Tag and push: `git tag v0.2.0 && git push origin v0.2.0`.
3. CI builds, tests, and runs `npm publish --provenance`.

Authentication uses an npm **Automation** token stored as the `NPM_TOKEN`
repository secret and exposed to the publish step as the `NODE_AUTH_TOKEN`
environment variable — no token is ever committed. Alternatively, configure
npm [trusted publishing](https://docs.npmjs.com/trusted-publishers) (OIDC) for
the workflow and drop the token entirely.
