# Getting started

## Prerequisites

- [Mise](https://mise.jdx.dev/) (Node, pnpm, Bun via `mise.toml`), or install those tools yourself
- A local git checkout of Blueprint

Full environment detail: [Setup & local development](../setup.md).

## Install

```bash
mise install          # from repo root
cd app
pnpm install
```

## Run the designer

```bash
cd app
pnpm dev
```

Opens the Vite React canvas app for composing and editing blueprints.

## Run the CLI

```bash
cd app
pnpm dev:cli
```

Interactive mode asks for parser, glob, output directory, and git forensics (default on).

Headless example:

```bash
pnpm dev:cli --headless --output=blueprints --glob="**/*.{ts,tsx}"
```

Skip forensics with `--no-git`. Set lookback with `--git-since=90`.

## Where outputs land

The CLI writes YAML under `blueprints/` (or your `--output` path): context, container, and component diagrams with `entityRef` hierarchy. When git forensics runs, nodes include a `forensics` block (complexity, churn, lookback days, coupling, classifications).

## Open generated blueprints

In the designer, open a workspace pointing at that output folder (or use your usual flow to load systems). Use the system switcher on the canvas to jump between diagrams.

## Next

- [Canvas & workspace](./canvas.md)
- [CLI analysis](./cli.md)
- [Git forensics](./forensics.md)
