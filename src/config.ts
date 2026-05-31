import { existsSync, readFileSync } from "node:fs";
import type { Severity } from "./linter.ts";

export interface Config {
  example?: string;
  strict?: boolean;
  requiredKeys?: string[];
  ignoreKeys?: string[];
  rules?: Record<string, Severity | "off">;
}

const DEFAULT_PATH = ".envlintrc.json";

/**
 * Load `.envlintrc.json`. Returns `{}` when the default file is absent.
 * Throws when an explicitly requested file is missing or contains invalid JSON.
 */
export function loadConfig(path?: string): Config {
  const file = path ?? DEFAULT_PATH;
  if (!existsSync(file)) {
    if (path) throw new Error(`config file "${path}" not found`);
    return {};
  }
  try {
    return JSON.parse(readFileSync(file, "utf8")) as Config;
  } catch (e) {
    throw new Error(`invalid config "${file}": ${(e as Error).message}`);
  }
}
