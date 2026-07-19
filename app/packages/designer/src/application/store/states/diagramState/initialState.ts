import {
  validateGraph,
  serializeSchemaToYaml,
  resolveWorkspaceEntityRefs,
  type SystemSchema,
} from '@blueprint/core';
import {
  mapDomainNodeToRFNode,
  mapDomainDepsToRFEdges,
  getClosestHandles,
} from '../../layoutUtils';
import type { BlueprintRFNode, BlueprintRFEdge } from '../../layoutUtils';
import { defaultLoadedSystems, defaultInitialSchema } from '../../defaultData';

export interface DiagramInitialState {
  schema: SystemSchema;
  nodes: BlueprintRFNode[];
  edges: BlueprintRFEdge[];
  validationResult: ReturnType<typeof validateGraph>;
  yamlCode: string;
  currentFilePath: string;
  loadedSystems: Array<{ path: string; name: string; schema: SystemSchema }>;
  nodeRefMap: Record<string, Record<string, string>>;
}

export function createDiagramInitialState(): DiagramInitialState {
  const resolvedInitial = resolveWorkspaceEntityRefs(
    defaultLoadedSystems.length > 0
      ? defaultLoadedSystems
      : [{ path: 'blueprint.yaml', schema: defaultInitialSchema }]
  );
  const initialLoadedSystemsResolved = defaultLoadedSystems.map(sys => ({
    ...sys,
    schema: resolvedInitial.schemas[sys.path] || sys.schema,
  }));
  const initialSchemaResolved =
    initialLoadedSystemsResolved.length > 0
      ? initialLoadedSystemsResolved[0].schema
      : defaultInitialSchema;

  const initialNodes = initialSchemaResolved.nodes
    .map(mapDomainNodeToRFNode)
    .map((node: BlueprintRFNode) => {
      const defaultPath = defaultLoadedSystems[0]?.path || 'blueprint.yaml';
      const fileRefMap = resolvedInitial.nodeRefMap[defaultPath] || {};
      const sysId = resolvedInitial.schemas[defaultPath]?.entityRef || 'default';
      const entityRef = fileRefMap[node.id] || `${sysId}/${node.id}`;
      return {
        ...node,
        data: {
          ...node.data,
          entityRef,
        },
      };
    });
  const initialEdges = mapDomainDepsToRFEdges(initialSchemaResolved.dependencies).map(
    (edge: BlueprintRFEdge) => {
      const sourceNode = initialNodes.find((n: BlueprintRFNode) => n.id === edge.source);
      const targetNode = initialNodes.find((n: BlueprintRFNode) => n.id === edge.target);
      if (!sourceNode || !targetNode) return edge;
      const { sourceHandle, targetHandle } = getClosestHandles(sourceNode, targetNode);
      return {
        ...edge,
        sourceHandle,
        targetHandle,
      };
    }
  );

  return {
    schema: initialSchemaResolved,
    nodes: initialNodes,
    edges: initialEdges,
    validationResult: validateGraph(initialSchemaResolved),
    yamlCode: serializeSchemaToYaml(initialSchemaResolved),
    currentFilePath:
      defaultLoadedSystems.length > 0 ? defaultLoadedSystems[0].path : 'blueprint.yaml',
    loadedSystems: initialLoadedSystemsResolved,
    nodeRefMap: resolvedInitial.nodeRefMap,
  };
}
