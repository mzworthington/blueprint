# Setup & Local Development

This page covers setting up your local development environment, package installation, running the development server, compiling the app, and quality control commands.

---

## ⚙️ Environment & Tooling Setup

We use **[Mise](https://mise.jdx.dev/)** to automatically manage and activate project tool versions (Node.js and pnpm) defined in `mise.toml`.

1. **Install Mise:** Refer to the [Mise Installation Guide](https://mise.jdx.dev/getting-started.html) (e.g., `brew install mise`).
2. **Activate Mise:** Make sure Mise is activated in your shell (e.g., add `eval "$(mise activate zsh)"` to your `~/.zshrc`).
3. **Install Tools:** Run the following in the repository root to automatically download and configure the exact Node/pnpm versions:
   ```bash
   mise install
   ```

_(Alternatively, you can manually use Node.js `v26.x` or later and pnpm `v11.x` or later)._

---

## 🚀 Getting Started

### 1. Install Dependencies & Setup Husky Hooks

Install project packages. This command automatically executes Husky setup:

```bash
pnpm install
```

If Git hooks are not configured automatically, you can initialize Husky manually:

```bash
pnpm run prepare
```

### 2. Run Local Development Server

Launches the Vite server with Hot Module Replacement (HMR):

```bash
pnpm dev
```

### 3. Build Production Artifacts

Compiles type definitions and generates the minified production bundle in the `dist` directory:

```bash
pnpm build
```

---

## 🧪 Testing, Formatting & Quality Control

### Running Tests

Run the Vitest suite (unit and store validation tests):

```bash
pnpm test
```

Run the Playwright suite (end-to-end user journey tests):

```bash
pnpm test:e2e
```

### Formatting

Run Prettier validation:

```bash
pnpm format:check
```

Apply automatic formatting to all source files:

```bash
pnpm format:write
```

---

## ⚓ Git Commit Hooks

We use **Husky** and **lint-staged** to validate commits before they are finalized:

- Staged files undergo Prettier formatting check (`prettier --check`) and lint verification (`oxlint -c .oxlintrc.json`).
- The entire codebase is checked for lint errors (`pnpm run lint`).
- The full Vitest test suite (`pnpm test`) is run.
- If formatting check fails, lint errors are found, or unit tests fail, the commit is blocked.
