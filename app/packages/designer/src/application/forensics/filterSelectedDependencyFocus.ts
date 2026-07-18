import type { BlueprintRFEdge, BlueprintRFNode } from '../store/layoutUtils';

function buildAdjacency(edges: BlueprintRFEdge[], nodeIds: Set<string>) {
  const outgoing = new Map<string, string[]>();
  const incoming = new Map<string, string[]>();
  for (const edge of edges) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) continue;
    const outList = outgoing.get(edge.source);
    if (outList) outList.push(edge.target);
    else outgoing.set(edge.source, [edge.target]);
    const inList = incoming.get(edge.target);
    if (inList) inList.push(edge.source);
    else incoming.set(edge.target, [edge.source]);
  }
  return { outgoing, incoming };
}

function walkClosure(startId: string, adjacency: Map<string, string[]>): Set<string> {
  const visited = new Set<string>();
  const stack = [startId];
  while (stack.length > 0) {
    const id = stack.pop()!;
    if (visited.has(id)) continue;
    visited.add(id);
    for (const next of adjacency.get(id) ?? []) {
      if (!visited.has(next)) stack.push(next);
    }
  }
  return visited;
}

/**
 * Collect the selected node plus every node reachable by walking dependency
 * edges upstream (incoming callers) and downstream (outgoing targets)
 * transitively. Sibling-only branches via a shared ancestor are excluded.
 * Display-only; does not mutate schema.
 */
export function collectDependencyNeighborhood(
  selectedNodeId: string | null | undefined,
  nodes: BlueprintRFNode[],
  edges: BlueprintRFEdge[]
): Set<string> {
  const visible = new Set<string>();
  if (!selectedNodeId) return visible;

  const nodeIds = new Set(nodes.map(n => n.id));
  if (!nodeIds.has(selectedNodeId)) return visible;

  const { outgoing, incoming } = buildAdjacency(edges, nodeIds);
  // Walk each direction separately so reaching an upstream node does not
  // fan out into that node's sibling downstream branches.
  for (const id of walkClosure(selectedNodeId, outgoing)) visible.add(id);
  for (const id of walkClosure(selectedNodeId, incoming)) visible.add(id);
  return visible;
}

/**
 * When enabled and a node is selected, keep only the selection and its
 * transitive upstream + downstream dependency neighborhood.
 */
export function filterSelectedDependencyFocusNodes(
  nodes: BlueprintRFNode[],
  edges: BlueprintRFEdge[],
  selectedNodeId: string | null | undefined,
  enabled: boolean
): BlueprintRFNode[] {
  if (!enabled || !selectedNodeId) return nodes;
  const visible = collectDependencyNeighborhood(selectedNodeId, nodes, edges);
  if (visible.size === 0) return nodes;
  return nodes.filter(n => visible.has(n.id));
}
