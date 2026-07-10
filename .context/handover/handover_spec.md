# Specification Phase Handover (Tree-sitter Integration)

- **Phase:** BDD Specification Intake
- **Status:** COMPLETE
- **Next Agent:** TDD / Design (`tdd-agent.md`)

---

## 1. Domain Glossary

* **Concrete Syntax Tree (CST):** A full syntax tree containing all tokens (including whitespace, semicolons, brackets) parsed from a source file, produced by Tree-sitter.
* **Tree-sitter Query (S-expression):** A pattern matching DSL used to query AST/CST nodes (e.g. finding import declarations or new instantiations).
* **WASM Grammars:** Pre-compiled WebAssembly binaries containing the syntax rules for specific programming languages (e.g. typescript, tsx, python, javascript).

---

## 2. Gherkin Acceptance Scenarios

### Feature: Tree-sitter Codebase Parsing

  **Scenario: Parse imports from TypeScript file using Tree-sitter**
    Given a TypeScript source file containing:
      """typescript
      import { useState } from 'react';
      import graph from '../domain/graph';
      """
    When the Tree-sitter parser adapter parses the file
    Then the parsed imports list should contain:
      - `{ moduleSpecifier: 'react' }`
      - `{ moduleSpecifier: '../domain/graph' }`

  **Scenario: Parse class instantiations from TypeScript file using Tree-sitter**
    Given a TypeScript source file containing:
      """typescript
      const db = new PrismaClient();
      const broker = new Kafka();
      """
    When the Tree-sitter parser adapter parses the file
    Then the parsed new expressions list should contain:
      - `{ className: 'PrismaClient' }`
      - `{ className: 'Kafka' }`

  **Scenario: Parse call expressions from TypeScript file using Tree-sitter**
    Given a TypeScript source file containing:
      """typescript
      fetch('https://api.com/users');
      axios.get('/endpoint');
      """
    When the Tree-sitter parser adapter parses the file
    Then the parsed call expressions list should contain:
      - `'fetch'`
      - `'axios.get'` (or matches for 'axios')

---

## 3. Technical Constraints & Context

1. **Pure WASM Execution:** All Tree-sitter grammars must load from precompiled WASM binaries provided by `tree-sitter-wasms`. No native compiler runtime dependencies should be introduced.
2. **Parser Port Adherence:** The new `TreeSitterParserAdapter` must implement the existing `CodebaseParserPort` cleanly, so it can be swapped or combined with `TsMorphParserAdapter` without changes to the `CodebaseAnalyzer` business logic.
