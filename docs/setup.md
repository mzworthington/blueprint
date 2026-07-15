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

### 2. Run Local Development Server

```bash
pnpm dev
```

Documentation site (VitePress, Markdown under `docs/`):

```bash
pnpm dev:docs
```

### 3. Build Production Artifacts

```bash
pnpm build
```

Combined GitHub Pages artifact (designer at `/` + docs at `/docs/`):

```bash
pnpm build:site
```

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

- Staged files: Prettier + Oxlint
- Full package lint, changed Vitest tests, and Knip
- Changes only under experimental `cli/` skip cargo checks (Rust is unmaintained)
