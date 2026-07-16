import {
  validateGraph,
  serializeSchemaToYaml,
  type SystemSchema,
  type C4Level,
  resolveWorkspaceEntityRefs,
  slugify,
} from '@blueprint/core';
import type { BlueprintRFNode, BlueprintRFEdge } from '../../layoutUtils';
import { saveWorkingSchema } from '../../../../infrastructure/db/db';
import {
  attachClosestHandles,
  resolveWorkspaceName,
  mapSchemaToFqns,
  highlightEdgesForValidation,
  resolveCanvasNodeEntityRefs,
  buildNextSchemaFromCanvas,
} from './applyStateHelpers';

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

  const edgesWithHandles = attachClosestHandles(nextNodes, nextEdges);
  const nextSchema = buildNextSchemaFromCanvas(
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

  const workspaceName = resolveWorkspaceName(get, name, level);

  const resolved = resolveWorkspaceEntityRefs(nextLoadedSystems, workspaceName);
  const currentFilePath = get().currentFilePath as string;
  const fileRefMap = resolved.nodeRefMap[currentFilePath] || {};
  const activeResolvedSchema = resolved.schemas[currentFilePath];
  const systemId =
    activeResolvedSchema?.entityRef || slugify(workspaceName || '').replace(/_/g, '-') || 'default';

  const nextSchemaMapped = mapSchemaToFqns(nextSchema, fileRefMap, systemId);
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

  const highlightedEdges = highlightEdgesForValidation(
    edgesWithHandles,
    validationResult,
    fileRefMap,
    systemId
  );
  const resolvedNextNodes = resolveCanvasNodeEntityRefs(nextNodes, fileRefMap, systemId);

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

  saveWorkingSchema(currentFilePath, resolvedSchema, systemId, fileRefMap)
    .then(() => {
      get().checkPendingChanges?.();
    })
    .catch((err: unknown) => {
      if (get().logger) {
        get().logger.error('Failed to sync working schema to IndexedDB', err);
      }
    });
}
