# Design System & Sandbox

Blueprint is built on a rich, custom design language specifically tuned for professional architecture diagrams. The application exposes these visual building blocks directly under `/design-system` (header link: **Design system**).

---

## 🎨 Identity & Drafting Grid

The design system is themed around a "drafting grid" to evoke a classic architectural blueprint feel:

- **Drafting Grid:** Structural elements snap onto a grid with major guidelines at `100px` and micro-subdivisions at `20px`.
- **Electric Cyan Glow:** Highlights active links, inputs, and database schemas with a glowing, drop-shadowed neon cyan (`#00f0ff`) theme to emulate illuminated terminal displays.
- **Monochrome Contrast:** The background relies on a deep space navy blue (`#040914`), with typography set in high-contrast crisp white or subdued slate-gray.

---

## 🪙 Design Tokens

The system exports variables for consistent CSS implementation across packages:

- **Colors:** Tailored HSL color mapping for states (success/emerald, warning/amber, danger/rose, brand/cyan-blue).
- **Typography:** Uses monospaced coding fonts (such as JetBrains Mono or Fira Code) for coordinates, entities, code viewer, and headers.
- **Micro-Animations:** Fluid transitions for sidebar collapses, hover state glow increases, and active node selection paths.

---

## 📦 Vector Asset Pack

For developers integrating Blueprint assets or hacking on external adapters, the design system page provides direct downloads of:

- **Favicon Vector (`favicon.svg`):** The default glowing rect-circle brand badge.
- **Grid Pattern (`grid.svg`):** The lightweight background blueprint pattern.

---

## 🛠️ Interactive Sandbox

The design system page features a fully functional **Interactive Sandbox** where you can experiment with rendering nodes before adding them to schemas:

1. Select an archetype type (e.g. `web-app`, `database`, `microservice`, `person`).
2. Input a custom component name and description.
3. Toggle states (e.g. `healthy`, `warning`, `error`) to see live badge animations and color modifications.
4. Export the resulting model element YAML fragment directly from the sandbox.

---

## Next

- [Interface tour & journeys](../journeys.md) — visual walkthroughs
- [Setup & local development](../setup.md) — modify the code
