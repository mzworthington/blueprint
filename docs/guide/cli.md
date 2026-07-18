# CLI analysis

The TypeScript CLI (`@blueprint/cli`) scans source, discovers systems, extracts components and dependencies, lays them out with Dagre, and writes multi-level blueprint YAML.

![CLI prompts](../screenshots/cli.gif)

## Modes

1. **Interactive** — prompts for context, glob, output, and git forensics
2. **Headless** — flags or non-TTY / CI; suitable for automation

```bash
blueprint --headless --glob="**/*.{ts,tsx}" --output="blueprints"
```

Install the release binary first: [Getting started](./getting-started.md).

## Useful flags

| Flag                               | Purpose                                                          |
| ---------------------------------- | ---------------------------------------------------------------- |
| `--headless`                       | No prompts                                                       |
| `--parser=tree-sitter \| ts-morph` | AST engine (default `tree-sitter`; `ts-morph` via flag only)     |
| `--glob`                           | Inclusion pattern                                                |
| `--output`                         | Output folder                                                    |
| `--context`                        | Context / root name                                              |
| `--ignore`                         | Extra ignore globs (csv)                                         |
| `--systems`                        | Limit discovery to roots                                         |
| `--rollup-modules`                 | Collapse `*-module-*` packages                                   |
| `--git` / `--no-git`               | Forensics on (default) or off                                    |
| `--git-since=<days>`               | Lookback window (default 90)                                     |
| `--no-relayout`                    | Preserve existing `x`/`y` on re-scan (default recomputes layout) |

With the default `tree-sitter` parser, language strategies cover TypeScript, C#, and Python (WASM grammars ship with the release binary). Pass `--parser=ts-morph` for TypeScript-only trees if needed.

Terraform (`.tf` / `.tf.json`) is auto-detected under the scan root and mapped by a separate IaC pass when root modules are found — no extra flag. The default glob includes `*.tf` so those paths stay in scope; AST parsers skip them.

Full flag table and config: see the [CLI README](https://github.com/mzworthington/blueprint/blob/main/app/packages/cli/README.md).

## Deliverable

YAML under the output directory — **not** a separate forensics report. Architecture graphs are the product; forensics attach onto `node.forensics` when enabled.

### Terraform

When the scan root contains Terraform (`.tf` / `.tf.json`), the CLI also emits infrastructure diagrams:

- Discovers **root modules** (directories with `.tf` files; nested module dirs are skipped as separate systems)
- Parses statically (no `terraform init` / plan)
- Adds an **Infrastructure** hub on `context.yaml` and links each TF root as a spoke (same pattern as code product hubs)
- Writes `blueprints/<root>/containers.yaml` per root module
- Context diagrams are laid out with **d3-hierarchy** (person → hubs → subsystems); container/component levels keep Dagre

No flag required — if Terraform files exist under the scan root, they are mapped.

### IDE validation

Install the YAML extension. Generated files set `version` to the public schema URL. You can also point the language server at **latest**:

```yaml
# yaml-language-server: $schema=https://blueprint.mzworthington.co.uk/schemas/latest/blueprint.schema.json
```

Prefer the versioned URL (`/schemas/v3/…`) when pinning a contract. `/schemas/latest/…` tracks `main`. Format details: [Setup — YAML format](../setup.md#yaml-format-v3).

## Cancellation

**Ctrl+C** (or SIGTERM) aborts cooperatively; a second signal force-exits.

## Next

- [Git forensics](./forensics.md)
- [Architecture & security](../architecture.md)
