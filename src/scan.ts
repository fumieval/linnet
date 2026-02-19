import ignore, { type Ignore } from "ignore";
import * as path from "node:path";
import * as fs from "node:fs";

const THRESHOLDS = [10000, 5000, 2000, 1000, 500, 200, 100];

function bucket(n: number): number {
  for (let i = 0; i < THRESHOLDS.length; i++) {
    if (n >= THRESHOLDS[i]!) return THRESHOLDS.length - i;
  }
  return 0;
}

export interface Node {
  name: string;
  lines: number;
  maxIndent: number;
  children: Node[];
}

export function maxIndentLevel(filePath: string): number {
  let content: string;
  try {
    content = fs.readFileSync(filePath, "utf8");
  } catch {
    return 0;
  }

  const lines = content.split("\n");

  // Detect whether the file uses tabs or spaces, and the space indent unit.
  let usesTabs = false;
  let minSpaceIndent = Infinity;
  for (const line of lines) {
    if (line.trim() === "") continue;
    if (line.startsWith("\t")) {
      usesTabs = true;
      break;
    }
    const m = line.match(/^( +)\S/);
    if (m) minSpaceIndent = Math.min(minSpaceIndent, m[1].length);
  }

  const unit = usesTabs ? 1 : (minSpaceIndent === Infinity ? 2 : minSpaceIndent);

  let max = 0;
  for (const line of lines) {
    if (line.trim() === "") continue;
    let level: number;
    if (usesTabs) {
      const m = line.match(/^\t*/);
      level = m ? m[0].length : 0;
    } else {
      const m = line.match(/^ */);
      level = m ? Math.floor(m[0].length / unit) : 0;
    }
    if (level > max) max = level;
  }

  return max;
}

export function findGitRoot(startDir: string): string | null {
  let dir = startDir;
  while (true) {
    if (fs.existsSync(path.join(dir, ".git"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

function addGitignore(ig: Ignore, dir: string): void {
  const gitignorePath = path.join(dir, ".gitignore");
  if (fs.existsSync(gitignorePath)) {
    ig.add(fs.readFileSync(gitignorePath, "utf8"));
  }
}

export function countLines(filePath: string): number {
  const content = fs.readFileSync(filePath);
  let count = 0;
  for (let i = 0; i < content.length; i++) {
    if (content[i] === 0x0a) count++;
  }
  // If file is non-empty and doesn't end with newline, count the last line
  if (content.length > 0 && content[content.length - 1] !== 0x0a) count++;
  return count;
}

function walk(dir: string, ig: Ignore, rootDir: string): Node {
  const name = path.basename(dir);
  const children: Node[] = [];

  // Layer any .gitignore found in this directory on top of the inherited rules
  const combined = ignore().add(ig);
  addGitignore(combined, dir);

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  entries.sort((a, b) => a.name.localeCompare(b.name));

  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue; // skip hidden

    const abs = path.join(dir, entry.name);
    const rel = path.relative(rootDir, abs);

    if (combined.ignores(rel + (entry.isDirectory() ? "/" : ""))) continue;

    if (entry.isDirectory()) {
      const child = walk(abs, combined, rootDir);
      if (child.lines > 0 || child.children.length > 0) {
        children.push(child);
      }
    } else if (entry.isFile()) {
      const lines = countLines(abs);
      const maxIndent = maxIndentLevel(abs);
      children.push({ name: entry.name, lines, maxIndent, children: [] });
    }
  }

  children.sort((a, b) => bucket(b.lines) - bucket(a.lines) || a.name.localeCompare(b.name));
  const total = children.reduce((sum, c) => sum + c.lines, 0);
  const maxIndent = children.reduce((m, c) => Math.max(m, c.maxIndent), 0);
  return { name, lines: total, maxIndent, children };
}

export function scanDirectory(dir: string): Node {
  const rootIg = ignore();
  // Use the git root as the reference for relative-path resolution so that
  // patterns like "backend/src/generated/" in the repo root's .gitignore are
  // matched correctly even when scanning a subdirectory.
  const gitRoot = findGitRoot(dir) ?? dir;
  addGitignore(rootIg, gitRoot);
  return walk(dir, rootIg, gitRoot);
}
