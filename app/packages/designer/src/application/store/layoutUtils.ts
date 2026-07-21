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
import {
  fitGroupBounds,
  resolveGroupContentLayout,
  prepareGroupedNodesForLayout,
  groupLayoutDimensions,
  DEFAULT_NODE_SIZE,
} from '@blueprint/core';
import type { LayoutEngineId, LayoutRegistryPort } from '../../core';
import { computeClientLayout } from '../layout/computeClientLayout';

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

function parentDepth(node: SystemNode, nodes: SystemNode[]): number {
  let depth = 0;
  let current = node.parentEntityRef;
  const refs = new Set(nodes.map(n => n.entityRef));
  while (current && refs.has(current)) {
    depth += 1;
    const parent = nodes.find(n => n.entityRef === current);
    current = parent?.parentEntityRef;
  }
  return depth;
}

function buildComponentNodeData(n: SystemNode, ref: string): ComponentNodeData {
  return {
    id: ref,
    type: n.type,
    name: n.name,
    external: n.external,
    isTest: n.isTest,
    properties: n.properties || {},
    entityRef: ref,
    forensics: n.forensics,
  };
}

export function getAbsoluteNodePosition(
  node: BlueprintRFNode,
  nodeById: Map<string, BlueprintRFNode>
): { x: number; y: number } {
  let x = node.position.x;
  let y = node.position.y;
  let parentId = typeof node.parentId === 'string' ? node.parentId : undefined;
  while (parentId) {
    const parent = nodeById.get(parentId);
    if (!parent) break;
    x += parent.position.x;
    y += parent.position.y;
    parentId = typeof parent.parentId === 'string' ? parent.parentId : undefined;
  }
  return { x, y };
}

export function getNodeDimensions(node: BlueprintRFNode): { width: number; height: number } {
  const style = node.style as { width?: number; height?: number } | undefined;
  return {
    width: node.measured?.width ?? style?.width ?? 256,
    height: node.measured?.height ?? style?.height ?? 120,
  };
}

export function sortNodesForReactFlow(nodes: BlueprintRFNode[]): BlueprintRFNode[] {
  const byId = new Map(nodes.map(n => [n.id, n]));
  const depth = (node: BlueprintRFNode): number => {
    let d = 0;
    let parentId = typeof node.parentId === 'string' ? node.parentId : undefined;
    while (parentId && byId.has(parentId)) {
      d += 1;
      const parent = byId.get(parentId)!;
      parentId = typeof parent.parentId === 'string' ? parent.parentId : undefined;
    }
    return d;
  };
  return [...nodes].sort((a, b) => depth(a) - depth(b) || a.id.localeCompare(b.id));
}

/** Run automatic layout on load when no node has saved coordinates. */
export function shouldAutoLayoutOnLoad(schema: SystemSchema): boolean {
  if (schema.nodes.length === 0) return false;
  return !schema.nodes.some(n => Number.isFinite(n.x) && Number.isFinite(n.y));
}

export async function layoutGroupedDomainNodes(
  nodes: SystemNode[],
  dependencies: SystemDependency[],
  layoutEngine: LayoutEngineId,
  registry: LayoutRegistryPort
): Promise<SystemNode[]> {
  const prepared = prepareGroupedNodesForLayout(nodes);
  const topLevel = prepared.filter(n => !n.parentEntityRef);
  const topLevelIds = new Set(topLevel.map(n => n.entityRef));

  const topEdges = dependencies
    .filter(d => topLevelIds.has(d.from) && topLevelIds.has(d.to))
    .map((d, i) => ({
      id: `layout-${d.from}-${d.to}-${i}`,
      source: d.from,
      target: d.to,
    }));

  const layoutInput = topLevel.map(n => {
    if (n.type === 'group') {
      const children = prepared.filter(c => c.parentEntityRef === n.entityRef);
      const bounds = groupLayoutDimensions(children);
      return { id: n.entityRef, width: bounds.width, height: bounds.height };
    }
    return {
      id: n.entityRef,
      width: DEFAULT_NODE_SIZE.width,
      height: DEFAULT_NODE_SIZE.height,
    };
  });

  const positions = await computeClientLayout(layoutEngine, layoutInput, topEdges, registry);

  return prepared.map(n => {
    if (n.parentEntityRef) return n;
    const pos = positions.get(n.entityRef);
    return pos ? { ...n, x: pos.x, y: pos.y } : n;
  });
}

