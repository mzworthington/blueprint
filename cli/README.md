# Experimental Rust CLI (`/cli`) — UNMAINTAINED

> **Do not use for product work.** Prefer [`app/packages/cli`](../app/packages/cli/README.md).
>
> `cargo build` **fails by default** with a redirect message. This tree is not in CI, needs restored `core/proto/` schemas that no longer exist, and is not the scanner source of truth.

```bash
# Day-to-day / CI / releases:
cd app && pnpm dev:cli
```

---

## Why it still exists

Historical AST scanner rewrite (Clap, Tree-Sitter, Prost). Protocol Buffers were replaced by Zod in `@blueprint/core`.

## Force-building (maintainers only)

Only if you restore protobufs and accept that this is experimental:

```bash
BLUEPRINT_RUST_ALLOW_BUILD=1 cargo build
```

Those steps are intentionally undocumented until someone owns this crate again.
