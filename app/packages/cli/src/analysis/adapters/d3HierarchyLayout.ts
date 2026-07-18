import { hierarchy, tree } from 'd3-hierarchy';
import type { LayoutPort } from '../domain/ports.ts';
import type { SystemNode, SystemDependency } from '@blueprint/core';

const NODE_SIZE = { width: 280, height: 120 } as const;
const LAYOUT_ORIGIN = { x: 40, y: 40 } as const;
const FOREST_GAP = 260;

type TreeDatum = { id: string; children?: TreeDatum[] };

/**
 * d3-hierarchy tree layout for context diagrams (person → hubs → subsystems).
 * Cycles / multi-parent edges are truncated: first edge to an unseen child wins.
 */
export class D3HierarchyLayoutAdapter implements LayoutPort {
  async computeLayout(
    nodes: SystemNode[],
    dependencies: SystemDependency[]
  ): Promise<SystemNode[]> {
    if (nodes.length === 0) return [];

    const nodeIds = new Set(nodes.map(n => n.entityRef));
    const edges = dependencies.filter(e => nodeIds.has(e.from) && nodeIds.has(e.to));
    const forests = buildForests(
      nodes.map(n => n.entityRef),
      edges.map(e => ({ source: e.from, target: e.to }))
    );

    const positions = new Map<string, { x: number; y: number }>();
    let forestOffsetY = LAYOUT_ORIGIN.y;

    for (const root of forests) {
      const rootHierarchy = hierarchy(root);
      const layout = tree<TreeDatum>()
        .nodeSize([NODE_SIZE.width + 80, NODE_SIZE.height + 160])
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
        maxY = Math.max(maxY, pos.y + NODE_SIZE.height);
      }
      forestOffsetY = maxY + FOREST_GAP;
    }

    for (const node of nodes) {
      if (!positions.has(node.entityRef)) {
        positions.set(node.entityRef, { x: LAYOUT_ORIGIN.x, y: forestOffsetY });
        forestOffsetY += FOREST_GAP;
      }
    }

    return nodes.map(node => {
      const pos = positions.get(node.entityRef)!;
      return { ...node, x: pos.x, y: pos.y };
    });
  }
}

export function buildForests(
  nodeIds: string[],
  edges: Array<{ source: string; target: string }>
): TreeDatum[] {
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

  // Prefer person nodes as forest roots when present (stable C4 context shape).
  const persons = nodeIds.filter(id => /(^|\/)user$/.test(id)).sort();
  const defaultRoots = nodeIds.filter(id => !hasParent.has(id)).sort((a, b) => a.localeCompare(b));
  const roots = (persons.length > 0 ? persons : defaultRoots).filter(
    (id, i, arr) => arr.indexOf(id) === i
  );

  // Include any remaining roots that aren't under the person tree
  const covered = new Set<string>();
  const mark = (t: TreeDatum) => {
    covered.add(t.id);
    t.children?.forEach(mark);
  };

  const forests: TreeDatum[] = [];
  for (const id of roots) {
    if (covered.has(id)) continue;
    const t = toTree(id, new Set());
    mark(t);
    forests.push(t);
  }

  for (const id of [...nodeIds].sort((a, b) => a.localeCompare(b))) {
    if (covered.has(id) || hasParent.has(id)) continue;
    const t = toTree(id, new Set());
    mark(t);
    forests.push(t);
  }

  if (forests.length === 0) {
    const fallback = [...nodeIds].sort((a, b) => a.localeCompare(b))[0];
    return fallback ? [toTree(fallback, new Set())] : [];
  }

  return forests;
}
