# `@blueprint/app` — Visual Systems Architecture Canvas App

This is the front-end web application client for Blueprint. It is built using **Vite**, **React**, **React Flow**, and **Zustand**.

It functions as a local-first, interactive diagramming canvas where designers can compose, navigate, and structure C4 architecture diagrams.

---

## 🎨 Key Features

- **Bi-directional Sync:** Edit diagrams graphically on the canvas, or edit the underlying declarative YAML configuration directly in the side-by-side text code viewer.
- **C4 Architecture Navigation:** Double-click boundary nodes (e.g. system containers) to drill down into components, and press `Escape` to zoom back out to higher-level views.
- **Local-first Sync:** System layouts are persisted dynamically using browser storage or synchronized with local files via file sync adapters.
- **Design System Showcase:** Includes a built-in Design System Showcase page (`/design-system`) demonstrating all atomic component states, buttons, property panel attributes, and visual styles.

---

## 🚀 Running the Web App

### Dev Server

To start the React development server during local development:

```bash
pnpm dev
```

### Production Build

To compile the production assets (placed in `packages/app/dist/`):

```bash
pnpm --filter @blueprint/app build
```

To preview the compiled production build locally:

```bash
pnpm preview
```

---

## 🎭 E2E Testing (Playwright)

We use Playwright for complete browser-level integration testing (verifying panel expansion, URL parameters syncing, and visual C4 navigation zoom-in/out journeys).

To execute the E2E tests:

```bash
pnpm test:e2e
```

When E2E tests are run, they automatically capture and output visual snapshots to the repository root's `screenshots/` folder.

---

## 🧪 Unit Testing

To run the front-end unit test suite (using Vitest + JSDOM):

```bash
pnpm test:app
```
