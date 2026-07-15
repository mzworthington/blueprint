# Canvas & workspace

The designer is a local-first C4 canvas. Diagrams are views over a strict schema — edit either side and the other stays in sync.

![Expanded panels](../screenshots/1-panels-expanded.png)

## Layout

- **Canvas** — React Flow diagram of systems, containers, and components
- **Left / right panels** — catalog, identity, properties, forensics, connections
- **Code viewer** — YAML / JSON / Mermaid of the active schema
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

## Tests & risk heatmap

Under **Workspace display** in the properties panel (visible with or without a node selected):

- **Show Test Components** — reveal nodes marked `isTest` (hidden by default)
- **Risk Heatmap** — tint nodes by `hotspotScore` (see [Git forensics](./forensics.md))

## Next

- [CLI analysis](./cli.md) — how diagrams get generated
- [Interface tour & journeys](../journeys.md) — E2E-oriented walkthrough
