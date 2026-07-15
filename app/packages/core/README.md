# `@blueprint/core` — Business Domain & Ports Layer

The core package defines the pure, zero-I/O system domain models, verification rules, and interface ports for the Blueprint application suite.

It is completely decoupled from any runtime execution layer (Node, Bun, or Browser) and contains no side effects.

---

## 📂 Key Submodules

### `src/models/`

- **[schema.ts](./src/models/schema.ts):** Zod declarative validation schemas and TypeScript types defining the Blueprint system structure.
- **[ports.ts](./src/models/ports.ts):** Context and storage ports (interfaces) defining how components communicate across boundaries.

### `src/rules/`

- **[graph.ts](./src/rules/graph.ts):** Graph traversal logic, parent-child component rendering support, and circular dependency validation rules.
- **[path.ts](./src/rules/path.ts):** Normalized path utilities and relative boundary validations.
- **[slug.ts](./src/rules/slug.ts):** Pure functions to slugify and validate system workspace names.

---

## 🧪 Testing

To run the core package unit tests:

```bash
pnpm --filter @blueprint/core test
```
