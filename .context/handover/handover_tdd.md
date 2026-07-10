# TDD / Design Phase Handover (Codebase AST Analyzer Refactoring)

- **Phase:** TDD Design
- **Status:** COMPLETE
- **Next Agent:** Implementation (`adapter-agent.md`)

---

## 1. Domain Ports (Interfaces)

To ensure domain core isolation, we define the following ports in `scripts/analysis/domain/ports.ts`:

### `CodebaseParserPort` (Outbound/Driven Port)
Responsible for parsing the files matching a codebase pattern into pure representation structs.
```typescript
import type { ParsedSourceFile } from './types';

export interface CodebaseParserPort {
  parseSourceFiles(globPattern: string): Promise<ParsedSourceFile[]>;
}
```

### `LayoutPort` (Outbound/Driven Port)
Responsible for computing graph layouts for nodes and dependencies.
```typescript
import type { SystemNode, SystemDependency } from '../../../src/domain/schema';

export interface LayoutPort {
  computeLayout(nodes: SystemNode[], dependencies: SystemDependency[]): Promise<SystemNode[]>;
}
```

### `AnalysisFileSystemPort` (Outbound/Driven Port)
Responsible for all filesystem input/output operations, resolving paths, and retrieving package configurations.
```typescript
export interface AnalysisFileSystemPort {
  writeSchema(filePath: string, yamlContent: string): Promise<void>;
  exists(filePath: string): boolean;
  mkdir(dirPath: string): void;
  unlink(filePath: string): void;
  readPackageJsonName(packageJsonPath: string): string | null;
  getRelativePath(from: string, to: string): string;
  getAbsolutePath(...parts: string[]): string;
  getCurrentWorkingDirectory(): string;
}
```

---

## 2. Test Strategy Plan

- **Pure In-Memory Testing:** We will write all unit tests using mock implementations for the ports.
- **Red-Green-Refactor Flow:**
  1. Write failing tests in `scripts/analysis/domain/analyzer.test.ts` verifying classification heuristics, mapping logic, and layout calculations.
  2. Implement the domain service `scripts/analysis/domain/analyzer.ts` to make tests pass.
  3. Refactor logic to clean up functions.
- **Mock Interfaces structure:**
  - Mock Parser: returns configurable list of mock parsed files.
  - Mock Layout: returns nodes with coordinates.
  - Mock File System: tracks write, exist, delete, and read operations in-memory.
