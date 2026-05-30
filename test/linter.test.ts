import { test, expect } from "bun:test";
import { parseEnv } from "../src/parser";
import { lint } from "../src/linter";

test("parses keys, ignores comments, strips quotes and inline comments", () => {
  const result = parseEnv(`# comment\nexport A=1\nB="two"\nC='three' # note\nD=four # inline`);
  expect(Object.fromEntries(result.entries.map((e) => [e.key, e.value]))).toEqual({
    A: "1",
    B: "two",
    C: "three",
    D: "four",
  });
});

test("detects duplicate keys", () => {
  const result = lint({ env: "A=1\nA=2" });
  expect(result.findings.some((f) => f.rule === "duplicate-key")).toBe(true);
  expect(result.errorCount).toBe(1);
});

test("detects missing and extra keys against the example", () => {
  const result = lint({ env: "A=1\nC=3", example: "A=\nB=" });
  expect(result.findings.find((f) => f.rule === "missing-key" && f.key === "B")).toBeTruthy();
  expect(result.findings.find((f) => f.rule === "extra-key" && f.key === "C")).toBeTruthy();
});

test("empty values warn by default and error in strict mode", () => {
  expect(lint({ env: "A=" }).warningCount).toBe(1);
  expect(lint({ env: "A=", strict: true }).errorCount).toBe(1);
});

test("flags .env missing from .gitignore", () => {
  expect(lint({ env: "A=1", gitignore: "node_modules" }).findings.some((f) => f.rule === "gitignore-unsafe")).toBe(true);
  expect(lint({ env: "A=1", gitignore: ".env" }).findings.some((f) => f.rule === "gitignore-unsafe")).toBe(false);
});

test("a clean env produces no findings", () => {
  const result = lint({ env: "A=1\nB=2", example: "A=\nB=", gitignore: ".env" });
  expect(result.findings.length).toBe(0);
  expect(result.errorCount).toBe(0);
});
