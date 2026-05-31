# Security Policy

## Reporting a vulnerability

Please report security issues privately rather than opening a public issue.

- Use GitHub's **"Report a vulnerability"** button under the repository's
  **Security** tab to open a private advisory, or
- open a minimal issue asking for a private contact channel (no details).

You can expect an initial response within a few days. Once a fix is available,
we will publish a release and credit the reporter unless anonymity is requested.

## Scope

envlint is an offline, zero-dependency static analyzer. It reads local files and
never makes network requests. The most security-relevant behaviour is the
`exposed-secret` and `gitignore-unsafe` rules, which exist to **prevent** secret
leakage — reports of missed detections or false negatives there are especially
welcome.

## Supported versions

The latest published `0.x` release receives security fixes.
