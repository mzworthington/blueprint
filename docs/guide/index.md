# Product guide

Blueprint helps you **see and edit systems architecture** as living diagrams that stay faithful to a declarative schema.

Use this guide if you want to understand the product, not just the internals.

## What you get

| Piece         | Role                                                                                           |
| ------------- | ---------------------------------------------------------------------------------------------- |
| **Designer**  | Local-first (PWA) canvas for C4 diagrams, Mermaid import, property editing, and YAML/JSON sync |
| **CLI**       | Static analysis that discovers systems/containers/components and writes `blueprints/*.yaml`    |
| **Forensics** | Optional (on by default) git + complexity signals attached onto nodes as `forensics`           |

## Typical flow

1. Run the CLI against a codebase to generate blueprint YAML.
2. Open the designer — choose sandbox, a local `blueprints/` folder, or Mermaid import.
3. Explore hierarchy (context → container → component), manage externals / display filters, inspect forensics.
4. Commit draft YAML via Pending Changes — the schema is the source of truth.

## Guide chapters

- [Getting started](./getting-started.md) — install the CLI, scan a repo, open the app
- [Canvas & workspace](./canvas.md) — startup, panels, Mermaid import, externals, display toggles
- [CLI analysis](./cli.md) — scanners, flags, outputs
- [Git forensics](./forensics.md) — metrics, coupling overlay, lookback
- [Blueprint Schema](./schema.md) — public contract URLs and live latest schema
- [Design system](./design-system.md) — visual assets & identity sandbox

## Deeper reference

Still Markdown in this repo:

- [Setup & local development](../setup.md)
- [Architecture & security](../architecture.md)
- [Interface tour & journeys](../journeys.md)
