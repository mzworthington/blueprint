# Git forensics

Forensics enrich generated architecture nodes with **structural** (AST complexity, LOC) and **behavioral** (churn, authors, temporal coupling) signals from git history.

Git analysis is **on by default**. Pass `--no-git` to skip; set window with `--git-since=90` (days).

## What is stored

On component nodes (joined by `properties.filepath`):

| Field                              | Meaning                                            |
| ---------------------------------- | -------------------------------------------------- |
| `complexity`                       | Cyclomatic complexity from the AST                 |
| `loc` / `sloc`                     | Lines / source lines of code                       |
| `churn`                            | Edits in the lookback window                       |
| `authorCount` / `topAuthorPercent` | Ownership concentration                            |
| `hotspotScore`                     | Relative risk from complexity × churn              |
| `classifications`                  | e.g. `hotspot`, `knowledge-silo`                   |
| `coupledFiles`                     | Temporally coupled peers (scores + shared commits) |
| `sinceDays`                        | Lookback window used for this run                  |

Containers and context systems get **rollups** (`fileCount`, `hotspotCount`, `knowledgeSiloCount`, max/sum metrics, and the same `sinceDays`).

Example YAML fragment:

```yaml
forensics:
  complexity: 22
  churn: 8
  hotspotScore: 0.9
  sinceDays: 90
  classifications:
    - hotspot
  coupledFiles:
    - path: src/other.ts
      score: 0.8
      sharedCommits: 6
```

## In the designer

Open **`/forensics`** (header: Forensics) for a ranked “worst offenders” list across loaded blueprints — components or containers, filterable by hotspots/silos. Click a row to open that node on the canvas.

Select an enriched node → **Git forensics** in the property panel shows metrics with helper text and a **lookback** value (e.g. `90d`).

Concern badges on the canvas:

- **HOT** — hotspot
- **SILO** — knowledge silo

### Risk heatmap (opt-in)

Heatmap is **off by default** and is a **workspace display** setting (not per-node):

1. Open the properties panel → **Workspace display** → toggle **Risk Heatmap**
2. Available with or without a node selected
3. Nodes tint by `hotspotScore` (red intensity); MiniMap uses the same scale
4. YAML is unchanged — heat is display-only

### Coupling focus (opt-in)

Coupling focus is **off by default**. With a node selected that has on-canvas coupled peers:

1. Toggle coupling in the forensics section
2. The canvas shows **only** the selected node and its coupled peers
3. Schema dependency links are hidden; amber dashed coupling edges remain
4. Peers get a **COUPLED** highlight

Peers resolve via `coupledFiles[].path` ↔ `properties.filepath` on the current diagram.

## Config

Optional `forensics` section in `blueprint.config.json` (or yaml) for thresholds: `hotspotThreshold`, `complexityThreshold`, `minSharedCommits`, `couplingThreshold`, `minChurnForComplexity`, `sinceDays`.

## Next

- [Canvas & workspace](./canvas.md)
- [CLI analysis](./cli.md)