export function refreshGroupBoundsFromChildren(nodes: BlueprintRFNode[]): BlueprintRFNode[] {
  const childrenByParent = new Map<string, BlueprintRFNode[]>();
  for (const node of nodes) {
    const parentId = typeof node.parentId === 'string' ? node.parentId : undefined;
    if (!parentId) continue;
    const list = childrenByParent.get(parentId) ?? [];
    list.push(node);
    childrenByParent.set(parentId, list);
  }

  const childPositions = new Map<string, { x: number; y: number }>();
  const groupBounds = new Map<string, { width: number; height: number }>();

  for (const [parentId, children] of childrenByParent) {
    const { bounds, positionsByRef } = resolveGroupContentLayout(
      children.map(child => {
        const dims = getNodeDimensions(child);
        return {
          entityRef: child.id,
          x: child.position.x,
          y: child.position.y,
          width: dims.width,
          height: dims.height,
        };
      })
    );
    groupBounds.set(parentId, bounds);
    for (const [childId, pos] of positionsByRef) {
      childPositions.set(childId, pos);
    }
  }

  return nodes.map(node => {
    if (node.type === 'blueprintGroup') {
      const bounds = groupBounds.get(node.id);
      if (!bounds) return node;
      return {
        ...node,
        style: { ...(node.style as object), width: bounds.width, height: bounds.height },
        width: bounds.width,
        height: bounds.height,
      };
    }

    const childPos = childPositions.get(node.id);
    if (childPos) {
      return { ...node, position: childPos };
    }

    return node;
  });
}

export const mapDomainNodesToRFNodes = (nodes: SystemNode[]): BlueprintRFNode[] => {
  const childrenByParent = new Map<string, SystemNode[]>();
  for (const node of nodes) {
    if (!node.parentEntityRef) continue;
    const list = childrenByParent.get(node.parentEntityRef) ?? [];
    list.push(node);
    childrenByParent.set(node.parentEntityRef, list);
  }

  const groupLayouts = new Map<string, ReturnType<typeof resolveGroupContentLayout>>();
  for (const [parentRef, children] of childrenByParent) {
    groupLayouts.set(parentRef, resolveGroupContentLayout(children));
  }

  const sorted = [...nodes].sort((a, b) => parentDepth(a, nodes) - parentDepth(b, nodes));
  const rfNodes: BlueprintRFNode[] = [];

  for (const node of sorted) {
    const ref = node.entityRef || `node-${Math.random().toString(36).substring(2, 9)}`;

    if (node.type === 'group') {
      const layout = groupLayouts.get(ref);
      const bounds = layout?.bounds ?? {
        width: fitGroupBounds([]).width,
        height: fitGroupBounds([]).height,
      };
      rfNodes.push({
        id: ref,
        type: 'blueprintGroup',
        position: { x: node.x ?? 0, y: node.y ?? 0 },
        style: { width: bounds.width, height: bounds.height },
        width: bounds.width,
        height: bounds.height,
        zIndex: -1,
        data: buildComponentNodeData(node, ref),
      });
      continue;
    }

    const parentLayout = node.parentEntityRef ? groupLayouts.get(node.parentEntityRef) : undefined;
    const childPos = parentLayout?.positionsByRef.get(ref);

    rfNodes.push({
      id: ref,
      type: 'blueprintNode',
      position: childPos ?? { x: node.x ?? 0, y: node.y ?? 0 },
      ...(node.parentEntityRef ? { parentId: node.parentEntityRef, extent: 'parent' } : {}),
      data: buildComponentNodeData(node, ref),
    });
  }

  return rfNodes;
};

export const mapDomainNodeToRFNode = (n: SystemNode): BlueprintRFNode => {
  const mapped = mapDomainNodesToRFNodes([n]);
  return mapped[0]!;
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
  targetNode: BlueprintRFNode,
  allNodes?: BlueprintRFNode[]
): { sourceHandle: string; targetHandle: string } => {
  const nodeById = new Map((allNodes ?? [sourceNode, targetNode]).map(n => [n.id, n]));
  const sourcePos = getAbsoluteNodePosition(sourceNode, nodeById);
  const targetPos = getAbsoluteNodePosition(targetNode, nodeById);

  const aw = getNodeDimensions(sourceNode).width;
  const ah = getNodeDimensions(sourceNode).height;
  const ax = sourcePos.x;
  const ay = sourcePos.y;

  const bw = getNodeDimensions(targetNode).width;
  const bh = getNodeDimensions(targetNode).height;
  const bx = targetPos.x;
  const by = targetPos.y;

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
  source?: SourceProvenance,
  persistLayoutCoordinates = true
): SystemSchema => {
  const nodes: SystemNode[] = rfNodes.map(rn => {
    const isGroup = rn.type === 'blueprintGroup';
    const parentId = typeof rn.parentId === 'string' ? rn.parentId : undefined;
    const node: SystemNode = {
      type: isGroup ? 'group' : rn.data.type,
      name: rn.data.name,
      external: rn.data.external,
      isTest: rn.data.isTest,
      properties: rn.data.properties,
      forensics: rn.data.forensics,
      entityRef: rn.data.entityRef || rn.id || '',
      ...(parentId ? { parentEntityRef: parentId } : {}),
    };
    if (persistLayoutCoordinates) {
      node.x = rn.position.x;
      node.y = rn.position.y;
    }
    return node;
  });

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
