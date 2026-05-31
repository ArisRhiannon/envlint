import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const CLI = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "cli.ts");

function run(cwd: string, args: string[]) {
  const r = spawnSync(process.execPath, [CLI, ...args], { cwd, encoding: "utf8" });
  return { status: r.status, stdout: r.stdout, stderr: r.stderr };
}

function withProject(files: Record<string, string>, fn: (dir: string) => void) {
  const dir = mkdtempSync(join(tmpdir(), "envlint-cli-"));
  try {
    for (const [name, content] of Object.entries(files)) writeFileSync(join(dir, name), content);
    fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test("--version prints the version and exits 0", () => {
  withProject({}, (dir) => {
    const r = run(dir, ["--version"]);
    assert.equal(r.status, 0);
    assert.match(r.stdout.trim(), /^\d+\.\d+\.\d+$/);
  });
});

test("exits 1 on a missing key and 0 on a clean file", () => {
  withProject({ ".env": "A=1", ".env.example": "A=\nB=", ".gitignore": ".env" }, (dir) => {
    assert.equal(run(dir, []).status, 1);
  });
  withProject({ ".env": "A=1\nB=2", ".env.example": "A=\nB=", ".gitignore": ".env" }, (dir) => {
    const r = run(dir, []);
    assert.equal(r.status, 0);
    assert.match(r.stdout, /no issues found/);
  });
});

test("exits 2 on usage errors", () => {
  withProject({ ".env": "A=1" }, (dir) => {
    assert.equal(run(dir, ["--bogus"]).status, 2);
    assert.equal(run(dir, ["missing.env"]).status, 2);
  });
});

test("checks multiple files and emits a JSON array", () => {
  withProject({ ".env": "A=1", ".env.local": "A=1", ".env.example": "A=", ".gitignore": ".env" }, (dir) => {
    const r = run(dir, ["--json", ".env", ".env.local"]);
    assert.equal(r.status, 0);
    const parsed = JSON.parse(r.stdout);
    assert.equal(parsed.length, 2);
    assert.deepEqual(parsed.map((x: { file: string }) => x.file), [".env", ".env.local"]);
  });
});

test("reads .envlintrc.json from the working directory", () => {
  const files = {
    ".env": "A=1\nLOCAL_ONLY=x",
    ".env.example": "A=",
    ".gitignore": ".env",
    ".envlintrc.json": JSON.stringify({ rules: { "extra-key": "error" } }),
  };
  withProject(files, (dir) => assert.equal(run(dir, []).status, 1));
  withProject({ ...files, ".envlintrc.json": JSON.stringify({ ignoreKeys: ["LOCAL_ONLY"] }) }, (dir) =>
    assert.equal(run(dir, []).status, 0),
  );
});

test("emits GitHub Actions annotations with --format github", () => {
  withProject({ ".env": "A=1", ".env.example": "A=\nB=", ".gitignore": ".env" }, (dir) => {
    const r = run(dir, ["--format", "github"]);
    assert.equal(r.status, 1);
    assert.match(r.stdout, /^::error file=\.env,title=missing-key::/m);
  });
});
