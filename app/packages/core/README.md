# `@blueprint/core` — Business Domain Layer

Shared, pure domain models and rules for Blueprint. No I/O adapters — browser and CLI depend on this package for one contract.

---

## Key Submodules

### `src/models/`

- **[schema.ts](./src/models/schema.ts):** TypeScript types for diagrams (`SystemSchema`, nodes, dependencies) and the `EntityRef` helpers.

### `src/lib/`

- **[slug.ts](./src/lib/slug.ts):** Canonical `slugify` used by designer and CLI.
- **[entityRef.ts](./src/lib/entityRef.ts):** Workspace entity-ref resolution helpers.

### `src/rules/`

- **[graph.ts](./src/rules/graph.ts):** Zod schema contracts, cycle validation, YAML/JSON parse & serialize, Mermaid export. `toSystemSchemaJsonSchema()` feeds IDE validation via `schemas/blueprint.schema.json`.
- **[path.ts](./src/rules/path.ts):** Relative path utilities for multi-file blueprints.

---

## JSON Schema for IDEs

```bash
pnpm --filter @blueprint/core generate:schema
# or from app/: pnpm generate:schema
```

Writes `schemas/blueprint.schema.json` plus `schemas/v{n}/` and `schemas/latest/` copies at the repo root. Use `-- --check` in CI and pre-commit to fail if files are stale.

Public URLs (after GitHub Pages deploy):

- https://blueprint.mzworthington.co.uk/schemas/v1/blueprint.schema.json
- https://blueprint.mzworthington.co.uk/schemas/latest/blueprint.schema.json

---

## Testing

```bash
pnpm --filter @blueprint/core test
```
