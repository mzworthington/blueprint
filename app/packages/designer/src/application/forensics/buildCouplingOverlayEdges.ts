import type { BlueprintRFEdge, BlueprintRFNode } from '../store/layoutUtils';
import { getClosestHandles } from '../store/layoutUtils';
import { resolveCouplingEdges } from './resolveCouplingEdges';

export const COUPLING_EDGE_PREFIX = 'coupling-';

/**
 * Build ephemeral React Flow edges for temporal coupling of the selected node.
 * These are display-only and must not be written into the schema.
 */
export function buildCouplingOverlayEdges(
  selectedNodeId: string | null | undefined,
  nodes: BlueprintRFNode[],
  enabled: boolean
): BlueprintRFEdge[] {
  if (!enabled || !selectedNodeId) return [];

  const refs = resolveCouplingEdges(selectedNodeId, nodes);
  if (refs.length === 0) return [];

  const byId = new Map(nodes.map(n => [n.id, n]));

  return refs.flatMap(ref => {
    const source = byId.get(ref.sourceId);
    const target = byId.get(ref.targetId);
    if (!source || !target) return [];

    const handles = getClosestHandles(source, target);
    return [
      {
        id: `${COUPLING_EDGE_PREFIX}${ref.sourceId}-${ref.targetId}`,
        source: ref.sourceId,
        target: ref.targetId,
        sourceHandle: handles.sourceHandle,
        targetHandle: handles.targetHandle,
        type: 'default',
        animated: true,
        selectable: false,
        focusable: false,
        data: {
          type: 'direct-call' as const,
          description: `coupling ${ref.score.toFixed(2)}`,
          coupling: true,
          score: ref.score,
          sharedCommits: ref.sharedCommits,
        },
        label: `${ref.score.toFixed(2)}`,
        style: {
          stroke: '#f59e0b',
          strokeWidth: 2,
          strokeDasharray: '6 4',
        },
        labelStyle: { fill: '#fbbf24', fontSize: 10, fontWeight: 600 },
        labelBgStyle: { fill: '#020617', fillOpacity: 0.9 },
        labelBgPadding: [6, 4] as [number, number],
        labelBgBorderRadius: 4,
      },
    ];
  });
}

export function applyCouplingHighlights(
  nodes: BlueprintRFNode[],
  selectedNodeId: string | null | undefined,
  enabled: boolean
): BlueprintRFNode[] {
  if (!enabled || !selectedNodeId) {
    return nodes.map(n =>
      n.data.couplingHighlight ? { ...n, data: { ...n.data, couplingHighlight: false } } : n
    );
  }

  const coupledIds = new Set(resolveCouplingEdges(selectedNodeId, nodes).map(e => e.targetId));
  if (coupledIds.size === 0) {
    return nodes.map(n =>
      n.data.couplingHighlight ? { ...n, data: { ...n.data, couplingHighlight: false } } : n
    );
  }

  return nodes.map(n => {
    const highlight = coupledIds.has(n.id);
    if (Boolean(n.data.couplingHighlight) === highlight) return n;
    return { ...n, data: { ...n.data, couplingHighlight: highlight } };
  });
}

/**
 * When coupling focus is on, keep only the selected node and its on-canvas coupled peers.
 * Resolution still uses the full incoming node list so peers are found before filtering.
 */
export function filterCouplingFocusNodes(
  nodes: BlueprintRFNode[],
  selectedNodeId: string | null | undefined,
  enabled: boolean
): BlueprintRFNode[] {
  if (!enabled || !selectedNodeId) return nodes;

  const peerIds = new Set(resolveCouplingEdges(selectedNodeId, nodes).map(e => e.targetId));
  if (peerIds.size === 0) return nodes;

  peerIds.add(selectedNodeId);
  return nodes.filter(n => peerIds.has(n.id));
}
