# linnet

Get a bird's-eye view of line counts in your codebase. linnet recursively scans directories, counts lines per file, and renders a colour-coded tree so you can spot oversized or deeply-nested files at a glance.

## Prerequisites

Requires [Bun](https://bun.sh). linnet executes TypeScript directly via Bun, so it does not work with Node.js alone.

## Usage

```bash
bunx @nestling.dev/linnet [options] [paths...]
```

When no paths are given, the current working directory is used.

### Options

| Flag | Description |
|------|-------------|
| `-e, --exact` | Show exact line counts instead of ballpark approximations |
| `-v, --verbose` | Show all files, not just notable ones |
| `-a, --all` | Include all files, not just git-tracked source files |

### Default filters

By default linnet applies two filters so the output focuses on source code:

1. **Git-tracked only** — only files listed by `git ls-files` are counted. If the directory is not inside a git repository, all non-ignored files are included as a fallback.
2. **Source files only** — files with known non-source extensions (images, videos, audio, fonts, documents, archives, compiled objects, etc.) are skipped.

Pass `--all` to disable both filters and include every non-ignored file.

### Ballpark vs exact mode

By default linnet displays **ballpark** counts (`200+`, `500+`, `1k+`, `2k+`, …) and collapses groups of small files to keep the output concise. Pass `--exact` to see precise numbers.

### Notable files

In normal (non-verbose) mode, only **notable** files are shown — those with **500 or more lines** or a **max indentation level of 16+**. Use `--verbose` to disable this filter. Files matching ignore patterns (tests, stories, specs by default) are always excluded from the scan regardless of `--verbose`.

## Configuration

Place a `linnet.jsonc` or `linnet.json` in your project (searched upward to the git root):

```jsonc
{
  // Show files with this many lines or more (default: 500)
  "notableLines": 500,
  // Show files with this indent depth or more (default: 16)
  "notableIndent": 16,
  // Regex patterns for files to always exclude from the scan
  "ignorePatterns": ["\\.stories\\.[jt]sx?$", "\\.test\\.[jt]sx?$", "\\.spec\\.[jt]sx?$"],
  // In ballpark mode, collapse files below this line count (default: 200)
  "collapseBelow": 200,
  // Collapse only when there are more than this many small files (default: 5)
  "collapseThreshold": 5
}
```


## License

MIT
