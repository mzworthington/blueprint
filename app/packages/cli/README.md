# `@blueprint/cli` — Command Line AST Analyzer

![Blueprint CLI Interactive Prompts](../../docs/screenshots/cli.gif)

Scans a local codebase, extracts modules and dependencies via static analysis, and writes C4-style YAML under `blueprints/`. Diagram layout is handled by the designer (autolayout on open; optional `x`/`y` when you customize positions in the UI).

Supports **multi-system** / monorepo discovery, **product hubs** on the context diagram, **type hydration**, **gitignore + structural filters**, **optional Git forensics**, and **cancelable** runs (Ctrl+C).

---

## Running the analyzer

From the repository `app/` directory:

```bash
pnpm dev:cli
```

### Modes

1. **Interactive (default):** step-by-step prompts for context, glob, output, and whether to enrich with Git forensics.
2. **Headless / CI:** non-TTY, or when flags are supplied:

```bash
pnpm dev:cli --headless --glob="**/*.{ts,tsx}" --output="blueprints"
```

### Flags

| Flag                               | Purpose                                                      |
| ---------------------------------- | ------------------------------------------------------------ |
| `--headless`                       | Disable interactive prompts                                  |
| `--parser=tree-sitter \| ts-morph` | AST engine (`tree-sitter` default; `ts-morph` via flag only) |
| `--glob="<pattern>"`               | Files to consider (still subject to filters)                 |
| `--output="<path>"`                | Output folder (or `BLUEPRINT_OUTPUT_DIR`)                    |
| `--context="<name>"`               | Context system name / entityRef root                         |
| `--ignore="<a,b>"`                 | Extra ignore globs (comma-separated)                         |
| `--systems="<a,b>"`                | Restrict discovery to these system roots                     |
| `--rollup-modules`                 | Collapse `*-module-*` packages into a prefix system          |
| `--git`                            | Explicitly enable Git forensics (on by default)              |
| `--no-git`                         | Skip Git forensics enrichment                                |
| `--git-only`                       | Headless architecture + forensics enrich (same deliverable)  |
| `--git-since=<days>`               | Forensics lookback window (default 90)                       |

Interrupt with **Ctrl+C** (or SIGTERM). First signal aborts cooperatively; a second signal force-exits (`130`).

### Git forensics examples

```bash
# Architecture + forensics (default) attached onto blueprint nodes
pnpm dev:cli --headless --output=blueprints

# Architecture without forensics
pnpm dev:cli --headless --no-git --output=blueprints

# Headless enrich with custom lookback
pnpm --filter @blueprint/cli exec tsx src/cli/blueprint.ts --git-only --git-since=90
```

Forensics attach a typed `forensics` object onto component nodes (per-file metrics via `filepath`) and rolled-up summaries onto containers and context system nodes. Optional `forensics` section in `blueprint.config.json` for thresholds (`hotspotThreshold`, `complexityThreshold`, `minSharedCommits`, `couplingThreshold`, `minChurnForComplexity`, `sinceDays`).

---

## What gets generated

| Artifact                                | Content                                                                        |
| --------------------------------------- | ------------------------------------------------------------------------------ |
| `blueprints/context.yaml`               | Software systems + hub→spoke “Part of product system” edges (merged on re-run) |
| `blueprints/<system>/containers.yaml`   | Containers for that system                                                     |
| `blueprints/<tf-root>/containers.yaml`  | Terraform resources/modules as containers (when `.tf` roots are found)         |
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

Test paths stay in the model and are tagged `isTest` (designer can hide them). Detection covers
JS/TS (`*.test.ts`, `__tests__`), .NET (`*.UnitTests`, `FooTests.cs`), Go, Java, and Python
conventions. Pure test projects are also tagged at the **container** level so they hide with
“Show test components” off.

### Type hydration

After extraction, nodes/edges are classified from imports, constructors, and path cues (e.g. gateway, relational DB, event broker, REST) and connected with suitable dependency types (`read-write`, `publish-subscribe`, …).

For **C# / .NET**, the analyzer also resolves `.csproj` `<ProjectReference>` edges and cross-namespace `using` dependencies. See the [project roadmap](../../README.md#c-and-net-analysis) for planned Aspire, integration-event, and HTTP/gRPC client detection.

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

## Source layout

```
src/
  cli/                 # entry, argv, interactive prompts
  analysis/
    domain/            # analyzer, extraction, discovery, testPath
      languages/       # csharp | python | typescript strategies
    adapters/
      parsing/         # ts-morph, tree-sitter, wasm paths
      pathFilter/      # gitignore + structural ignores
  forensics/           # git metrics (domain + adapters)
  writers/             # C4 YAML writers (+ baseWriter)
  test/                # shared fakes
```

---

## Building standalone binaries

```bash
pnpm --filter @blueprint/cli build
```

Produces `dist/blueprint` (or `dist/blueprint.exe`) and copies supported tree-sitter language `.wasm` files next to the binary. Releases ship those parsers in the same archive.

```bash
./dist/blueprint --headless --parser=tree-sitter
```

---

## Testing

```bash
pnpm test:cli
```

### VHS terminal demo

Records the interactive CLI against this repo into `docs/screenshots/cli.gif`
(requires [VHS](https://github.com/charmbracelet/vhs), `ttyd`, `ffmpeg`, and `bun`):

```bash
brew install vhs ffmpeg   # pulls ttyd
pnpm test:vhs
```

Tape source: `tapes/cli-demo.tape` (scans `app/packages/**/*.{ts,tsx}`, writes to `.vhs-out/`).
