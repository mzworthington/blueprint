# Interface Tour & E2E Journeys

This page walks you through the core visual components and typical end-to-end (E2E) user journeys in Blueprint.

---

## 📸 Visual Tour

### 1. Expanded Workspace Properties & Catalog

Shows the default view with sidebar panels expanded, exposing properties and the active catalog components.

![Expanded Workspace Properties & Catalog](./screenshots/1-panels-expanded.png)

### 2. Clean Diagram Canvas View

Collapses the panels to present a distraction-free, maximized view of the diagram canvas.

![Clean Diagram Canvas View](./screenshots/2-panels-collapsed.png)

### 3. Hierarchical C4 Container Level

Visualizes container relationships and boundaries at the C4 Container level of abstraction.

![Hierarchical C4 Container Level](./screenshots/3-container-level.png)

### 4. Recursive Zoom-In Components

Allows designers to inspect internal details of components by double-clicking nodes that reference a sub-diagram (`c4Ref`).

![Recursive Zoom-In Components](./screenshots/4-zoomed-in-components.png)

---

## 🏃 Key User Journeys

### 1. Synchronizing Canvas & Schema

- **Visual-to-Text:** Select nodes or drag/wire connections on the canvas. The underlying YAML/JSON schema auto-updates in real time.
- **Text-to-Visual:** Open the built-in editor, paste or edit system schemas, and watch the visual canvas immediately redraw.

### 2. Recursive Level Navigation

- Double-click on components configured with a sub-diagram reference (`c4Ref`) to zoom down into container/component levels.
- Navigate back up using the interactive Breadcrumbs bar at the top, or press `Escape` / `Backspace`.

### 3. Multi-File Workspace Swaps

- The workspace loads all declarative system schemas located under the local `blueprints/` folder.
- Use the glassmorphic system switcher dropdown at the top-left to toggle between different system layouts instantly.
