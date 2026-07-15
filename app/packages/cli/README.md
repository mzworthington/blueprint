# `@blueprint/cli` — Command Line AST Analyzer

![Blueprint CLI Interactive Prompts](../../docs/screenshots/cli.png)

Scans a local codebase, extracts modules and dependencies via static analysis, lays them out with Dagre, and writes C4-style YAML under `blueprints/`.

Supports **multi-system** / monorepo discovery, **product hubs** on the context diagram, **type hydration**, **gitignore + structural filters**, **optional Git forensics**, and **cancelable** runs (Ctrl+C).

---

## Running the analyzer

From the repository `app/` directory:

```bash
pnpm dev:cli
```

### Modes

1. **Interactive (default):** step-by-step prompts for parser, glob, output, and whether to enrich with Git forensics.
2. **Headless / CI:** non-TTY, or when flags are supplied:

```bash
pnpm dev:cli --headless --parser=ts-morph --glob="**/*.{ts,tsx}" --output="blueprints"
```

### Flags

| Flag                               | Purpose                                                           |
| ---------------------------------- | ----------------------------------------------------------------- |
| `--headless`                       | Disable interactive prompts                                       |
| `--parser=ts-morph \| tree-sitter` | AST engine (`ts-morph` default; `tree-sitter` for multi-language) |
| `--glob="<pattern>"`               | Files to consider (still subject to filters)                      |
| `--output="<path>"`                | Output folder (or `BLUEPRINT_OUTPUT_DIR`)                         |
| `--context="<name>"`               | Context system name / entityRef root                              |
| `--ignore="<a,b>"`                 | Extra ignore globs (comma-separated)                              |
| `--systems="<a,b>"`                | Restrict discovery to these system roots                          |
| `--rollup-modules`                 | Collapse `*-module-*` packages into a prefix system               |
| `--git`                            | Explicitly enable Git forensics (on by default)                   |
| `--no-git`                         | Skip Git forensics enrichment                                     |
| `--git-only`                       | Headless architecture + forensics enrich (same deliverable)       |
| `--git-since=<days>`               | Forensics lookback window (default 90)                            |

Interrupt with **Ctrl+C** (or SIGTERM). First signal aborts cooperatively; a second signal force-exits (`130`).

### Git forensics examples

```bash
# Architecture + forensics (default) attached onto blueprint nodes
pnpm dev:cli --headless --output=blueprints

# Architecture without forensics
pnpm dev:cli --headless --no-git --output=blueprints

# Headless enrich with custom lookback
pnpm --filter @blueprint/cli exec tsx src/blueprint.ts --git-only --git-since=90
```

Forensics attach a typed `forensics` object onto component nodes (per-file metrics via `filepath`) and rolled-up summaries onto containers and context system nodes. Optional `forensics` section in `blueprint.config.json` for thresholds (`hotspotThreshold`, `complexityThreshold`, `minSharedCommits`, `couplingThreshold`, `minChurnForComplexity`, `sinceDays`).

---

## What gets generated

| Artifact                                | Content                                                                        |
| --------------------------------------- | ------------------------------------------------------------------------------ |
| `blueprints/context.yaml`               | Software systems + hub→spoke “Part of product system” edges (merged on re-run) |
| `blueprints/<system>/containers.yaml`   | Containers for that system                                                     |
| `blueprints/<system>/*-components.yaml` | Component graphs per container                                                 |

### Multi-system discovery

By default the analyzer finds systems from:

- `package.json` / `pnpm-workspace.yaml` workspace members
- Standalone package roots at the scan root
- Optional `systems` from config or `--systems=`

A **product hub** node is added when multiple subsystems share a product, so Blueprint vs Backstage (different `productId`s) stay disconnected.

### Filtering

Files are included only if they pass **all** of:

1. Glob match
2. `.gitignore` (and nested gitignores)
3. Built-in **structural** ignores (docs, scripts, e2e, storybook, `dist`, `build`, coverage, `.github`, …)
4. Optional config / CLI `--ignore`
5. Optional config `include` allow-list

Test paths stay in the model and are tagged `isTest` (designer can hide them).

### Type hydration

After extraction, nodes/edges are classified from imports, constructors, and path cues (e.g. gateway, relational DB, event broker, REST) and connected with suitable dependency types (`read-write`, `publish-subscribe`, …).

---

## Config file

Optional `blueprint.config.json` (or `.yml` / `.yaml`) beside the scan root:

```json
{
  "ignore": ["**/generated/**"],
  "include": [],
  "systems": ["packages", "plugins"],
  "rollupModules": false,
  "glob": "**/*.{ts,tsx}",
  "context": "my-product"
}
```

---

## Building standalone binaries

```bash
pnpm --filter @blueprint/cli build
```

Produces `dist/blueprint` (or `dist/blueprint.exe`) and copies supported tree-sitter language `.wasm` files next to the binary. Releases ship those parsers in the same archive.

```bash
./dist/blueprint --headless --parser=ts-morph
```

---

## Testing

```bash
pnpm test:cli
```
