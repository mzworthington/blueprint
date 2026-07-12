# `core` — Shared Domain Declarative Protocol Buffers Schema

The `core` directory defines the system architecture schema using **Protocol Buffers (v3)**. It is the single source of truth shared between the Rust CLI static analyzer and the frontend visual React canvas.

---

## 📂 Schema Location
* **Schema file:** [core/proto/blueprint/v1/schema.proto](file:///Users/worthington/Documents/dev/blueprint/core/proto/blueprint/v1/schema.proto)

This schema defines:
* `SystemSchema`: The overall diagram setup, title, and structure.
* `SystemNode`: Graph canvas nodes representing people, applications, databases, etc.
* `SystemDependency`: Lines and relations between nodes.
* `C4Level`: Boundary depths (Context, Container, Component, Code).

---

## ⚙️ Compilation & Client Codegen

The schema is automatically integrated and compiled into platform-specific structures:

### 🦀 Rust Static Analyzer (CLI)
The Rust compiler (`prost-build`) automatically processes the `.proto` file when building or running the CLI. You do not need to compile schemas manually for the CLI.

### 🎨 Visual Frontend App (`@blueprint/designer`)
The frontend uses **`buf`** and **`ts-proto`** to generate TypeScript interface definitions and **Zod** validation schemas.

To regenerate these files inside the frontend package:
1. Make sure you have the `protobuf` (`protoc`) toolchain installed (e.g. via `brew install protobuf` or `mise install`).
2. Run the following command from the `/app` directory:
   ```bash
   pnpm --filter @blueprint/designer generate:proto
   ```
This updates the generated files in [app/packages/designer/src/core/generated/](file:///Users/worthington/Documents/dev/blueprint/app/packages/designer/src/core/generated/).
