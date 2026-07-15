import {
  validateGraph,
  serializeSchemaToYaml,
  resolveWorkspaceEntityRefs,
  type SystemSchema,
} from '@blueprint/core';
import { mapDomainNodeToRFNode, mapDomainDepToRFEdge, getClosestHandles } from '../../layoutUtils';
import type { BlueprintRFNode, BlueprintRFEdge } from '../../layoutUtils';
import { defaultLoadedSystems, defaultInitialSchema } from '../../defaultData';
import { saveWorkingSchema, saveBaselineSchema } from '../../../../infrastructure/db/db';

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
  const initialEdges = initialSchemaResolved.dependencies
    .map(mapDomainDepToRFEdge)
    .map((edge: BlueprintRFEdge) => {
      const sourceNode = initialNodes.find((n: BlueprintRFNode) => n.id === edge.source);
      const targetNode = initialNodes.find((n: BlueprintRFNode) => n.id === edge.target);
      if (!sourceNode || !targetNode) return edge;
      const { sourceHandle, targetHandle } = getClosestHandles(sourceNode, targetNode);
      return {
        ...edge,
        sourceHandle,
        targetHandle,
      };
    });

  // Seed database with default systems asynchronously on startup
  setTimeout(() => {
    initialLoadedSystemsResolved.forEach(sys => {
      const resolvedSysSchema = resolvedInitial.schemas[sys.path] || sys.schema;
      const sysId = resolvedSysSchema.entityRef || 'default';
      const fileRefMap = resolvedInitial.nodeRefMap[sys.path] || {};
      saveBaselineSchema(sys.path, sys.schema, sysId, fileRefMap).catch(() => {});
      saveWorkingSchema(sys.path, sys.schema, sysId, fileRefMap).catch(() => {});
    });
  }, 100);

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
