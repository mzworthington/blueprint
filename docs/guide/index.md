# Product guide

Blueprint helps you **see and edit systems architecture** as living diagrams that stay faithful to a declarative schema.

Use this guide if you want to understand the product, not just the internals.

## What you get

| Piece         | Role                                                                                        |
| ------------- | ------------------------------------------------------------------------------------------- |
| **Designer**  | Local-first canvas for C4-style diagrams, property editing, and YAML/JSON sync              |
| **CLI**       | Static analysis that discovers systems/containers/components and writes `blueprints/*.yaml` |
| **Forensics** | Optional (on by default) git + complexity signals attached onto nodes as `forensics`        |

## Typical flow

1. Run the CLI against a codebase to generate blueprint YAML.
2. Open the designer and load the workspace / `blueprints/` folder.
3. Explore hierarchy (context → container → component), tweak layout, inspect forensics.
4. Commit the YAML — the schema is the source of truth.

## Guide chapters

- [Getting started](./getting-started.md) — install the CLI, scan a repo, open the app
- [Canvas & workspace](./canvas.md) — panels, selection, zoom, sync
- [CLI analysis](./cli.md) — scanners, flags, outputs
- [Git forensics](./forensics.md) — metrics, coupling overlay, lookback
- [Design system](./design-system.md) — visual assets & identity sandbox

## Deeper reference

Still Markdown in this repo:

- [Setup & local development](../setup.md)
- [Architecture & security](../architecture.md)
- [Interface tour & journeys](../journeys.md)
