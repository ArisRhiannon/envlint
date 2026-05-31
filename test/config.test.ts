import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadConfig } from "../src/config.ts";

function withTemp(fn: (dir: string) => void) {
  const dir = mkdtempSync(join(tmpdir(), "envlint-cfg-"));
  try { fn(dir); } finally { rmSync(dir, { recursive: true, force: true }); }
}

test("returns {} when the default config is absent", () => {
  withTemp((dir) => {
    const cwd = process.cwd();
    process.chdir(dir);
    try { assert.deepEqual(loadConfig(), {}); } finally { process.chdir(cwd); }
  });
});

test("throws when an explicitly requested config is missing", () => {
  withTemp((dir) => assert.throws(() => loadConfig(join(dir, "nope.json")), /not found/));
});

test("parses a valid config", () => {
  withTemp((dir) => {
    const file = join(dir, "c.json");
    writeFileSync(file, JSON.stringify({ strict: true, requiredKeys: ["A"], rules: { "extra-key": "off" } }));
    assert.deepEqual(loadConfig(file), { strict: true, requiredKeys: ["A"], rules: { "extra-key": "off" } });
  });
});

test("throws on invalid JSON", () => {
  withTemp((dir) => {
    const file = join(dir, "bad.json");
    writeFileSync(file, "{ not json ");
    assert.throws(() => loadConfig(file), /invalid config/);
  });
});
