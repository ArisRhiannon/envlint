// Detect real secrets accidentally committed into a .env.example file.
// Pure, offline, zero-dependency heuristics — no network, no signature database.

// Well-known credential markers (provider token prefixes, key/JWT headers).
const KNOWN_SECRET_PATTERNS: RegExp[] = [
  /^(?:AKIA|ASIA)[0-9A-Z]{16}$/, // AWS access key id
  /^gh[pousr]_[A-Za-z0-9]{20,}$/, // GitHub token
  /^github_pat_[A-Za-z0-9_]{20,}$/, // GitHub fine-grained PAT
  /^xox[baprs]-[A-Za-z0-9-]{10,}$/, // Slack token
  /^sk-[A-Za-z0-9]{20,}$/, // OpenAI key
  /^(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{16,}$/, // Stripe key
  /^AIza[A-Za-z0-9_-]{30,}$/, // Google API key
  /^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\./, // JWT
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/, // PEM private key
];

// Values that are obviously placeholders should never be flagged.
const PLACEHOLDER =
  /(change[\s_-]?me|your[\s_-]|example|placeholder|dummy|secret_here|xxx+|\.{3,}|<.+>|\$\{.+\}|^(?:true|false|localhost)$)/i;

function shannonEntropy(s: string): number {
  const freq = new Map<string, number>();
  for (const c of s) freq.set(c, (freq.get(c) ?? 0) + 1);
  let bits = 0;
  for (const n of freq.values()) {
    const p = n / s.length;
    bits -= p * Math.log2(p);
  }
  return bits;
}

/** Heuristic: does this value look like a real, leaked secret (vs a placeholder)? */
export function looksLikeSecret(value: string): boolean {
  const v = value.trim();
  if (v.length < 8 || PLACEHOLDER.test(v)) return false;
  if (KNOWN_SECRET_PATTERNS.some((re) => re.test(v))) return true;
  // High-entropy, space-free token that is long enough to be a real credential.
  return !/\s/.test(v) && v.length >= 24 && shannonEntropy(v) >= 4.0;
}
