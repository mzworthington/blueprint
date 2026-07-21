# Blueprint — Visual Systems Architecture Canvas

[![CI & Deployment Pipeline](https://github.com/mzworthington/blueprint/actions/workflows/ci.yml/badge.svg)](https://github.com/mzworthington/blueprint/actions/workflows/ci.yml) [![CodeQL Analysis](https://github.com/mzworthington/blueprint/actions/workflows/codeql.yml/badge.svg)](https://github.com/mzworthington/blueprint/actions/workflows/codeql.yml)

Blueprint is a local-first, bi-directionally synchronized visual diagramming canvas designed to draft, validate, and persist systems architecture layouts. Diagrams are visual representations of a strict underlying YAML/JSON declarative schema, allowing designers to switch seamlessly between graphical composition and text configuration.

---

## The Blueprint App

![Blueprint Interface Tour & Catalog](./docs/screenshots/1-panels-expanded.png)

A front-end visual canvas web application client. Double-click boundary nodes to drill down into C4 container/component levels and edit schemas side-by-side with code-viewer synchronization.

👉 **Learn more:** [app/packages/designer/README.md](./app/packages/designer/README.md)

---

## The Blueprint CLI Tool

![Blueprint CLI Interactive Prompts](./docs/screenshots/cli.gif)

A command-line static analysis (AST) codebase scanner. It parses source files, extracts modules, identifies components and dependency references, computes an optimal layout using Dagre, and outputs a valid system schema YAML configuration file inside the `blueprints/` directory.

👉 **Learn more:** [app/packages/cli/README.md](./app/packages/cli/README.md)

---

## Workspace Component Catalog

| Component                           | Path                                               | Language/Framework                       | Description                                                                                   |
| :---------------------------------- | :------------------------------------------------- | :--------------------------------------- | :-------------------------------------------------------------------------------------------- |
| **`@blueprint/designer`**           | [app/packages/designer/](./app/packages/designer/) | TypeScript / React / Vite / React Flow   | Front-end visual diagramming client                                                           |
| **`@blueprint/cli`**                | [app/packages/cli/](./app/packages/cli/)           | TS / Node / Bun / Ts-Morph / Tree-Sitter | Production codebase scanner & Bun binary                                                      |
| **`@blueprint/core`**               | [app/packages/core/](./app/packages/core/)         | TypeScript / Zod                         | Shared domain types, validation, entityRef rules                                              |
| **`blueprint-rust` (unmaintained)** | [cli/](./cli/)                                     | Rust                                     | Quarantined — `cargo build` fails unless `BLUEPRINT_RUST_ALLOW_BUILD=1`; use `@blueprint/cli` |

Schema source of truth is TypeScript + Zod in `@blueprint/core` (no Protocol Buffers).

---

## Development & Build Commands

### Visual frontend & packages (`/app`)

```bash
cd app

pnpm install
pnpm dev                 # docs at / + canvas at /workspace
pnpm build
pnpm lint
pnpm format:check
pnpm test                # all workspace packages
pnpm test:designer
pnpm test:cli
pnpm test:e2e
```

### TypeScript CLI (`/app/packages/cli`)

```bash
cd app

pnpm dev:cli
pnpm dev:cli --headless --glob="packages/**/*.ts" --output="blueprints"
pnpm --filter @blueprint/cli build
pnpm test:cli
```

---

## Deep-dive documentation

Product guide and reference live as Markdown under [`docs/`](./docs/) (same files locally, in git, and on the site):

- **[Product guide](./docs/guide/index.md)** — overview, canvas, CLI, forensics
- **[E2E Journeys & Interface Tour](./docs/journeys.md)**
- **[System Architecture & Security](./docs/architecture.md)**
- **[Setup & Local Development](./docs/setup.md)**

```bash
cd app
pnpm dev   # docs (/) + workspace (/workspace) in one Vite app
```

On GitHub Pages: documentation at `/`, canvas at `/workspace`.

---

## Roadmap

Outstanding enhancements planned for Blueprint:

### Forensics & refactoring

- **Guided refactor workflow:** Turn forensics rankings into actionable refactor boundaries, ownership breakdown, and one-click canvas navigation. _(shipped — `/forensics` refactor plan slide-over, `forensics.authors` from CLI)_

### Strategic differentiators

- **Code ↔ infrastructure linking:** Cross-diagram dependencies between product and infrastructure hubs (inferred from naming, tags, or annotations).
- **CI architecture drift gate:** `blueprint --headless` in CI diffs generated YAML against committed `blueprints/` and fails on unreviewed structural changes.
- **Architecture governance rules engine:** Configurable policy checks (e.g. no person→database at context level) surfaced as designer warnings.

### Integrations

- **Direct Git branch integration:** View active git branch states within the web app and commit/push schema changes to new branches.

### Designer canvas performance

Shipped:

- **Diagram loading overlay:** Full-canvas loading state when lazy-loading blueprints, switching diagrams, and running autolayout. Uses monotonic session tokens so only the active navigation clears the overlay (safe under React Strict Mode and fast drill-down).
- **Off-main-thread layout:** Dagre runs in a dedicated Web Worker for diagrams with 24+ nodes; graphs with 80+ nodes are laid out by connected component with UI yields between chunks.

### C# and .NET analysis

Shipped:

- **`.csproj` project references:** Inter-container edges from `<ProjectReference>` (e.g. `Ordering.API` → `Ordering.Domain`).
- **Namespace `using` resolution:** Cross-container and layer edges from `using` directives, with framework namespaces filtered (`System.*`, `Microsoft.*`, etc.).
- **Container discovery from `.csproj`:** Referenced projects appear even when no `.cs` files are in the scan glob (e.g. AppHost-only references).

Planned:

- **Aspire AppHost parsing:** Extract runtime topology from `builder.AddProject<...>()` and related Aspire hosting APIs.
- **Integration event wiring:** Detect `IIntegrationEventHandler<T>`, event bus registration (`AddRabbitMqEventBus`, etc.), and `IntegrationEvents/` folders to surface publish–subscribe edges between services.
- **HTTP / gRPC client edges:** Infer service-to-API calls from `HttpClient`, Refit clients, and gRPC stubs (namespace and naming conventions).
