# Experimental Rust CLI (`/cli`)

> **Status: unmaintained.** Prefer the production TypeScript CLI at [`app/packages/cli`](../app/packages/cli/README.md).
>
> This tree is kept for historical / experimental work. It is **not** run in CI, requires restored Protocol Buffer schemas that are no longer in the repo, and may not build.

---

## Why it exists

An earlier rewrite of the AST scanner in Rust (Clap, Tree-Sitter, Prost). Schema codegen previously depended on `core/proto/`, which has been removed in favor of TypeScript + Zod in `@blueprint/core`.

## If you still want to experiment

You will need to restore protobuf definitions and Prost generation before `cargo build` / `cargo test` can succeed. Those steps are intentionally undocumented until someone owns them again.

For day-to-day scanning and CI:

```bash
cd app
pnpm dev:cli
```
