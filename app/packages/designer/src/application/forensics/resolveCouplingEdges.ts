import type { BlueprintRFNode } from '../store/layoutUtils';

export interface CouplingEdgeRef {
  sourceId: string;
  targetId: string;
  score: number;
  sharedCommits: number;
  path: string;
}

/** Normalize filepath for join between node properties and coupledFiles paths. */
export function normalizeFilepath(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/+/g, '/');
}

/**
 * Resolve temporal-coupling peers of the selected node to canvas node ids
 * by joining `forensics.coupledFiles[].path` → `properties.filepath`.
 */
export function resolveCouplingEdges(
  selectedNodeId: string | null | undefined,
  nodes: BlueprintRFNode[]
): CouplingEdgeRef[] {
  if (!selectedNodeId) return [];

  const selected = nodes.find(n => n.id === selectedNodeId);
  const coupled = selected?.data.forensics?.coupledFiles;
  if (!selected || !coupled?.length) return [];

  const byPath = new Map<string, string>();
  for (const n of nodes) {
    const filepath = n.data.properties?.filepath;
    if (typeof filepath !== 'string' || !filepath) continue;
    byPath.set(normalizeFilepath(filepath), n.id);
  }

  const edges: CouplingEdgeRef[] = [];
  for (const c of coupled) {
    const targetId = byPath.get(normalizeFilepath(c.path));
    if (!targetId || targetId === selectedNodeId) continue;
    edges.push({
      sourceId: selectedNodeId,
      targetId,
      score: c.score,
      sharedCommits: c.sharedCommits,
      path: c.path,
    });
  }
  return edges;
}

/** Resolve a coupled filepath to a canvas node id on the current diagram. */
export function findNodeIdByFilepath(
  filepath: string,
  nodes: BlueprintRFNode[]
): string | undefined {
  const normalized = normalizeFilepath(filepath);
  for (const node of nodes) {
    const nodePath = node.data.properties?.filepath;
    if (typeof nodePath !== 'string' || !nodePath) continue;
    if (normalizeFilepath(nodePath) === normalized) return node.id;
  }
  return undefined;
}
