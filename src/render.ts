import type { Node } from "./scan.ts";
import type { ResolvedConfig } from "./config.ts";
import pc from "picocolors";

// ---------------------------------------------------------------------------
// Ballpark
// ---------------------------------------------------------------------------

const BALLPARK_THRESHOLDS: [number, string][] = [
  [100000, "100k+"],
  [50000, "50k+"],
  [20000, "20k+"],
  [10000, "10k+"],
  [5000,  "5k+"],
  [2000,  "2k+"],
  [1000,  "1k+"],
  [500,   "500+"],
  [200,   "200+"],
  [100,   "100+"],
];

function colorLabel(n: number, label: string): string {
  if (n >= 2000) return pc.red(label);
  if (n >= 500)  return pc.yellow(label);
  if (n >= 100)  return pc.cyan(label);
  return pc.dim(label);
}

export function formatLines(n: number, ballpark: boolean): string {
  if (!ballpark) return `${n}`;
  for (const [threshold, label] of BALLPARK_THRESHOLDS) {
    if (n >= threshold) return label;
  }
  return "< 100";
}

const COUNT_THRESHOLDS: [number, string][] = [
  [100, "100+"],
  [50,  "50+"],
  [20,  "20+"],
  [10,  "10+"],
  [5,   "5+"],
];

function formatCount(n: number): string {
  for (const [threshold, label] of COUNT_THRESHOLDS) {
    if (n >= threshold) return label;
  }
  return `${n}`;
}

// ---------------------------------------------------------------------------
// Indent level
// ---------------------------------------------------------------------------

function colorIndent(n: number): string {
  if (n >= 16) return pc.red(`${n}`);
  if (n >= 8) return pc.yellow(`${n}`);
  return pc.dim(`${n}`);
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

function isNotable(node: Node, config: ResolvedConfig): boolean {
  if (node.children.length === 0) {
    return node.lines >= config.notableLines || node.maxIndent >= config.notableIndent;
  }
  return node.children.some(c => isNotable(c, config));
}

export function render(
  node: Node,
  ballpark: boolean,
  verbose: boolean,
  config: ResolvedConfig,
  indent = 0,
  isRoot = true,
): void {
  const prefix = " ".repeat(indent * 2);
  const label = isRoot ? `${node.lines}` : formatLines(node.lines, ballpark);
  const isDir = node.children.length > 0;
  const name = isDir ? pc.bold(node.name) : node.name;
  const lineLabel = isDir
    ? `[${colorLabel(node.lines, label)}]`
    : colorLabel(node.lines, label);
  const indentSuffix = isDir ? "" : `  ${pc.dim("indent:")}${colorIndent(node.maxIndent)}`;
  console.log(`${prefix}${name}  ${lineLabel}${indentSuffix}`);

  const children = verbose ? node.children : node.children.filter(c => isNotable(c, config));

  if (ballpark) {
    const small = children.filter(c => c.lines < config.collapseBelow);
    const rest = children.filter(c => c.lines >= config.collapseBelow);
    for (const child of rest) {
      render(child, ballpark, verbose, config, indent + 1, false);
    }
    if (small.length > config.collapseThreshold) {
      const summary = `… ${formatCount(small.length)} files < ${config.collapseBelow} lines`;
      console.log(`${" ".repeat((indent + 1) * 2)}${pc.dim(summary)}`);
    } else {
      for (const child of small) {
        render(child, ballpark, verbose, config, indent + 1, false);
      }
    }
  } else {
    for (const child of children) {
      render(child, ballpark, verbose, config, indent + 1, false);
    }
  }
}
