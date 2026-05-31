export interface ParsedEntry {
  key: string;
  value: string;
  line: number;
}

export interface ParseResult {
  entries: ParsedEntry[];
  duplicates: { key: string; line: number }[];
}

const LINE_RE = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$/;

function parseValue(raw: string): string {
  const v = raw.trim();
  const first = v[0];
  if (first === '"' || first === "'") {
    const end = v.indexOf(first, 1);
    return end === -1 ? v.slice(1) : v.slice(1, end);
  }
  const comment = v.indexOf(" #");
  return (comment === -1 ? v : v.slice(0, comment)).trim();
}

/** Parse the contents of a dotenv file into key/value entries. */
export function parseEnv(content: string): ParseResult {
  const entries: ParsedEntry[] = [];
  const duplicates: { key: string; line: number }[] = [];
  const seen = new Set<string>();

  content.split(/\r?\n/).forEach((raw, index) => {
    const trimmed = raw.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const match = LINE_RE.exec(raw);
    if (!match) return;
    const key = match[1]!;
    const line = index + 1;
    if (seen.has(key)) duplicates.push({ key, line });
    seen.add(key);
    entries.push({ key, value: parseValue(match[2] ?? ""), line });
  });

  return { entries, duplicates };
}
