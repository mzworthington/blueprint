# Agent guidance

Lifecycle agents, skills, and SOPs live in `~/.agents` (user-global), not in this repo.

Phase handover artifacts: `~/.agents/handover/blueprint/`

Invoke phase work via skills such as `agent-orchestrator`, `agent-spec`, `agent-tdd`, `agent-adapter`, `agent-security`, `agent-arch-drift`, and `agent-telemetry`.

## Blueprint domain conventions

- **Canonical format:** YAML `SystemSchema` files linked by `entityRef` — not Mermaid. Mermaid is a derived export (`serializeSchemaToMermaid` in `@blueprint/core`).
- **Import direction:** External diagrams enter via **import wizards** that parse into `SystemSchema`, preview merge conflicts, and apply only user-approved changes. Do not make export-only views (e.g. Code Viewer Mermaid tab) editable.
- **Populated workspaces:** Prefer **merge-into-active-diagram** with conflict preview over wholesale file replacement. Disk writes go through the existing DiffMenu commit flow.

## TDD mandate

1. **Red:** Write failing unit tests in `@blueprint/core` for pure domain logic (parsers, merge plans) before implementation.
2. **Green:** Minimal implementation to pass tests.
3. **Refactor:** Only after green; keep parsers and merge logic in core, UI in designer adapters.

Core import modules: `app/packages/core/src/rules/mermaidImport.ts`, `schemaMerge.ts`. Terraform parsing: `terraformImport.ts` (CLI only).
