import { test } from "node:test";
import assert from "node:assert/strict";
import { lint } from "../src/linter.ts";

const hasRule = (r: ReturnType<typeof lint>, rule: string) => r.findings.some((f) => f.rule === rule);

test("detects duplicate keys", () => {
  const result = lint({ env: "A=1\nA=2" });
  assert.ok(hasRule(result, "duplicate-key"));
  assert.equal(result.errorCount, 1);
});

test("detects missing and extra keys against the example", () => {
  const result = lint({ env: "A=1\nC=3", example: "A=\nB=" });
  assert.ok(result.findings.find((f) => f.rule === "missing-key" && f.key === "B"));
  assert.ok(result.findings.find((f) => f.rule === "extra-key" && f.key === "C"));
});

test("empty values warn by default and error in strict mode", () => {
  assert.equal(lint({ env: "A=" }).warningCount, 1);
  assert.equal(lint({ env: "A=", strict: true }).errorCount, 1);
});

test("a clean env produces no findings", () => {
  const result = lint({ env: "A=1\nB=2", example: "A=\nB=", gitignore: ".env" });
  assert.equal(result.findings.length, 0);
  assert.equal(result.errorCount, 0);
});

test("gitignore matcher recognises common patterns and negation", () => {
  for (const gi of [".env", "/.env", ".env*", "*.env", "**/.env", "config\n.env"]) {
    assert.equal(hasRule(lint({ env: "A=1", gitignore: gi }), "gitignore-unsafe"), false, gi);
  }
  for (const gi of ["node_modules", ".env\n!.env"]) {
    assert.equal(hasRule(lint({ env: "A=1", gitignore: gi }), "gitignore-unsafe"), true, gi);
  }
});

test("requiredKeys are enforced without an example", () => {
  const result = lint({ env: "A=1", requiredKeys: ["A", "TOKEN"] });
  assert.ok(result.findings.find((f) => f.rule === "missing-key" && f.key === "TOKEN"));
  assert.ok(!result.findings.find((f) => f.key === "A"));
});

test("requiredKeys do not count as extra keys", () => {
  const result = lint({ env: "A=1\nTOKEN=x", example: "A=", requiredKeys: ["TOKEN"] });
  assert.ok(!hasRule(result, "extra-key"));
});

test("ignoreKeys silence every key-specific rule", () => {
  const result = lint({ env: "DEBUG=\nA=1", example: "A=", ignoreKeys: ["DEBUG"] });
  assert.equal(result.findings.length, 0);
});

test("rule overrides can promote, demote, or disable a rule", () => {
  assert.equal(lint({ env: "A=1", example: "A=\nB=", rules: { "missing-key": "off" } }).findings.length, 0);
  const promoted = lint({ env: "A=1\nC=2", example: "A=", rules: { "extra-key": "error" } });
  assert.equal(promoted.errorCount, 1);
  assert.ok(promoted.findings.every((f) => f.severity === "error"));
});

test("validates .env values against example schema annotations", () => {
  const example = "# @type port\nPORT=\n# @enum dev,prod\nNODE_ENV=";
  const bad = lint({ env: "PORT=99999\nNODE_ENV=staging", example });
  assert.equal(bad.findings.filter((f) => f.rule === "invalid-value").length, 2);
  const good = lint({ env: "PORT=8080\nNODE_ENV=prod", example });
  assert.ok(!hasRule(good, "invalid-value"));
});

test("flags secrets accidentally committed to the example", () => {
  const result = lint({ env: "A=1", example: "API_KEY=Zx9Qf2Lm8Tv3Rj7Wb1Nc6Yd4Hk0Ps5" });
  assert.ok(result.findings.find((f) => f.rule === "exposed-secret" && f.key === "API_KEY"));
  assert.ok(!hasRule(lint({ env: "A=1", example: "API_KEY=your-key-here" }), "exposed-secret"));
});
