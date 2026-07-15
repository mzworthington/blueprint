import {
  validateGraph,
  serializeSchemaToYaml,
  type SystemSchema,
  type SystemNode,
  type SystemDependency,
  type C4Level,
  resolveWorkspaceEntityRefs,
  slugify,
} from '@blueprint/core';
import { getClosestHandles, rebuildSchemaFromCanvas } from '../../layoutUtils';
import type { BlueprintRFNode, BlueprintRFEdge } from '../../layoutUtils';
import { saveWorkingSchema } from '../../../../infrastructure/db/db';

/**
 * Rebuild schema from canvas nodes/edges, resolve entityRefs across the
 * workspace, validate, refresh YAML, and persist the working copy.
 */
export function applyStateUpdates(
  set: (partial: Record<string, unknown>) => void,
  get: () => any,
  nextNodes: BlueprintRFNode[],
  nextEdges: BlueprintRFEdge[],
  customSchemaName?: string,
  customSchemaLevel?: C4Level,
  customEntityRef?: string | null
) {
  const currentSchema = get().schema as SystemSchema;
  const name = customSchemaName ?? currentSchema.name;
  const version = currentSchema.version;
  const level = customSchemaLevel ?? currentSchema.level;
  const entityRef =
    customEntityRef !== undefined
      ? customEntityRef === null
        ? undefined
        : customEntityRef
      : currentSchema.entityRef;

  const edgesWithHandles = nextEdges.map(edge => {
    const sourceNode = nextNodes.find(n => n.id === edge.source);
    const targetNode = nextNodes.find(n => n.id === edge.target);
    if (!sourceNode || !targetNode) return edge;
    const { sourceHandle, targetHandle } = getClosestHandles(sourceNode, targetNode);
    return {
      ...edge,
      sourceHandle,
      targetHandle,
    };
  });

  const nextSchema = rebuildSchemaFromCanvas(
    name,
    version,
    level,
    nextNodes,
    edgesWithHandles,
    entityRef
  );

  const nextLoadedSystems =
    get().loadedSystems?.map((sys: { path: string; name: string; schema: SystemSchema }) => {
      if (sys.path === get().currentFilePath) {
        return { ...sys, name: nextSchema.name, schema: nextSchema };
      }
      return sys;
    }) || [];

  let workspaceName = get().workspaceName as string;
  const nameChanged = name !== get().schema.name;
  if (!get().isWorkspaceOpen && nameChanged && (level === 'container' || level === 'context')) {
    workspaceName = name;
  } else if (!workspaceName && (level === 'container' || level === 'context')) {
    workspaceName = name;
  }

  const resolved = resolveWorkspaceEntityRefs(nextLoadedSystems, workspaceName);
  const currentFilePath = get().currentFilePath as string;
  const fileRefMap = resolved.nodeRefMap[currentFilePath] || {};
  const activeResolvedSchema = resolved.schemas[currentFilePath];
  const systemId =
    activeResolvedSchema?.entityRef || slugify(workspaceName || '').replace(/_/g, '-') || 'default';

  const nextSchemaMapped = {
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

  const validationResult = validateGraph(nextSchemaMapped);
  const yamlCode = serializeSchemaToYaml(nextSchemaMapped);

  if (!validationResult.isValid && get().logger) {
    get().logger.warn('Schema validation warnings triggered', {
      issues: validationResult.issues.map(
        (i: { type: string; message: string; path?: string[] }) => ({
          type: i.type,
          message: i.message,
          path: i.path,
        })
      ),
    });
  }

  const cycleNodes = new Set(
    validationResult.issues
      .filter(issue => issue.type === 'cycle' && issue.path)
      .flatMap(issue => issue.path || [])
  );

  const highlightedEdges = edgesWithHandles.map(edge => {
    const sourceRef =
      fileRefMap[edge.source] ||
      (edge.source.includes('/') ? edge.source : `${systemId}/${edge.source}`);
    const targetRef =
      fileRefMap[edge.target] ||
      (edge.target.includes('/') ? edge.target : `${systemId}/${edge.target}`);
    const isCycleEdge = cycleNodes.has(sourceRef) && cycleNodes.has(targetRef);
    return {
      ...edge,
      animated: edge.animated || isCycleEdge,
      label: edge.data?.description || undefined,
      labelStyle: { fill: '#94a3b8', fontSize: 10, fontWeight: 500 },
      labelBgStyle: { fill: '#020617', fillOpacity: 0.85 },
      labelBgPadding: [6, 4] as [number, number],
      labelBgBorderRadius: 4,
      style: {
        ...edge.style,
        stroke: isCycleEdge
          ? '#ef4444'
          : edge.data?.type === 'publish-subscribe'
            ? '#c084fc'
            : '#8b5cf6',
        strokeWidth: isCycleEdge ? 3.5 : 2,
      },
    };
  });

  const resolvedNextNodes = nextNodes.map(node => {
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

  const resolvedSchema = resolved.schemas[currentFilePath]
    ? resolved.schemas[currentFilePath]
    : nextSchemaMapped;

  set({
    workspaceName,
    nodes: resolvedNextNodes,
    edges: highlightedEdges,
    schema: resolvedSchema,
    validationResult,
    yamlCode,
    loadedSystems: nextLoadedSystems.map(
      (sys: { path: string; name: string; schema: SystemSchema }) => ({
        ...sys,
        schema: resolved.schemas[sys.path] || sys.schema,
      })
    ),
    nodeRefMap: resolved.nodeRefMap,
  });

  saveWorkingSchema(currentFilePath, resolvedSchema, systemId, fileRefMap).catch((err: unknown) => {
    if (get().logger) {
      get().logger.error('Failed to sync working schema to IndexedDB', err);
    }
  });
}
