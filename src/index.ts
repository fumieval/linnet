#!/usr/bin/env bun
import { program } from "commander";
import * as path from "node:path";
import * as fs from "node:fs";
import { scanDirectory, countLines } from "./scan.ts";
import { render, formatLines } from "./render.ts";
import { loadConfig } from "./config.ts";

program
  .name("linnet")
  .description("Recursively count lines and display a tree with totals")
  .option("-e, --exact", "show exact line counts instead of ballpark")
  .option("-v, --verbose", "show all files, not just those with 500+ lines or 16+ indents")
  .argument("[paths...]", "Directories or files to analyse", [])
  .parse();

const opts = program.opts<{ exact: boolean; verbose: boolean }>();
const ballpark = !opts.exact;
const verbose = !!opts.verbose;
const args = program.args as string[];
const targets = args.length > 0 ? args : [process.cwd()];

const configDir = path.resolve(targets[0] ?? process.cwd());
const config = loadConfig(configDir);

for (const target of targets) {
  const abs = path.resolve(target);
  const stat = fs.statSync(abs);

  if (stat.isFile()) {
    const lines = countLines(abs);
    console.log(`${path.basename(abs)}  ${formatLines(lines, ballpark)}`);
  } else if (stat.isDirectory()) {
    const tree = scanDirectory(abs);
    render(tree, ballpark, verbose, config);
  }
}
