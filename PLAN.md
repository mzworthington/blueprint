# Hierarchy model (completed)

Architecture diagrams are linked by **entityRef FQNs**, not manifests or `c4Ref`.

- A child diagram's `schema.entityRef` equals a node `entityRef` on its parent diagram.
- Nodes and schema identity must match `ENTITY_REF_PATTERN` (no `../file.yaml` paths).
- Legacy YAML `id` is still accepted as an alias for `entityRef` when it is already a valid FQN.
- Navigate down by double-click / zoom; navigate up with breadcrumbs or `Escape`.
