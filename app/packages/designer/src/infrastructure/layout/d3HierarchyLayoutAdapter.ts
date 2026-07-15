import { hierarchy, tree } from 'd3-hierarchy';
import type {
  LayoutEdgeInput,
  LayoutEnginePort,
  LayoutNodeInput,
  LayoutPosition,
} from '../../core';
import { D3_FOREST_GAP, LAYOUT_ORIGIN } from './constants';

type TreeDatum = { id: string; children?: TreeDatum[] };

/**
 * d3-hierarchy tree adapter. Cycles / multi-parent edges are truncated:
 * first edge to an unseen child wins (stratify-style forest).
 */
export class D3HierarchyLayoutAdapter implements LayoutEnginePort {
  async computeLayout(
    nodes: LayoutNodeInput[],
    edges: LayoutEdgeInput[]
  ): Promise<Map<string, LayoutPosition>> {
    if (nodes.length === 0) return new Map();

    const sizeById = new Map(nodes.map(n => [n.id, n]));
    const forests = buildForests(nodes, edges);
    const positions = new Map<string, LayoutPosition>();

    let forestOffsetY: number = LAYOUT_ORIGIN.y;

    for (const root of forests) {
      const rootHierarchy = hierarchy(root);
      const nodeW = sizeById.get(root.id)?.width ?? 280;
      const nodeH = sizeById.get(root.id)?.height ?? 120;

      const layout = tree<TreeDatum>()
        .nodeSize([nodeW + 80, nodeH + 160])
        .separation(() => 1);

      layout(rootHierarchy);

      let minX = Infinity;
      let minY = Infinity;
      rootHierarchy.each(d => {
        minX = Math.min(minX, d.x ?? 0);
        minY = Math.min(minY, d.y ?? 0);
      });

      rootHierarchy.each(d => {
        positions.set(d.data.id, {
          x: Math.round((d.x ?? 0) - minX + LAYOUT_ORIGIN.x),
          y: Math.round((d.y ?? 0) - minY + forestOffsetY),
        });
      });

      let maxY = forestOffsetY;
      for (const pos of positions.values()) {
        maxY = Math.max(maxY, pos.y + nodeH);
      }
      forestOffsetY = maxY + D3_FOREST_GAP;
    }

    for (const node of nodes) {
      if (!positions.has(node.id)) {
        positions.set(node.id, { x: LAYOUT_ORIGIN.x, y: forestOffsetY });
        forestOffsetY += D3_FOREST_GAP;
      }
    }

    return positions;
  }
}

function buildForests(nodes: LayoutNodeInput[], edges: LayoutEdgeInput[]): TreeDatum[] {
  const children = new Map<string, string[]>();
  const hasParent = new Set<string>();
  const claimedChild = new Set<string>();

  for (const edge of [...edges].sort(
    (a, b) => a.source.localeCompare(b.source) || a.target.localeCompare(b.target)
  )) {
    if (claimedChild.has(edge.target) || edge.source === edge.target) continue;
    claimedChild.add(edge.target);
    hasParent.add(edge.target);
    const list = children.get(edge.source) ?? [];
    list.push(edge.target);
    children.set(edge.source, list);
  }

  const toTree = (id: string, ancestors: Set<string>): TreeDatum => {
    if (ancestors.has(id)) return { id };
    const nextAncestors = new Set(ancestors);
    nextAncestors.add(id);
    const kids = (children.get(id) ?? []).map(cid => toTree(cid, nextAncestors));
    return kids.length > 0 ? { id, children: kids } : { id };
  };

  const roots = [...nodes]
    .map(n => n.id)
    .filter(id => !hasParent.has(id))
    .sort((a, b) => a.localeCompare(b));

  if (roots.length === 0) {
    const fallback = [...nodes].map(n => n.id).sort((a, b) => a.localeCompare(b))[0];
    return fallback ? [toTree(fallback, new Set())] : [];
  }

  return roots.map(id => toTree(id, new Set()));
}
