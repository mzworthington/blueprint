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

Select an enriched node → **Git forensics** in the property panel shows metrics with helper text and a **lookback** value (e.g. `90d`).

Concern badges on the canvas:

- **HOT** — hotspot
- **SILO** — knowledge silo

### Coupling overlay (opt-in)

Coupling edges are **off by default** (too busy globally). With a node selected that has on-canvas coupled peers:

1. Toggle coupling in the forensics section
2. Amber dashed edges appear to peers; peers get a **COUPLED** highlight

Peers resolve via `coupledFiles[].path` ↔ `properties.filepath` on the current diagram.

## Config

Optional `forensics` section in `blueprint.config.json` (or yaml) for thresholds: `hotspotThreshold`, `complexityThreshold`, `minSharedCommits`, `couplingThreshold`, `minChurnForComplexity`, `sinceDays`.

## Next

- [Canvas & workspace](./canvas.md)
- [CLI analysis](./cli.md)
