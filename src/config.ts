import * as fs from "node:fs";
import * as path from "node:path";
import { parse as parseJsonc, type ParseError } from "jsonc-parser";
import { findGitRoot } from "./scan.ts";

export interface LinnetConfig {
  notableLines?: number;
  notableIndent?: number;
  ignorePatterns?: string[];
  collapseBelow?: number;
  collapseThreshold?: number;
}

export interface ResolvedConfig {
  notableLines: number;
  notableIndent: number;
  ignorePatterns: string[];
  collapseBelow: number;
  collapseThreshold: number;
}

export const DEFAULT_CONFIG: ResolvedConfig = {
  notableLines: 500,
  notableIndent: 16,
  ignorePatterns: ["\\.stories\\.[jt]sx?$", "\\.test\\.[jt]sx?$", "\\.spec\\.[jt]sx?$"],
  collapseBelow: 200,
  collapseThreshold: 5,
};


export function findConfigFile(startDir: string): string | null {
  const gitRoot = findGitRoot(startDir);
  let dir = startDir;

  while (true) {
    for (const name of ["linnet.jsonc", "linnet.json"]) {
      const candidate = path.join(dir, name);
      if (fs.existsSync(candidate)) return candidate;
    }

    if (gitRoot && dir === gitRoot) break;

    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  return null;
}

export function loadConfig(startDir: string): ResolvedConfig {
  const configPath = findConfigFile(startDir);
  if (!configPath) return DEFAULT_CONFIG;

  let raw: string;
  try {
    raw = fs.readFileSync(configPath, "utf8");
  } catch {
    return DEFAULT_CONFIG;
  }

  const errors: ParseError[] = [];
  const parsed = parseJsonc(raw, errors) as LinnetConfig;
  if (errors.length > 0) {
    process.stderr.write(`linnet: failed to parse ${configPath}\n`);
    return DEFAULT_CONFIG;
  }

  return {
    notableLines: parsed.notableLines ?? DEFAULT_CONFIG.notableLines,
    notableIndent: parsed.notableIndent ?? DEFAULT_CONFIG.notableIndent,
    ignorePatterns: parsed.ignorePatterns ?? DEFAULT_CONFIG.ignorePatterns,
    collapseBelow: parsed.collapseBelow ?? DEFAULT_CONFIG.collapseBelow,
    collapseThreshold: parsed.collapseThreshold ?? DEFAULT_CONFIG.collapseThreshold,
  };
}
