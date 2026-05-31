import { test } from "node:test";
import assert from "node:assert/strict";
import { parseAnnotations, validateValue } from "../src/annotations.ts";

test("parses directives that precede a key, across descriptive comments", () => {
  const ann = parseAnnotations("# @type url\n# the database\nDATABASE_URL=\n# @enum a,b\nMODE=");
  assert.deepEqual(ann.get("DATABASE_URL"), { type: "url" });
  assert.deepEqual(ann.get("MODE"), { enum: ["a", "b"] });
});

test("a blank line ends an annotation block", () => {
  const ann = parseAnnotations("# @type int\n\nPORT=");
  assert.equal(ann.has("PORT"), false);
});

test("validates built-in types", () => {
  assert.equal(validateValue("https://x.dev", { type: "url" }), null);
  assert.match(validateValue("nope", { type: "url" })!, /valid url/);
  assert.equal(validateValue("8080", { type: "port" }), null);
  assert.match(validateValue("99999", { type: "port" })!, /valid port/);
  assert.equal(validateValue("3.14", { type: "number" }), null);
  assert.equal(validateValue("yes", { type: "bool" }), null);
  assert.equal(validateValue("a@b.co", { type: "email" }), null);
});

test("validates enum and pattern, and reports authoring errors", () => {
  assert.match(validateValue("x", { enum: ["a", "b"] })!, /one of: a, b/);
  assert.equal(validateValue("AB12", { pattern: "^[A-Z0-9]{4}$" }), null);
  assert.match(validateValue("v", { type: "wat" })!, /unknown @type/);
  assert.match(validateValue("v", { pattern: "(" })!, /invalid @pattern/);
});
