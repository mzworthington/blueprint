# `@blueprint/cli` — Command Line AST Analyzer (Rust)

A powerful systems architecture static analysis (AST) code scanner rewritten in **Rust**. It parses source files, identifies components and dependency references, formats an optimal coordinate layout using a deterministic grid layout, and outputs a valid system schema YAML file inside the `blueprints/` directory.

---

## 🚀 Running the Analyzer

You can execute the analyzer during development using Cargo:

```bash
# Run interactively (will walk you through a prompt menu powered by `dialoguer`)
cargo run

# Run in headless mode with parameters
cargo run -- --headless --glob="src/**/*.ts" --output="blueprints"
```

### CLI Execution Modes

1. **Interactive Mode (Default):**
   When run inside an interactive terminal, the CLI will walk you through a step-by-step prompt menu powered by `dialoguer`:
   - Glob pattern to scan (defaults to `app/packages/designer/src/**/*.{ts,tsx}`).
   - Output directory path (defaults to `blueprints`).

2. **Headless / CI Mode:**
   The CLI automatically switches to headless mode when executed in a non-TTY terminal, standard CI environments, or when arguments are supplied directly:
   ```bash
   cargo run -- --headless --glob="src/**/*.ts" --output="blueprints"
   ```

### Command Options & Flags

- `--headless`: Explicitly disables interactive console prompts.
- `--glob="<pattern>"`: The directory or glob matching query to scan (e.g., `**/*.{ts,tsx,py,js,jsx}`).
- `--output="<path>"`: The folder to store generated YAML blueprint files.

---

## 🛠️ Building & Compiling Standalone Binaries

You can compile the analyzer CLI tool into a standalone platform-native executable binary using Cargo:

```bash
cargo build --release
```

This compiles a standalone binary to `target/release/blueprint` (or `blueprint.exe` on Windows):

```bash
./target/release/blueprint --headless
```

### Prerequisites
*   **Rust Toolchain:** Requires `rustc` / `cargo` (edition 2021).
*   **Protobuf compiler:** Requires the `protoc` binary installed on your PATH (e.g., via `brew install protobuf`, `mise install`, or `choco install protoc`) to compile the Protocol Buffer definitions during build.

---

## 🧪 Testing

To run the CLI Rust tests:

```bash
cargo test
```
