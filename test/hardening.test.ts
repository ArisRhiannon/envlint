import { test } from "node:test";
import assert from "node:assert/strict";
import { parseEnv } from "../src/parser.ts";
import { parseAnnotations, validateValue } from "../src/annotations.ts";
import { looksLikeSecret } from "../src/secrets.ts";
import { lint } from "../src/linter.ts";

// --- ReDoS guard -----------------------------------------------------------
test("rejects catastrophic-backtracking @pattern without hanging", () => {
  for (const pattern of ["(a+)+$", "(a*)*$", "(.*a){10,}", "(a+)*"]) {
    const start = Date.now();
    const msg = validateValue("a".repeat(60) + "!", { pattern });
    assert.match(msg ?? "", /unsafe @pattern/, pattern);
    assert.ok(Date.now() - start < 500, `${pattern} should fail fast`);
  }
});

test("safe @patterns still validate normally", () => {
  assert.equal(validateValue("abcabc", { pattern: "^(abc)+$" }), null);
  assert.equal(validateValue("hello", { pattern: "^[a-z]+$" }), null);
  assert.match(validateValue("HELLO", { pattern: "^[a-z]+$" })!, /must match/);
});

test("reports an invalid regex instead of throwing", () => {
  assert.match(validateValue("x", { pattern: "(" })!, /invalid @pattern/);
});

// --- Unknown directives fail loud -----------------------------------------
test("parseAnnotations records unrecognised directives", () => {
  assert.deepEqual(parseAnnotations("# @typ url\nK=").get("K"), { unknown: ["typ"] });
});

test("lint warns on an unknown annotation directive (does not silently ignore)", () => {
  const r = lint({ env: "K=x", example: "# @typ url\nK=" });
  assert.ok(r.findings.find((f) => f.rule === "invalid-annotation" && f.key === "K"));
  assert.ok(!r.findings.find((f) => f.rule === "invalid-value")); // typo'd directive does not validate
});

test("invalid-annotation severity is overridable", () => {
  const r = lint({ env: "K=x", example: "# @typ url\nK=", rules: { "invalid-annotation": "off" } });
  assert.equal(r.findings.length, 0);
});

// --- @type url strictness --------------------------------------------------
test("@type url requires http/https and a host", () => {
  assert.match(validateValue("javascript:alert(1)", { type: "url" })!, /valid url/);
  assert.match(validateValue("ftp://h/x", { type: "url" })!, /valid url/);
  assert.equal(validateValue("https://example.dev/x", { type: "url" }), null);
});

// --- Secret heuristic: false positives & negatives -------------------------
test("secret heuristic excludes plain URLs and connection strings", () => {
  assert.equal(looksLikeSecret("https://db.abcdefghijklmnop.amazonaws.com/prod"), false);
  assert.equal(looksLikeSecret("postgres://user:password@localhost:5432/mydb"), false);
});

test("secret heuristic still flags tokens and high-entropy values", () => {
  assert.equal(looksLikeSecret("gh" + "p_aBcDeFgHiJkLmNoPqRsTuVwXyZ0123456"), true);
  assert.equal(looksLikeSecret("Zx9Qf2Lm8Tv3Rj7Wb1Nc6Yd4Hk0Ps5"), true);
});

test("secret heuristic ignores short and placeholder values", () => {
  assert.equal(looksLikeSecret("3000"), false);
  assert.equal(looksLikeSecret("your-secret-here"), false);
});

// --- Parser robustness -----------------------------------------------------
test("parser tolerates a UTF-8 BOM on the first key", () => {
  const r = parseEnv("\uFEFFAPP=1\nB=2");
  assert.deepEqual(r.entries.map((e) => e.key), ["APP", "B"]);
});

test("parser handles CRLF line endings", () => {
  const r = parseEnv("A=1\r\nB=2\r\n");
  assert.deepEqual(r.entries.map((e) => [e.key, e.value]), [["A", "1"], ["B", "2"]]);
});

// --- Integration sanity ----------------------------------------------------
test("annotation validation still flags a bad value end to end", () => {
  const r = lint({ env: "PORT=99999", example: "# @type port\nPORT=" });
  assert.ok(r.findings.find((f) => f.rule === "invalid-value" && f.key === "PORT"));
});
