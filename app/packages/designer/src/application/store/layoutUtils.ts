import type {
  SystemSchema,
  SystemNode,
  SystemDependency,
  NodeType,
  DependencyType,
  PropertyMap,
  C4Level,
  NodeForensics,
  SourceProvenance,
} from '@blueprint/core';

/** Matches canvas edge stroke (see `.react-flow__edge-path` in index.css). */
export const DEPENDENCY_EDGE_STROKE = '#00d8ff';

/** Framework-agnostic edge marker (compatible with React Flow EdgeMarker). */
export type CanvasEdgeMarker = {
  type: 'arrow' | 'arrowclosed';
  width?: number;
  height?: number;
  color?: string;
};

export function dependencyArrowMarker(color: string = DEPENDENCY_EDGE_STROKE): CanvasEdgeMarker {
  return {
    type: 'arrowclosed',
    width: 18,
    height: 18,
    color,
  };
}

export type EdgeAnimationOptions = {
  liteCanvas?: boolean;
  preferReducedMotion?: boolean;
};

/** Flow animation: incident to selection, or all edges in focus mode. */
export function shouldAnimateDependencyEdge(
  edge: { source: string; target: string; animated?: boolean },
  selectedNodeId: string | null | undefined,
  showSelectedDependenciesOnly: boolean,
  options?: EdgeAnimationOptions
): boolean {
  if (options?.preferReducedMotion) return false;

  const incidentToSelection =
    !!selectedNodeId && (edge.source === selectedNodeId || edge.target === selectedNodeId);

  if (options?.liteCanvas) {
    return incidentToSelection;
  }

  if (edge.animated) return true;
  if (showSelectedDependenciesOnly && selectedNodeId) return true;
  if (incidentToSelection) return true;
  return false;
}

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export type ComponentNodeData = {
  [key: string]: unknown;
  id: string;
  type: NodeType;
  name: string;
  external?: boolean;
  isTest?: boolean;
  properties: PropertyMap;
  entityRef?: string;
  forensics?: NodeForensics;
  couplingHighlight?: boolean;
  refactorBoundaryHighlight?: boolean;
  hotspotHeat?: number;
};

/** Canvas node DTO — structurally compatible with React Flow Node. */
export type BlueprintRFNode = {
  id: string;
  type?: string;
  position: { x: number; y: number };
  data: ComponentNodeData;
  measured?: { width?: number; height?: number };
  selected?: boolean;
  dragging?: boolean;
  [key: string]: unknown;
};

export type ComponentEdgeData = {
  [key: string]: unknown;
  type: DependencyType;
  description: string;
};

/** Canvas edge DTO — structurally compatible with React Flow Edge. */
export type BlueprintRFEdge = {
  id: string;
  source: string;
  target: string;
  type?: string;
  animated?: boolean;
  markerEnd?: CanvasEdgeMarker | string;
  data?: ComponentEdgeData;
  label?: string;
  style?: Record<string, unknown>;
  labelStyle?: Record<string, unknown>;
  labelBgStyle?: Record<string, unknown>;
  labelBgPadding?: [number, number];
  labelBgBorderRadius?: number;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  [key: string]: unknown;
};

export const mapDomainNodeToRFNode = (n: any): BlueprintRFNode => {
  const ref = n.entityRef || n.id || `node-${Math.random().toString(36).substring(2, 9)}`;
  return {
    id: ref,
    type: 'blueprintNode',
    position: { x: n.x ?? 150 + Math.random() * 200, y: n.y ?? 150 + Math.random() * 200 },
    data: {
      id: ref,
      type: n.type,
      name: n.name,
      external: n.external,
      isTest: n.isTest,
      properties: n.properties || {},
      entityRef: ref,
      forensics: n.forensics,
    },
  };
};

export const mapDomainDepToRFEdge = (d: SystemDependency): BlueprintRFEdge => ({
  id: `edge-${d.from}-${d.to}`,
  source: d.from,
  target: d.to,
  type: 'default',
  animated: d.type === 'publish-subscribe',
  markerEnd: dependencyArrowMarker(),
  data: { type: d.type, description: d.description || '' },
  label: d.description || undefined,
  style: {
    strokeWidth: 2,
  },
  labelStyle: { fill: '#94a3b8', fontSize: 10, fontWeight: 500 },
  labelBgStyle: { fill: '#020617', fillOpacity: 0.85 },
  labelBgPadding: [6, 4] as [number, number],
  labelBgBorderRadius: 4,
});

/** Map deps to RF edges, dropping duplicate from→to pairs (same React key). */
export const mapDomainDepsToRFEdges = (deps: SystemDependency[]): BlueprintRFEdge[] => {
  const seen = new Set<string>();
  const edges: BlueprintRFEdge[] = [];
  for (const dep of deps) {
    const edge = mapDomainDepToRFEdge(dep);
    if (seen.has(edge.id)) continue;
    seen.add(edge.id);
    edges.push(edge);
  }
  return edges;
};

export const getClosestHandles = (
  sourceNode: BlueprintRFNode,
  targetNode: BlueprintRFNode
): { sourceHandle: string; targetHandle: string } => {
  const aw = sourceNode.measured?.width ?? 256;
  const ah = sourceNode.measured?.height ?? 120;
  const ax = sourceNode.position.x;
  const ay = sourceNode.position.y;

  const bw = targetNode.measured?.width ?? 256;
  const bh = targetNode.measured?.height ?? 120;
  const bx = targetNode.position.x;
  const by = targetNode.position.y;

  const cxA = ax + aw / 2;
  const cyA = ay + ah / 2;
  const cxB = bx + bw / 2;
  const cyB = by + bh / 2;

  const dx = cxB - cxA;
  const dy = cyB - cyA;

  if (Math.abs(dx) > Math.abs(dy)) {
    if (dx > 0) {
      return { sourceHandle: 'right-source', targetHandle: 'left-target' };
    } else {
      return { sourceHandle: 'left-source', targetHandle: 'right-target' };
    }
  } else {
    if (dy > 0) {
      return { sourceHandle: 'bottom-source', targetHandle: 'top-target' };
    } else {
      return { sourceHandle: 'top-source', targetHandle: 'bottom-target' };
    }
  }
};

export const rebuildSchemaFromCanvas = (
  name: string,
  version: string,
  level: C4Level,
  rfNodes: BlueprintRFNode[],
  rfEdges: BlueprintRFEdge[],
  entityRef?: string,
  source?: SourceProvenance
): SystemSchema => {
  const nodes: SystemNode[] = rfNodes.map(rn => ({
    type: rn.data.type,
    name: rn.data.name,
    external: rn.data.external,
    isTest: rn.data.isTest,
    properties: rn.data.properties,
    forensics: rn.data.forensics,
    x: rn.position.x,
    y: rn.position.y,
    entityRef: rn.data.entityRef || rn.id || '',
  }));

  const dependencies: SystemDependency[] = rfEdges.map(re => ({
    from: re.source,
    to: re.target,
    type: re.data?.type || 'direct-call',
    description: re.data?.description || '',
  }));

  return {
    name,
    version,
    level,
    nodes,
    dependencies,
    entityRef,
    ...(source ? { source } : {}),
  };
};
