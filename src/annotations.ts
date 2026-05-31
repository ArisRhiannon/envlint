// Schema-as-comments: lightweight type hints declared in .env.example comments,
// validated statically against .env values. No runtime, no dependency, no app code.
//
//   # @type url
//   DATABASE_URL=
//   # @enum development,production,test
//   NODE_ENV=
//   # @pattern ^[A-Z0-9]{20}$
//   API_KEY=

export interface Annotation {
  type?: string;
  enum?: string[];
  pattern?: string;
}

const DIRECTIVE = /^#\s*@(type|enum|pattern)\s+(.+)$/;
const ASSIGNMENT = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/;

/** Extract `@type`/`@enum`/`@pattern` directives that precede each key. */
export function parseAnnotations(example: string): Map<string, Annotation> {
  const annotations = new Map<string, Annotation>();
  let pending: Annotation = {};

  for (const raw of example.split(/\r?\n/)) {
    const line = raw.trim();
    const directive = DIRECTIVE.exec(line);
    if (directive) {
      const value = directive[2]!.trim();
      if (directive[1] === "type") pending.type = value;
      else if (directive[1] === "enum") pending.enum = value.split(",").map((s) => s.trim()).filter(Boolean);
      else pending.pattern = value;
      continue;
    }
    const assignment = ASSIGNMENT.exec(line);
    if (assignment) {
      if (Object.keys(pending).length) annotations.set(assignment[1]!, pending);
      pending = {};
    } else if (!line.startsWith("#")) {
      pending = {}; // blank or unrelated line ends the annotation block
    }
  }
  return annotations;
}

function checkType(v: string, type: string): boolean | null {
  switch (type) {
    case "url": {
      try { new URL(v); return true; } catch { return false; }
    }
    case "int": return /^-?\d+$/.test(v);
    case "number": return /^-?\d+(?:\.\d+)?$/.test(v);
    case "port": return /^\d+$/.test(v) && +v >= 1 && +v <= 65535;
    case "bool":
    case "boolean": return /^(?:true|false|0|1|yes|no)$/i.test(v);
    case "email": return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v);
    default: return null; // unknown type = authoring error in the example
  }
}

/** Validate a value against its annotation. Returns an error message or null. */
export function validateValue(value: string, ann: Annotation): string | null {
  if (ann.enum && !ann.enum.includes(value)) return `must be one of: ${ann.enum.join(", ")}`;
  if (ann.type) {
    const ok = checkType(value, ann.type);
    if (ok === null) return `has unknown @type "${ann.type}" in example`;
    if (!ok) return `must be a valid ${ann.type}`;
  }
  if (ann.pattern) {
    let re: RegExp;
    try { re = new RegExp(ann.pattern); } catch { return `has invalid @pattern /${ann.pattern}/ in example`; }
    if (!re.test(value)) return `must match /${ann.pattern}/`;
  }
  return null;
}
