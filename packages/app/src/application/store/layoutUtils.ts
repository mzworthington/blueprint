import type { Node as RFNode, Edge as RFEdge } from '@xyflow/react';
import type {
  SystemSchema,
  SystemNode,
  SystemDependency,
  NodeType,
  DependencyType,
  PropertyMap,
  C4Level,
} from '@blueprint/core';

export type ComponentNodeData = {
  [key: string]: unknown;
  id: string;
  type: NodeType;
  name: string;
  c4Ref?: string;
  external?: boolean;
  isTest?: boolean;
  properties: PropertyMap;
};

export type BlueprintRFNode = RFNode<ComponentNodeData, 'blueprintNode'>;

export type ComponentEdgeData = {
  [key: string]: unknown;
  type: DependencyType;
  description: string;
};

export type BlueprintRFEdge = RFEdge<ComponentEdgeData>;

export const mapDomainNodeToRFNode = (n: SystemNode): BlueprintRFNode => ({
  id: n.id,
  type: 'blueprintNode',
  position: { x: n.x ?? 150 + Math.random() * 200, y: n.y ?? 150 + Math.random() * 200 },
  data: {
    id: n.id,
    type: n.type,
    name: n.name,
    c4Ref: n.c4Ref,
    external: n.external,
    isTest: n.isTest,
    properties: n.properties || {},
  },
});

export const mapDomainDepToRFEdge = (d: SystemDependency): BlueprintRFEdge => ({
  id: `edge-${d.from}-${d.to}`,
  source: d.from,
  target: d.to,
  type: 'default',
  animated: d.type === 'publish-subscribe',
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
  parentRef: string | undefined,
  rfNodes: BlueprintRFNode[],
  rfEdges: BlueprintRFEdge[]
): SystemSchema => {
  const nodes: SystemNode[] = rfNodes.map(rn => ({
    id: rn.id,
    type: rn.data.type,
    name: rn.data.name,
    c4Ref: rn.data.c4Ref,
    external: rn.data.external,
    isTest: rn.data.isTest,
    properties: rn.data.properties,
    x: rn.position.x,
    y: rn.position.y,
  }));

  const dependencies: SystemDependency[] = rfEdges.map(re => ({
    from: re.source,
    to: re.target,
    type: re.data?.type || 'direct-call',
    description: re.data?.description || '',
  }));

  return { name, version, level, parentRef, nodes, dependencies };
};
