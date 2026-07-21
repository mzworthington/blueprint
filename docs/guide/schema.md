# Blueprint schema contract

This page is for teams integrating with Blueprint YAML — whether you author diagrams by hand, generate them from the CLI, or consume them in another tool. It explains the **shared contract** (JSON Schema) and how we name and link parts of an architecture using **`entityRef`**.

---

## What the contract guarantees

Every blueprint file describes one view of your systems architecture: who appears on the diagram, how they relate, and (optionally) layout and forensics. The contract ensures that:

- The same file loads in the designer, passes CI checks, and round-trips through import/export.
- External tools can validate YAML without running Blueprint — by pointing at a public schema URL.
- Breaking changes are rare and versioned; non-breaking additions ship on the `latest` channel.

Under the hood, rules are defined once in `@blueprint/core` and published as JSON Schema for editors and integrators.

---

## Entity references (`entityRef`)

### Purpose

An **entity reference** is the stable identity of something on your architecture map — a product landscape, a service boundary, a deployable unit, or a code module. Display names (`name` fields) are for people; **`entityRef` is for linking**.

We use it to:

- **Connect diagrams in a hierarchy** — zoom from a context map into a container map, then into components. A child diagram’s identity matches the parent node you double-clicked.
- **Express dependencies across boundaries** — “Service A calls Service B” uses each party’s `entityRef`, even when they live in different YAML files.
- **Align generated and hand-edited views** — the CLI, IaC import, and the canvas all resolve to the same identifiers so merges and diffs stay meaningful.
- **Anchor forensics and ownership** — git and complexity signals roll up along the same tree the business already uses for C4 views.

Think of `entityRef` as a **breadcrumb trail** from the widest scope down to the finest grain you model, not as a file path or repository folder (though the CLI often infers sensible values from repo layout).

### How we craft them

References are built from **short, URL-safe segments** joined by `/`:

- Human labels are **slugified**: lower case, spaces → hyphens, punctuation removed (e.g. `App Service` → `app-service`).
- Each extra `/` means **one level deeper** in the C4 zoom model.

| Segments | Typical scope       | Example                         | What it represents                                        |
| -------- | ------------------- | ------------------------------- | --------------------------------------------------------- |
| 1        | Context (landscape) | `blueprint`                     | Whole product portfolio or programme map                  |
| 2        | Container           | `blueprint/app`                 | A major system or bounded capability inside the landscape |
| 3        | Component           | `blueprint/app/designer`        | A deployable or logical part inside that system           |
| 4        | Code (optional)     | `blueprint/app/designer/canvas` | Finer module or package when you model at code level      |

**Diagram files** carry their scope in `metaData.entityRef` (and a friendly `metaData.name`). **Nodes** on the canvas each have their own `entityRef`. **Dependencies** list `from` and `to` entity references.

When the CLI scans a monorepo, it proposes references from product IDs, package names, and folder structure. You can adjust slugs in YAML; once committed, treat them as **integration IDs** — renaming a display label should not require renaming refs unless you intentionally reorganise the map.

### Linking parent and child diagrams

No separate “parent pointer” file is required. The rule is simple:

> A nested diagram’s `metaData.entityRef` **equals** the `entityRef` of the node you drill into on the parent diagram.

Example:

- Context diagram node: `entityRef: blueprint/app`, name “App System”.
- Container diagram file: `metaData.entityRef: blueprint/app`, name “App Containers”.
- Double-clicking that node opens the child diagram because the identities match.

The same pattern applies from container → component diagrams.

### Practical guidance for integrators

- Prefer **stable, business-meaningful slugs** (product, domain, service) over transient repo folder names when authoring by hand.
- Use **fully qualified** references (`a/b/c`) in dependencies and externals so links work across files in a workspace.
- Pin the **schema URL** (below) in consumer pipelines so validation behaviour does not shift unexpectedly.
- When merging CLI output with manual edits, conflicts on the same `entityRef` are the signal that two sources disagree about one real-world entity.

---

## Public schema URLs

| Channel                            | URL                                                                          | Use when                                               |
| ---------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------ |
| **Versioned (preferred for pins)** | `https://blueprint.mzworthington.co.uk/schemas/v3/blueprint.schema.json`     | External repos that should not break on contract bumps |
| **Latest**                         | `https://blueprint.mzworthington.co.uk/schemas/latest/blueprint.schema.json` | Tracking the schema on `main`                          |

Locally (and on this docs site), the same paths are available under the app origin:

- `/schemas/v3/blueprint.schema.json`
- `/schemas/latest/blueprint.schema.json`

Regenerate from source with `pnpm generate:schema`. Pre-commit and CI fail if the checked-in files are stale. Bump the major schema version only when the wire format breaks; `latest` always tracks `main`.

---

## Pointing an editor at the schema

Each blueprint file sets `version` to the public schema URL. You can also add an IDE directive:

```yaml
# yaml-language-server: $schema=https://blueprint.mzworthington.co.uk/schemas/latest/blueprint.schema.json
version: https://blueprint.mzworthington.co.uk/schemas/v3/blueprint.schema.json
level: component
metaData:
  entityRef: blueprint/app/api
  name: Api Components
nodes:
  - entityRef: blueprint/app/api/gateway
    type: rest-api
    name: API Gateway
dependencies:
  - from: blueprint/app/api/gateway
    to: blueprint/app/orders
    type: direct-call
```

In this repo, workspace settings map `blueprints/**/*.yaml` to the local schema for autocomplete. Wire-format details: [Setup — YAML format (v3)](../setup.md#yaml-format-v3).

---

## Live schema (latest)

The block below fetches the **latest** schema served with this app and pretty-prints it. Refresh the page after a schema regenerate to see updates in local `pnpm dev`.

```live-schema
latest
```
