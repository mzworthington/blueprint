# Blueprint — Visual Systems Architecture Canvas

[![CI & Deployment Pipeline](https://github.com/mzworthington/blueprint/actions/workflows/ci.yml/badge.svg)](https://github.com/mzworthington/blueprint/actions/workflows/ci.yml)

Blueprint is a local-first, bi-directionally synchronized visual diagramming canvas designed to draft, validate, and persist systems architecture layouts. System maps are visual representations of a strict underlying YAML/JSON declarative schema, allowing designers to switch seamlessly between graphical composition and text configuration.

---

## 📸 The Blueprint App

![Blueprint Interface Tour & Catalog](./screenshots/1-panels-expanded.png)

A front-end visual canvas web application client. Double-click boundary nodes to drill down into C4 container/component levels and edit schemas side-by-side with code-viewer synchronization.

👉 **Learn more:** [packages/app README](./packages/app/README.md)

---

## 💻 The Blueprint CLI Tool

![Blueprint CLI Interactive Prompts](./screenshots/cli.png)

A powerful command-line static analysis (AST) code scanner. It parses source files, identifies components and dependency references, formats an optimal coordinate layout using Dagre, and outputs a valid system schema YAML configuration.

👉 **Learn more:** [packages/cli README](./packages/cli/README.md)

---

## 📦 Workspace Package Catalog

This repository is organized as a `pnpm` monorepo workspace:

| Package               | Path                               | Description                                                         |
| :-------------------- | :--------------------------------- | :------------------------------------------------------------------ |
| **`@blueprint/app`**  | [packages/app/](./packages/app/)   | Front-end diagramming client (Vite, React Flow, Playwright E2E)     |
| **`@blueprint/cli`**  | [packages/cli/](./packages/cli/)   | CLI static analysis AST scanner & standalone binary generator       |
| **`@blueprint/core`** | [packages/core/](./packages/core/) | Shared zero-dependency domain models, validation schemas, and rules |

---

## 🛠️ Global Workspace Commands

Run these scripts from the repository root directory to manage the workspace:

```bash
# Start the visual app dev server
pnpm dev

# Run the analyzer CLI tool interactively
pnpm dev:cli

# Compile production assets and standalone CLI binaries
pnpm build

# Run formatting checks and eslint/oxlint linters
pnpm format:check
pnpm lint

# Execute all unit tests recursively (in Node/JSDOM contexts)
pnpm test

# Run all Playwright E2E integration tests
pnpm test:e2e
```

---

## 📖 Deep-Dive Documentation

Explore these files under the `docs/` directory to learn more:

- **[E2E Journeys & Interface Tour](./docs/journeys.md):** Detailed step-by-step guides, screenshots, and C4 visualization tours.
- **[System Architecture & Security](./docs/architecture.md):** Hexagonal structure layers, Zustand state store slices, schema validation rules, and cyclic dependency checkers.
- **[Setup & Local Development](./docs/setup.md):** Complete guide to tools installation (Mise), compiling standalone executables, and pre-commit Git validation hooks.
