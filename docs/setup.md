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

GitHub Pages deploys the designer `dist/` (docs + app in one SPA).

---

## Testing, Formatting & Quality Control

```bash
pnpm test
pnpm test:e2e
pnpm format:check
pnpm format:write
pnpm lint
pnpm knip
```

---

## Git Commit Hooks

Husky + lint-staged validate commits for changes under `app/`:

- Prettier formatting
- Oxlint on TypeScript
- When `app/packages/core/` is staged, checks that `schemas/blueprint.schema.json` (and `v*` / `latest` copies) match the Zod contract — commit fails if stale; run `pnpm generate:schema` to refresh

Install the recommended **YAML** extension (`redhat.vscode-yaml`). Workspace settings map `blueprints/**/*.yaml` to the local schema for autocomplete and validation.

### Public schema URLs (external repos)

After deploy, the same schema is served from the designer site:

- **Versioned (preferred):** https://blueprint.mzworthington.co.uk/schemas/v2/blueprint.schema.json
- **Latest:** https://blueprint.mzworthington.co.uk/schemas/latest/blueprint.schema.json

In any blueprint YAML file outside this repo:

```yaml
# yaml-language-server: $schema=https://blueprint.mzworthington.co.uk/schemas/v2/blueprint.schema.json
```

Bump `SYSTEM_SCHEMA_MAJOR_VERSION` in `@blueprint/core` only when the contract breaks; `latest` always tracks main.
