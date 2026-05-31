import { test } from "node:test";
import assert from "node:assert/strict";
import { parseEnv } from "../src/parser.ts";

test("parses keys, ignores comments, strips quotes and inline comments", () => {
  const result = parseEnv(`# comment\nexport A=1\nB="two"\nC='three' # note\nD=four # inline`);
  assert.deepEqual(Object.fromEntries(result.entries.map((e) => [e.key, e.value])), {
    A: "1",
    B: "two",
    C: "three",
    D: "four",
  });
});

test("records line numbers and skips blank lines", () => {
  const result = parseEnv(`\nA=1\n\nB=2`);
  assert.deepEqual(result.entries.map((e) => [e.key, e.line]), [["A", 2], ["B", 4]]);
});

test("collects duplicate occurrences with their lines", () => {
  const result = parseEnv("A=1\nA=2");
  assert.deepEqual(result.duplicates, [{ key: "A", line: 2 }]);
});

test("ignores lines that are not valid assignments", () => {
  const result = parseEnv("not a key\n123=bad\nGOOD=ok");
  assert.deepEqual(result.entries.map((e) => e.key), ["GOOD"]);
});
