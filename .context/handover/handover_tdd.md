# TDD / Design Phase Handover (Tree-sitter Integration)

- **Phase:** TDD Design
- **Status:** COMPLETE
- **Next Agent:** Implementation (`adapter-agent.md`)

---

## 1. Adapter Design & Query Structure

We will implement `TreeSitterParserAdapter` under `scripts/analysis/adapters/treeSitterParser.ts`. It will implement `CodebaseParserPort` exactly like `TsMorphParserAdapter` does.

### Tree-sitter S-expression queries:
We will configure Tree-sitter query patterns to search the parsed Concrete Syntax Tree:

1. **Imports:**
   - TS/JS: Match `(import_statement (literal) @import_spec)` and `(import_require_clause (string) @import_spec)`.
   - Python: Match `(import_statement) @import` and `(import_from_statement) @import`.
2. **New Expressions (Instantiation):**
   - TS/JS: Match `(new_expression constructor: (_) @class_name)`.
   - Python: Match `(call function: (identifier) @class_name)` where the identifier begins with a capital letter (standard class naming heuristic).
3. **Call Expressions:**
   - Match `(call_expression function: (_) @call_name)` or identifiers representing `fetch` or `axios` calls.

---

## 2. Test Strategy Plan

- **Adapter Tests (`treeSitterParser.test.ts`):**
  - We will write unit tests that write simple TS, JS, and Python files to a temporary directory in `src/` or verify snippets directly using the parser adapter.
  - Test cases will cover:
    - Parsing imports, instantiations, and fetch/axios calls for TypeScript files.
    - Parsing imports, instantiations, and calls for Python files.
    - Ensuring empty results are handled gracefully for unsupported languages or invalid syntax.
