# Blueprint — Visual Systems Architecture Canvas

[![CI & Deployment Pipeline](https://github.com/mzworthington/blueprint/actions/workflows/ci.yml/badge.svg)](https://github.com/mzworthington/blueprint/actions/workflows/ci.yml) [![CodeQL Analysis](https://github.com/mzworthington/blueprint/actions/workflows/codeql.yml/badge.svg)](https://github.com/mzworthington/blueprint/actions/workflows/codeql.yml)

Blueprint is a local-first, bi-directionally synchronized visual diagramming canvas designed to draft, validate, and persist systems architecture layouts. System maps are visual representations of a strict underlying YAML/JSON declarative schema, allowing designers to switch seamlessly between graphical composition and text configuration.

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

## 🚀 Roadmap & Future Enhancements

We are continuously improving Blueprint. Here are some of the key features and enhancements planned for the roadmap:

### 1. Interactive Visual Editing

- ~~**Undo / Redo (History):**~~ Shipped — Zustand history + `Cmd+Z` / `Cmd+Shift+Z` toolbar shortcuts.
- ~~**Drag-and-Drop Catalog:**~~ Shipped — drag catalog items onto the canvas (click-to-add still available).

### 2. Forensic Insights Expansion

- ~~**Code Churn Trend Charts:**~~ Shipped — micro sparklines in the Git forensics property panel; trend charts on `/forensics`.
- ~~**Suggested Refactoring Paths:**~~ Shipped — complexity × churn × ownership ranking on the `/forensics` Refactor tab.
- **Guided Refactor Workflow:** Turn forensics rankings into actionable refactor boundaries, ownership breakdown, and one-click canvas navigation.

### 3. Strategic Differentiators (Tier 1)

- **Code ↔ Infrastructure Linking:** Cross-diagram dependencies between product and infrastructure hubs (inferred from naming, tags, or annotations).
- **CI Architecture Drift Gate:** `blueprint --headless` in CI diffs generated YAML against committed `blueprints/` and fails on unreviewed structural changes.
- **Architecture Governance Rules Engine:** Configurable policy checks (e.g. no person→database at context level) surfaced as designer warnings.

### 4. Integrations & Version Control

- **Direct Git Branch Integration:** View active git branch states within the web app and directly commit/push schema changes to new branches.

### 4b. Infrastructure as Code

- ~~**Pulumi CLI pass:**~~ Shipped — auto-detects `Pulumi.yaml` projects alongside Terraform; maps to Infrastructure hub + `containers.yaml`.
- ~~**Designer IaC import wizard:**~~ Shipped — paste or upload Terraform / Pulumi into the active diagram with merge preview (toolbar **Open** → Import Infrastructure).

### 5. Local-first Persistence

- ~~**Draft restore on refresh:**~~ Shipped — sandbox drafts hydrate from IndexedDB when topology matches; workspace open remains disk-first with draft merge.
