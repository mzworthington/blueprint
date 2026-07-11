# System Architecture & Security

This document covers the high-level system architecture, dependency flow, module responsibilities, and validation boundaries of Blueprint.

---

## 🏛️ Web Application Architecture Diagram

The design of Blueprint's visual client adheres to Hexagonal Architecture, where driving adapters (UI views) interact with a central Zustand store, which delegates complex operations to a pure domain layer and communicates out-of-process via decoupled ports:

```mermaid
graph TD
    subgraph Driving [Driving UI Adapters]
        Canvas[Canvas.tsx - React Flow]
        CodeViewer[CodeViewer.tsx - Tabs/Editor]
        PropertyPanel[PropertyPanel.tsx - Sidebar]
    end

    subgraph Store [Zustand Store - State Sync]
        StoreEntry[store.ts - Composition Root]
        UiState[uiState.ts - Layout & Panels]
        DiagramState[diagramState.ts - Canvas & Navigation]
        IoState[ioState.ts - File Systems Sync]
        StoreEntry --> UiState
        StoreEntry --> DiagramState
        StoreEntry --> IoState
    end

    subgraph Core [Application Core]
        DomainGraph[graph.ts - Domain Core Logic]
        DomainPath[path.ts - Path Navigation]
    end

    subgraph Ports [Outbound Ports]
        FSPort[FileSystemPort]
        LoggerPort[LoggerPort]
    end

    subgraph Driven [Driven Infrastructure Adapters]
        FSAdapter[BrowserFileSystemAdapter]
        LogAdapter[ConsoleLoggerAdapter]
    end

    Canvas --> Store
    CodeViewer --> Store
    PropertyPanel --> Store
    DiagramState --> DomainGraph
    DiagramState --> DomainPath
    IoState --> DomainPath
    IoState --> FSPort
    IoState --> LoggerPort
    FSPort --> FSAdapter
    LoggerPort --> LogAdapter
```

---

## 💻 CLI AST Analyzer Architecture Diagram

The CLI product is structured similarly using a decoupled hexagonal architecture to process local codebases, calculate coordinates, and output YAML blueprint files:

```mermaid
graph TD
    subgraph CLI_Drivers [Driving CLI Adapters]
        CliEntry[blueprint.ts - CLI Interactive Entry]
        BunBinary[dist/blueprint-cli - Standalone Binary]
    end

    subgraph CLI_Core [CLI Core]
        Analyzer[analyzer.ts - CodebaseAnalyzer]
    end

    subgraph CLI_Ports [CLI Outbound Ports]
        ParserPort[CodebaseParserPort]
        LayoutPort[LayoutPort]
        CliFsPort[AnalysisFileSystemPort]
        CliLogPort[LoggerPort]
    end

    subgraph CLI_Adapters [Driven CLI Adapters]
        TsMorph[tsMorphParser.ts - TsMorphParserAdapter]
        TreeSitter[treeSitterParser.ts - TreeSitterParserAdapter]
        Dagre[dagreLayout.ts - DagreLayoutAdapter]
        NodeFS[nodeFileSystem.ts - NodeFileSystemAdapter]
        ConsoleLog[consoleLogger.ts - ConsoleLogger]
    end

    subgraph Schema_Types [Shared Domain Definition]
        Schema[schema.ts - Core Schema & Types]
    end

    CliEntry --> Analyzer
    BunBinary --> Analyzer
    Analyzer --> CLI_Ports

    ParserPort --> TsMorph
    ParserPort --> TreeSitter
    LayoutPort --> Dagre
    CliFsPort --> NodeFS
    CliLogPort --> ConsoleLog

    TsMorph -.-> Schema
    TreeSitter -.-> Schema
    Analyzer -.-> Schema

    NodeFS --> |Writes schema YAML| BlueprintsDir[blueprints/*.yaml]
```

### 🤝 Web-to-CLI Filesystem Bridge

The two systems are bridged via the filesystem:

1. The **CLI AST Analyzer** outputs computed diagram schemas as static YAML files into the local `blueprints/` folder.
2. The **Web Application** requests/watches this `blueprints/` directory using the Browser File System Access API (via `BrowserFileSystemAdapter`) to live-render the layouts.

---

## 🧱 Architectural Components

### 1. Pure Domain Layer (`src/domain/`)

The core domain contains business validation logic and has **zero dependencies** on external UI frameworks (React, React Flow, Zustand):

- [schema.ts](../src/domain/schema.ts): Houses types representing nodes, dependencies, properties, and verification results.
- [graph.ts](../src/domain/graph.ts): Implements validation, Zod parsers, cycle detection routines, and Mermaid.js flowchart exports.
- [path.ts](../src/domain/path.ts): Handles filesystem-agnostic relative C4 path resolution and closest workspace manifest matching.

### 2. Outbound Ports (`src/domain/ports.ts`)

Decoupled interfaces defining boundary operations for the core system:

- `FileSystemPort`: Manages saving and loading of system configuration files.
- `LoggerPort`: Manages structured trace logging.

### 3. Driven Adapters (`src/adapters/`)

Implementations of outbound ports binding visual tools to infrastructure resources:

- `BrowserFileSystemAdapter`: Interacts with the file system.
- `ConsoleLoggerAdapter`: Outputs structured timestamps and trace contexts to the browser console.
- `useBlueprintStore` (Zustand): Synchronizes component values, validates changes, and hooks up ports to the UI. Composed of modular states:
  - `UiState`: Manages sidebar and panel toggles.
  - `DiagramState`: Manages canvas visual nodes/edges and zoom transitions.
  - `IoState`: Manages directory and file writing/reading interfaces.
- `layoutUtils.ts`: Handles stateless React Flow node/edge coordinate converters and handle styling anchors.
- `defaultData.ts`: Eagerly compiles blueprints glob matching files at build time.

### 4. CLI AST Analyzer Core & Adapters (`cli/blueprint.ts`, `cli/analysis/`)

- `blueprint.ts`: CLI adapter entry point. Handles interactive prompts (`@clack/prompts`) or headless CLI flags and activates the analyzer.
- `CodebaseAnalyzer`: Central orchestrator of the codebase analyzer pipeline.
- `CodebaseParserPort`: Outbound port specifying parsing signatures, implemented by `TsMorphParserAdapter` and `TreeSitterParserAdapter`.
- `LayoutPort`: Outbound port specifying layout coordinate generators, implemented by `DagreLayoutAdapter`.
- `AnalysisFileSystemPort`: Outbound port for filesystem integration, implemented by `NodeFileSystemAdapter`.

---

## 🔒 Security & Validation Architecture

To enforce a zero-trust model at boundaries, Blueprint employs a two-tier validation approach:

### 1. Syntactic & Sanitization Schema Check (Zod)

When YAML/JSON code is loaded, the parser validates it against a strict Zod contract:

- Node IDs are validated against `/^[a-zA-Z0-9_-]+$/` to ensure they are alphanumeric, preventing XSS, space errors, or script injection vectors.
- Node type strings must match valid domain enums (e.g. `rest-api`, `grpc-service`, `event-broker`, `relational-database`).

### 2. Structural & Architectural Dependency Check (DFS)

Once syntax is confirmed, the graph validator evaluates constraints:

- Transitive circular dependency loops are flagged (`gateway` ➔ `service-a` ➔ `service-b` ➔ `gateway`).
- Active cyclic paths are visually highlighted on the UI canvas by blinking/animating corresponding edge routes.
