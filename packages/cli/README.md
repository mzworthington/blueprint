# `@blueprint/cli` — Command Line AST Analyzer

![Blueprint CLI Interactive Prompts](../../screenshots/cli.png)

The Blueprint CLI tool scans local codebases, extracts module components and dependencies using static analysis (AST parsing), computes an optimal coordinate layout using Dagre, and outputs a valid system schema YAML file inside the `blueprints/` directory.

---

## 🚀 Running the Analyzer

You can execute the analyzer during development using the following command at the repository root:

```bash
pnpm dev:cli
```

### CLI Execution Modes

1. **Interactive Mode (Default):**
   When run inside an interactive terminal, the CLI will walk you through a step-by-step prompt menu powered by `@clack/prompts`:
   - Select your preferred parser (e.g., `ts-morph` or `tree-sitter`).
   - Define the glob pattern to scan.
   - Define the output directory path.

2. **Headless / CI Mode:**
   The CLI automatically switches to headless mode when executed in a non-TTY terminal, standard CI environments, or when arguments are supplied directly:
   ```bash
   pnpm dev:cli --headless --parser=ts-morph --glob="src/**/*.ts" --output="blueprints"
   ```

### Command Options & Flags

- `--headless`: Explicitly disables interactive console prompts.
- `--parser=<ts-morph | tree-sitter>`:
  - `ts-morph` (default): Fast, lightweight parsing for TypeScript-focused projects.
  - `tree-sitter`: High-performance parsing supporting multi-language syntaxes.
- `--glob="<pattern>"`: The directory or glob matching query to scan (e.g., `**/*.{ts,tsx}`).
- `--output="<path>"`: The folder to store generated YAML blueprint files. You can also configure this by setting the `BLUEPRINT_OUTPUT_DIR` environment variable.

---

## 🛠️ Building & Compiling Standalone Binaries

You can compile the analyzer CLI tool into a standalone platform-native executable binary using Bun:

```bash
pnpm --filter @blueprint/cli build
```

This compiles a standalone binary directly to the workspace root at `dist/blueprint` (or `dist/blueprint.exe` on Windows):

```bash
./dist/blueprint --headless --parser=ts-morph
```

> [!NOTE]
> The standalone binary requires tree-sitter `.wasm` query files (found in `node_modules/tree-sitter-wasms/out/`) in either the same directory as the executable, or in the target project's `node_modules` directory for parser support.

---

## 🧪 Testing

To run the CLI unit test suite:

```bash
pnpm test:cli
```
