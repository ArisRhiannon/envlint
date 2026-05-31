# Verified Findings

## Critical (P0)

### [SEC1] ReDoS via user-supplied `@pattern` regex

- **Severity:** Critical
- **Dimension:** Security
- **Confidence:** 100
- **Location:** `src/annotations.ts:56`
- **CWE:** CWE-1333 (Inefficient Regular Expression Complexity)
- **Reachability:** confirmed — `cli.ts` → `lint()` → `validateValue()` → `new RegExp(ann.pattern)` → `.test(value)`
- **Evidence:**
  ```sh
  $ printf '# @pattern (a+)+$\nVAL=\n' > .env.example
  $ printf 'VAL=aaaaaaaaaaaaaaaaaaaaaaaaa!\n' > .env
  $ timeout 5 node dist/cli.js
  # Process killed after 5s — exit 124
  ```
- **Why this is a problem:** Any contributor can add a `@pattern` to `.env.example` that hangs CI indefinitely. The regex is compiled and executed with no timeout or safety check.
- **Recommendation:** Reject unsafe patterns at parse time (use a safe-regex check) or execute with a timeout via worker_threads.

---

## High (P1)

### [REL1] Misspelled directives silently ignored — schema validation disabled without warning

- **Severity:** High
- **Dimension:** Reliability
- **Confidence:** 100
- **Location:** `src/annotations.ts:24` — `DIRECTIVE` regex only matches `type|enum|pattern`
- **Evidence:**
  ```sh
  $ printf '# @typ url\nDATABASE_URL=\n' > .env.example
  $ printf 'DATABASE_URL=not-a-url\n' > .env
  $ node dist/cli.js --json
  [{"file":".env","findings":[],"errorCount":0,"warningCount":0}]
  ```
- **Why this is a problem:** The tool's primary differentiator (schema-as-comments) fails silently on typos. Users believe they have validation when they don't.
- **Recommendation:** Warn on any `# @<word>` where word is not recognized.

### [SEC2] Secret detection false-positives on URLs, paths, base64 config

- **Severity:** High
- **Dimension:** Security
- **Confidence:** 100
- **Location:** `src/secrets.ts:35-38` — entropy heuristic
- **Evidence:**
  ```js
  looksLikeSecret('https://my-app.us-east-1.amazonaws.com/api/v2/resources/items?page=1&limit=50')
  // => true (FALSE POSITIVE)
  looksLikeSecret('/usr/local/share/applications/my-very-long-application-name/config/settings.json')
  // => true (FALSE POSITIVE)
  ```
- **Why this is a problem:** Common `.env.example` values like `DATABASE_URL=postgres://...` will be flagged as secrets, causing users to disable the rule.
- **Recommendation:** Exclude values containing `://` or starting with `/` from entropy heuristic.

### [ARCH1] No documented API stability contract for 1.0.0

- **Severity:** High
- **Dimension:** Architecture
- **Confidence:** 90
- **Location:** `src/index.ts` (8 exports), README
- **Why this is a problem:** 1.0.0 commits to SemVer. Without documenting what's stable, every exported function becomes a frozen contract.
- **Recommendation:** Reduce public API surface or document stability guarantees explicitly.

---

## Medium (P2)

### [ARCH2] `@type url` accepts dangerous/useless URIs via `new URL()`

- **Severity:** Medium
- **Dimension:** Architecture
- **Confidence:** 95
- **Location:** `src/annotations.ts:42-43`
- **Evidence:**
  ```js
  validateValue('javascript:alert(1)', { type: 'url' }) // => null (PASS)
  validateValue('http:foo', { type: 'url' })            // => null (PASS)
  ```
- **Recommendation:** Document the limitation or add `@type http-url`.

### [TEST1] Test suite is exclusively happy-path — zero adversarial tests

- **Severity:** Medium
- **Dimension:** Testing
- **Confidence:** 95
- **Location:** `test/` directory — 32 tests, all pass trivially
- **Evidence:** No tests for: BOM, CRLF, ReDoS, misspelled directives, secret FP/FN, large files, gitignore edge cases, conflicting CLI flags.
- **Recommendation:** Add adversarial test cases for every blocker and major finding above.
