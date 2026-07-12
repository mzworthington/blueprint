# Blueprint — Visual Systems Architecture Canvas

[![CI & Deployment Pipeline](https://github.com/mzworthington/blueprint/actions/workflows/ci.yml/badge.svg)](https://github.com/mzworthington/blueprint/actions/workflows/ci.yml) [![CodeQL Analysis](https://github.com/mzworthington/blueprint/actions/workflows/codeql.yml/badge.svg)](https://github.com/mzworthington/blueprint/actions/workflows/codeql.yml)

Blueprint is a local-first, bi-directionally synchronized visual diagramming canvas designed to draft, validate, and persist systems architecture layouts. System maps are visual representations of a strict underlying YAML/JSON declarative schema, allowing designers to switch seamlessly between graphical composition and text configuration.

---

## 📸 The Blueprint App

![Blueprint Interface Tour & Catalog](./docs/screenshots/1-panels-expanded.png)

A front-end visual canvas web application client. Double-click boundary nodes to drill down into C4 container/component levels and edit schemas side-by-side with code-viewer synchronization.

👉 **Learn more:** [app/packages/designer/README.md](./app/packages/designer/README.md)

---

## 💻 The Blueprint CLI Tool

![Blueprint CLI Interactive Prompts](./docs/screenshots/cli.png)

A powerful command-line static analysis (AST) codebase scanner. It parses source files, extracts modules, identifies components and dependency references, computes an optimal layout using Dagre, and outputs a valid system schema YAML configuration file inside the `blueprints/` directory.

👉 **Learn more:** [app/packages/cli/README.md](./app/packages/cli/README.md)

---

## 📦 Workspace Component Catalog

This repository is organized into distinct subdirectories:

| Component                  | Path                                               | Language/Framework                       | Description                                                  |
| :------------------------- | :------------------------------------------------- | :--------------------------------------- | :----------------------------------------------------------- |
| **`@blueprint/designer`**  | [app/packages/designer/](./app/packages/designer/) | TypeScript / React / Vite / React Flow   | Front-end visual diagramming client (Playwright E2E, Vitest) |
| **`@blueprint/cli`**       | [app/packages/cli/](./app/packages/cli/)           | TS / Node / Bun / Ts-Morph / Tree-Sitter | TS codebase static analysis scanner & binary compiler        |
| **`blueprint-rust` (WIP)** | [cli/](./cli/)                                     | Rust / Clap / Tree-Sitter / Prost        | Rust static analysis AST scanner (Work in Progress)          |
| **`core-proto`**           | [core/proto/](./core/proto/)                       | Protocol Buffers (v3)                    | Shared declarative schemas defining system diagrams          |

---

## 🛠️ Development & Build Commands

Since this is a multi-language codebase, commands are run in their respective component directories:

### 🎨 Visual Frontend Web Application (`/app`)

Navigate to the `/app` directory to manage Node dependencies and development:

```bash
cd app

# Install dependencies
pnpm install

# Start the Vite React development server
pnpm dev

# Build the production assets
pnpm build

# Run linters (Oxlint) & code formatting checks (Prettier)
pnpm lint
pnpm format:check

# Execute front-end unit tests (Vitest + JSDOM)
pnpm test

# Run Playwright E2E tests
pnpm test:e2e
```

### 💻 TypeScript Static Analyzer CLI (`/app/packages/cli`)

Run and build the TypeScript CLI from the `/app` directory:

```bash
cd app

# Run the analyzer CLI interactively
pnpm dev:cli

# Run with headless configuration arguments
pnpm dev:cli --headless --glob="packages/**/*.ts" --output="blueprints"

# Compile the standalone platform-native binary (generates dist/blueprint)
pnpm --filter @blueprint/cli build

# Run unit tests for the CLI
pnpm test:cli
```

### 🦀 Rust Static Analyzer CLI (`/cli`) [Work in Progress]

Navigate to the `/cli` directory if you want to experiment with the experimental Rust-based CLI scanner:

```bash
cd cli

# Run the analyzer CLI interactively during development
cargo run

# Run with headless configuration arguments
cargo run -- --headless --glob="src/**/*.ts" --output="blueprints"

# Compile the release binary (generated at target/release/blueprint-rust)
cargo build --release

# Run Rust unit/integration tests
cargo test
```

---

## 📖 Deep-Dive Documentation

Explore these files under the `docs/` directory to learn more:

- **[E2E Journeys & Interface Tour](./docs/journeys.md):** Detailed step-by-step guides, screenshots, and C4 visualization tours.
- **[System Architecture & Security](./docs/architecture.md):** Hexagonal structure layers, Zustand state store slices, schema validation rules, and cyclic dependency checkers.
- **[Setup & Local Development](./docs/setup.md):** Complete guide to tools installation (Mise), compiling standalone executables, and pre-commit Git validation hooks.
