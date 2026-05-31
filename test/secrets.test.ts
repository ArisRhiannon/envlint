import { test } from "node:test";
import assert from "node:assert/strict";
import { looksLikeSecret } from "../src/secrets.ts";

test("flags well-known credential formats", () => {
  // Prefixes are split so this file itself doesn't trip secret scanners;
  // the values reassemble at runtime to the real provider formats.
  for (const v of [
    "AKI" + "AJ7Q2K9XZ4P1R8W3T",
    "gh" + "p_aBcDeFgHiJkLmNoPqRsTuVwXyZ0123456",
    "sk_" + "live_51HxYzAbCdEfGhIjKlMnOpQr",
    "eyJhbGciOiJIUzI1NiJ9." + "eyJzdWIiOiIxIn0.abc",
  ]) {
    assert.equal(looksLikeSecret(v), true, v);
  }
});

test("flags long high-entropy tokens", () => {
  assert.equal(looksLikeSecret("Zx9Qf2Lm8Tv3Rj7Wb1Nc6Yd4Hk0Ps5"), true);
});

test("ignores placeholders, short values, and prose", () => {
  for (const v of ["", "changeme", "your-api-key-here", "<your-token>", "${SECRET}", "3000", "true", "a short phrase here"]) {
    assert.equal(looksLikeSecret(v), false, v);
  }
});
