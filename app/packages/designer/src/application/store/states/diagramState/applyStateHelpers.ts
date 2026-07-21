import type { SystemSchema, SystemNode, SystemDependency, C4Level } from '@blueprint/core';
import {
  DEPENDENCY_EDGE_STROKE,
  dependencyArrowMarker,
  getClosestHandles,
  rebuildSchemaFromCanvas,
} from '../../layoutUtils';
import type { BlueprintRFNode, BlueprintRFEdge } from '../../layoutUtils';
import type { ValidationResult } from '@blueprint/core';

export function attachClosestHandles(
  nextNodes: BlueprintRFNode[],
  nextEdges: BlueprintRFEdge[]
): BlueprintRFEdge[] {
  return nextEdges.map(edge => {
    const sourceNode = nextNodes.find(n => n.id === edge.source);
    const targetNode = nextNodes.find(n => n.id === edge.target);
    if (!sourceNode || !targetNode) return edge;
    const { sourceHandle, targetHandle } = getClosestHandles(sourceNode, targetNode, nextNodes);
    return {
      ...edge,
      sourceHandle,
      targetHandle,
    };
  });
}

export function resolveWorkspaceName(
  get: () => {
    workspaceName: string;
    isWorkspaceOpen: boolean;
    schema: SystemSchema;
  },
  name: string,
  level: C4Level
): string {
  let workspaceName = get().workspaceName;
  const nameChanged = name !== get().schema.name;
  if (!get().isWorkspaceOpen && nameChanged && (level === 'container' || level === 'context')) {
    workspaceName = name;
  } else if (!workspaceName && (level === 'container' || level === 'context')) {
    workspaceName = name;
  }
  return workspaceName;
}

export function mapSchemaToFqns(
  nextSchema: SystemSchema,
  fileRefMap: Record<string, string>,
  systemId: string
): SystemSchema {
  return {
    ...nextSchema,
    nodes: nextSchema.nodes.map((node: SystemNode) => ({
      ...node,
      entityRef:
        node.entityRef && node.entityRef.includes('/')
          ? node.entityRef
          : fileRefMap[node.entityRef || ''] || `${systemId}/${node.entityRef || ''}`,
    })),
    dependencies: nextSchema.dependencies.map((dep: SystemDependency) => {
      const fromFQN = dep.from.includes('/')
        ? dep.from
        : fileRefMap[dep.from] || `${systemId}/${dep.from}`;
      const toFQN = dep.to.includes('/') ? dep.to : fileRefMap[dep.to] || `${systemId}/${dep.to}`;
      return {
        ...dep,
        from: fromFQN,
        to: toFQN,
      };
    }),
  };
}

export function highlightEdgesForValidation(
  edgesWithHandles: BlueprintRFEdge[],
  validationResult: ValidationResult,
  fileRefMap: Record<string, string>,
  systemId: string
): BlueprintRFEdge[] {
  const cycleNodes = new Set(
    validationResult.issues
      .filter(issue => issue.type === 'cycle' && issue.path)
      .flatMap(issue => issue.path || [])
  );

  return edgesWithHandles.map(edge => {
    const sourceRef =
      fileRefMap[edge.source] ||
      (edge.source.includes('/') ? edge.source : `${systemId}/${edge.source}`);
    const targetRef =
      fileRefMap[edge.target] ||
      (edge.target.includes('/') ? edge.target : `${systemId}/${edge.target}`);
    const isCycleEdge = cycleNodes.has(sourceRef) && cycleNodes.has(targetRef);
    const stroke = isCycleEdge
      ? '#ef4444'
      : edge.data?.type === 'publish-subscribe'
        ? '#c084fc'
        : DEPENDENCY_EDGE_STROKE;
    return {
      ...edge,
      animated: edge.animated || isCycleEdge,
      markerEnd: dependencyArrowMarker(stroke),
      label: edge.data?.description || undefined,
      labelStyle: { fill: '#94a3b8', fontSize: 10, fontWeight: 500 },
      labelBgStyle: { fill: '#020617', fillOpacity: 0.85 },
      labelBgPadding: [6, 4] as [number, number],
      labelBgBorderRadius: 4,
      style: {
        ...edge.style,
        stroke,
        strokeWidth: isCycleEdge ? 3.5 : 2,
      },
    };
  });
}

export function resolveCanvasNodeEntityRefs(
  nextNodes: BlueprintRFNode[],
  fileRefMap: Record<string, string>,
  systemId: string
): BlueprintRFNode[] {
  return nextNodes.map(node => {
    const resolvedEntityRef =
      node.data.entityRef && node.data.entityRef.includes('/')
        ? node.data.entityRef
        : fileRefMap[node.id] || fileRefMap[node.data.entityRef || ''] || `${systemId}/${node.id}`;
    return {
      ...node,
      data: {
        ...node.data,
        entityRef: resolvedEntityRef,
      },
    };
  });
}

export function buildNextSchemaFromCanvas(
  name: string,
  version: string,
  level: C4Level,
  nextNodes: BlueprintRFNode[],
  edgesWithHandles: BlueprintRFEdge[],
  entityRef: string | undefined,
  source?: SystemSchema['source'],
  persistLayoutCoordinates = true
): SystemSchema {
  return rebuildSchemaFromCanvas(
    name,
    version,
    level,
    nextNodes,
    edgesWithHandles,
    entityRef,
    source,
    persistLayoutCoordinates
  );
}
