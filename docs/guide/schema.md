# JSON Schema

Blueprint YAML is validated against a shared **JSON Schema** exported from the Zod contracts in `@blueprint/core`. That file is what IDEs and `yaml-language-server` use for autocomplete and diagnostics.

## Why it exists

- **Single contract:** The same rules that gate canvas load / CLI write also drive editor hints.
- **Public URLs:** After deploy, the schema is served as static JSON (not the SPA shell), so external repos can pin it without vendoring.
- **Channels:** Prefer a versioned URL when you want a stable contract; use `latest` when you want to track `main`.

## Public URLs

| Channel                            | URL                                                                          | Use when                                               |
| ---------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------ |
| **Versioned (preferred for pins)** | `https://blueprint.mzworthington.co.uk/schemas/v3/blueprint.schema.json`     | External repos that should not break on contract bumps |
| **Latest**                         | `https://blueprint.mzworthington.co.uk/schemas/latest/blueprint.schema.json` | Tracking the schema on `main`                          |

Locally (and on this docs site), the same paths are available under the app origin:

- `/schemas/v3/blueprint.schema.json`
- `/schemas/latest/blueprint.schema.json`

Regenerate from Zod with `pnpm generate:schema`. Pre-commit and CI fail if the checked-in files are stale. Bump `SYSTEM_SCHEMA_MAJOR_VERSION` in `@blueprint/core` only when the wire format breaks; `latest` always tracks main.

## Pointing an editor at the schema

Each blueprint file sets `version` to the public schema URL. You can also add an IDE directive:

```yaml
# yaml-language-server: $schema=https://blueprint.mzworthington.co.uk/schemas/latest/blueprint.schema.json
version: https://blueprint.mzworthington.co.uk/schemas/v3/blueprint.schema.json
level: component
metaData:
  entityRef: example/app/api
  name: Api Components
nodes: []
dependencies: []
```

In this repo, workspace settings map `blueprints/**/*.yaml` to the local schema for autocomplete. Wire-format details: [Setup — YAML format (v3)](../setup.md#yaml-format-v3).

## Live schema (latest)

The block below fetches the **latest** schema served with this app and pretty-prints it. Refresh the page after a schema regenerate to see updates in local `pnpm dev`.

```live-schema
latest
```
