import type { BlueprintRFEdge, BlueprintRFNode } from '../store/layoutUtils';

/**
 * Collect the selected node plus every node reachable by following outgoing
 * dependency edges (source → target) until leaves. Display-only; does not mutate schema.
 */
export function collectDownstreamDependencyClosure(
  selectedNodeId: string | null | undefined,
  nodes: BlueprintRFNode[],
  edges: BlueprintRFEdge[]
): Set<string> {
  const visible = new Set<string>();
  if (!selectedNodeId) return visible;

  const nodeIds = new Set(nodes.map(n => n.id));
  if (!nodeIds.has(selectedNodeId)) return visible;

  const outgoing = new Map<string, string[]>();
  for (const edge of edges) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) continue;
    const list = outgoing.get(edge.source);
    if (list) list.push(edge.target);
    else outgoing.set(edge.source, [edge.target]);
  }

  const stack = [selectedNodeId];
  while (stack.length > 0) {
    const id = stack.pop()!;
    if (visible.has(id)) continue;
    visible.add(id);
    for (const next of outgoing.get(id) ?? []) {
      if (!visible.has(next)) stack.push(next);
    }
  }

  return visible;
}

/**
 * When enabled and a node is selected, keep only the selection and its
 * transitive downstream dependency subgraph.
 */
export function filterSelectedDependencyFocusNodes(
  nodes: BlueprintRFNode[],
  edges: BlueprintRFEdge[],
  selectedNodeId: string | null | undefined,
  enabled: boolean
): BlueprintRFNode[] {
  if (!enabled || !selectedNodeId) return nodes;
  const visible = collectDownstreamDependencyClosure(selectedNodeId, nodes, edges);
  if (visible.size === 0) return nodes;
  return nodes.filter(n => visible.has(n.id));
}
