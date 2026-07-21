# Setup & Local Development

This page covers setting up your local development environment, package installation, running the development server, compiling the app, and quality control commands.

For a product-oriented walkthrough, see the [Product guide](./guide/).

---

## Environment & Tooling Setup

We use **[Mise](https://mise.jdx.dev/)** to manage Node.js, pnpm, and Bun versions defined in `mise.toml`.

1. **Install Mise:** Refer to the [Mise Installation Guide](https://mise.jdx.dev/getting-started.html) (e.g., `brew install mise`).
2. **Activate Mise:** e.g. add `eval "$(mise activate zsh)"` to your `~/.zshrc`.
3. **Install Tools:** from the repository root:
   ```bash
   mise install
   ```

The production toolchain is TypeScript-only under `app/`. An experimental Rust tree lives in `cli/` but is unmaintained and not required for local development.

---

## Getting Started

### 1. Install Dependencies & Setup Husky Hooks

```bash
cd app
pnpm install
```

If Git hooks are not configured automatically:

```bash
pnpm run prepare
```

### 2. Run locally

One command serves docs (`/`) and the canvas (`/workspace`):

```bash
pnpm dev
```

Opens the Vite designer. Docs and workspace share the same React app.

### 3. Build Production Artifacts

```bash
pnpm build
```

GitHub Pages deploys the designer `dist/` (docs + app in one SPA). The production build registers a service worker (PWA) so the designer shell can load offline after the first visit.

Each production build gets a unique **build id** (from `GITHUB_SHA` in CI, injected into `index.html` and the JS bundle). When a new deploy is live, users see an **update banner** at the top of the app — **Refresh** activates the new service worker; **Later** dismisses until the next check (tab focus also re-checks `index.html` with `cache: no-store`).

---

## Testing, Formatting & Quality Control

```bash
pnpm test
pnpm test:coverage
pnpm test:ci
pnpm test:e2e
pnpm format:check
pnpm format:write
pnpm lint
pnpm knip
```

Designer E2E (`app/packages/designer`: `pnpm test:e2e`) refreshes screenshots under `docs/screenshots/` used by [journeys](./journeys.md). `pnpm generate:features-unit` regenerates [Unit test features](./features-unit.md) locally; CI generates the latest report during `pnpm test:ci` and uses that artifact for production builds.

---

## Git Commit Hooks

Husky + lint-staged validate commits for changes under `app/` and `docs/`:

- Prettier auto-formats staged files (`--write` via lint-staged); the hook then runs full-repo `format:check` (matching CI)
- Oxlint on TypeScript (`--deny-warnings`)
- TypeScript typecheck (`tsc -b`, matching the build step)
- When `app/packages/core/` is staged, checks that `schemas/blueprint.schema.json` (and `v*` / `latest` copies) match the Zod contract — commit fails if stale; run `pnpm generate:schema` to refresh

Install the recommended **YAML** extension (`redhat.vscode-yaml`). Workspace settings map `blueprints/**/*.yaml` to the local schema for autocomplete and validation.

### YAML format (v3)

Each blueprint file is a single YAML **mapping** (not a sequence). `version` is the public JSON Schema URL for this contract; diagram identity lives under `metaData`:

```yaml
version: https://blueprint.mzworthington.co.uk/schemas/v3/blueprint.schema.json
level: component
metaData:
  entityRef: blueprint/app/cli
  name: Cli Service Components
nodes: []
dependencies: []
```

Node and dependency shapes are unchanged from v2. Parsers still accept legacy v2 files (one-element sequence with flat `entityRef` / `name` / `version`); writers always emit v3.

### Public schema URLs (external repos)

After deploy, the same schema is served from the designer site:

- **Versioned (preferred):** https://blueprint.mzworthington.co.uk/schemas/v3/blueprint.schema.json
- **Latest:** https://blueprint.mzworthington.co.uk/schemas/latest/blueprint.schema.json

In any blueprint YAML file outside this repo, either set `version` to one of those URLs (as above) or add an IDE directive:

```yaml
# yaml-language-server: $schema=https://blueprint.mzworthington.co.uk/schemas/latest/blueprint.schema.json
```

Bump `SYSTEM_SCHEMA_MAJOR_VERSION` in `@blueprint/core` only when the contract breaks; `latest` always tracks main.

Product walkthrough (with a live render of latest): [JSON Schema](./guide/schema.md).
