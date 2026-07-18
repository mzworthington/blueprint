# Canvas & workspace

The designer is a local-first C4 canvas. Diagrams are views over a strict schema — edit either side and the other stays in sync.

![Expanded panels](../screenshots/1-panels-expanded.png)

## Opening a workspace

On bare `/workspace`, a startup chooser asks how to begin:

![Startup chooser](../screenshots/6-startup-chooser.png)

| Option                            | What it does                                                  |
| --------------------------------- | ------------------------------------------------------------- |
| **Load sandbox**                  | Bundled demo diagrams shipped with the app                    |
| **Open workspace from directory** | File System Access — pick a local `blueprints/` folder        |
| **Import Mermaid diagram**        | Reset to an empty canvas, then open the Mermaid import wizard |

Deep links (`/workspace/…`) skip the chooser. You can open a folder, a single YAML file, or Mermaid again anytime from the toolbar **Open** menu.

## Layout

- **Canvas** — React Flow diagram of systems, containers, and components
- **Left / right panels** — catalog, identity, properties, forensics, connections
- **Code viewer** — YAML / JSON / Mermaid of the active schema (Mermaid tab is export-only)
- **Breadcrumbs** — where you are in the hierarchy

Collapse panels for a clean canvas:

![Collapsed panels](../screenshots/2-panels-collapsed.png)

## Selection & properties

Click a node to select it and open the right-hand property panel. Edit name, type, properties, and connection descriptions. External systems render with dashed borders.

When a node carries `forensics` from the CLI, a **Git forensics** section appears (readonly metrics + helper text). See [Git forensics](./forensics.md).

## C4 navigation

- Double-click a node that has a child diagram (`entityRef` match) to zoom in
- Press **Esc** or use breadcrumbs / zoom-out control to go back up

![Container level](../screenshots/3-container-level.png)

![Zoomed components](../screenshots/4-zoomed-in-components.png)

## Canvas ↔ schema sync

- Moving nodes, wiring edges, or editing properties updates the underlying schema
- Editing YAML/JSON in the code viewer redraws the canvas
- Workspaces can load multiple systems from a `blueprints/` folder and switch via the canvas system picker

## Import Mermaid

Bring an external flowchart or C4 Mermaid diagram into the **active** schema — Blueprint parses it to `SystemSchema`, previews the merge, and applies only what you approve.

![Import Mermaid](../screenshots/7-import-mermaid.png)

1. Open **Import Mermaid** (startup chooser or toolbar **Open** menu).
2. Paste Mermaid or upload `.mmd` / `.md`.
3. Review the preview, additions, and any conflicts (keep existing / rename import / overwrite).
4. **Merge into diagram** — draft-only until you commit via Pending Changes. ELK layout runs after a successful merge.

Import is lossy: forensics, rich properties, and styling from Mermaid are not preserved. Do not edit the Code Viewer Mermaid tab expecting round-trip edits.

## External dependencies

Pull entities that already exist elsewhere in the loaded workspace onto the current diagram as **external proxies** (dashed borders). Search by name/`entityRef`, filter by C4 level or type, then **Add selected** or **Sync suggested**.

Wire dependencies to those proxies as usual; at container level the CLI/designer can roll component-level externals up into inter-container edges.

## Node Search & Filtering

Press **Cmd+K** (macOS) or **Ctrl+K** (Windows/Linux) to activate the search bar in the top-right toolbar. Start typing to filter components and systems in the active diagram. Use arrow keys to navigate and **Enter** to focus/select that node on the canvas. Hidden tests/externals (per workspace display) stay out of search results.

## Layout Engines

Blueprint features on-the-fly layout recalculation using three pluggable layout engines:

- **Dagre** (default) — Fast, standard layered directed graph layout
- **ELK** (Eclipse Layout Kernel) — High-quality layouts for complex diagrams
- **d3-hierarchy** — Tree structures (useful for pure nested hierarchies)

Toggle layouts using the layout selector dropdown in the top toolbar. Choosing a layout automatically recalculates positions and updates the underlying YAML coordinates.

## Component Catalog

When no node is selected, or when expanding the properties panel, you can instantiate new architectural nodes on the fly.

- Click on any archetype in the **Component Catalog** (e.g. Actor/Person, Web App, Database, Cache Store, Event Broker, Event, gRPC Service) to spawn it on the canvas.
- Once created, wire it up using React Flow handle connectors and fill in its specifications in the properties panel.

## Draft Changes & Baseline Comparison

As you edit systems and drag nodes, Blueprint keeps your local sandbox workspace isolated:

- All draft changes are tracked locally via a browser IndexedDB layer.
- Click the **Pending Draft Changes** (compare) icon in the top header to see a comprehensive Git-style diff of added, modified, or deleted nodes and dependencies.
- You can **Revert** all draft changes back to the filesystem baseline version, or **Commit** them to write them directly into the target `.yaml` files.

## Schema Validation & Cycle Detection

The top header provides real-time semantic analysis of the workspace structure:

- **Valid:** The schema structure complies with all syntactic guidelines.
- **Cycle Detected:** The system has detected a circular dependency loop. Loop pathways will animate and highlight on the canvas in red to facilitate resolution.

## Workspace display

Under **Workspace display** in the properties panel (visible with or without a node selected):

![Workspace display](../screenshots/8-workspace-display.png)

| Toggle                              | Effect                                                            |
| ----------------------------------- | ----------------------------------------------------------------- |
| **Show Test Components**            | Reveal nodes marked `isTest` (hidden by default)                  |
| **Show Externals**                  | Show or hide external proxy nodes                                 |
| **Show Selected Dependencies Only** | When a node is selected, show only its upstream + downstream deps |

Dependency edges draw an arrow toward the target (`from` → `to`). Selecting a node animates edges connected to it (all visible edges when focus mode is on).
| **Risk Heatmap** | Tint nodes by `hotspotScore` (see [Git forensics](./forensics.md)) |

A summary line shows live counts (`ext · tests · deps`), scoped to the whole diagram or the selected node.

## Offline / PWA

The designer installs as a Progressive Web App. After the first visit, the app shell can load offline so you can keep editing a local workspace; an offline banner appears when the network drops. Docs screenshots and public schema URLs are not required for offline canvas use.

## Next

- [CLI analysis](./cli.md) — how diagrams get generated
- [Design system](./design-system.md) — visual assets & identity sandbox
- [Interface tour & journeys](../journeys.md) — E2E-oriented walkthrough
