import {
  computeImportMergePlan,
  resolveWorkspaceEntityRefs,
  getSchemaEntityRef,
  applyImportMergePlan,
  type ConflictResolutions,
  type ImportMergePlan,
  type SystemSchema,
} from '@blueprint/core';
import type { BlueprintRFNode } from '../../layoutUtils';
import { mapDomainDepsToRFEdges, mapDomainNodeToRFNode } from '../../layoutUtils';
import { applyStateUpdates } from './applyStateUpdates';

type LoadedSystem = { path: string; name: string; schema: SystemSchema };

export interface DiagramImportContext {
  baseSchema: SystemSchema;
  loadedSystems: LoadedSystem[];
  currentFilePath: string;
  workspaceName: string;
  isWorkspaceOpen: boolean;
}

export interface DiagramImportPreview<TParse> {
  parseResult: TParse;
  mergePlan: ImportMergePlan;
  scopedImported: SystemSchema;
}

function workspaceRoot(workspaceName: string, isWorkspaceOpen: boolean): string | undefined {
  return isWorkspaceOpen ? workspaceName : undefined;
}

function systemsWithSchema(
  loadedSystems: LoadedSystem[],
  currentFilePath: string,
  schema: SystemSchema
): Array<{ path: string; schema: SystemSchema }> {
  const systems = loadedSystems.map(sys => ({
    path: sys.path,
    schema: sys.path === currentFilePath ? schema : sys.schema,
  }));

  if (!systems.some(sys => sys.path === currentFilePath)) {
    systems.push({ path: currentFilePath, schema });
  }

  return systems;
}

export function resolveScopedSchema(
  context: DiagramImportContext,
  schema: SystemSchema
): SystemSchema {
  const resolved = resolveWorkspaceEntityRefs(
    systemsWithSchema(context.loadedSystems, context.currentFilePath, schema),
    workspaceRoot(context.workspaceName, context.isWorkspaceOpen)
  );

  return resolved.schemas[context.currentFilePath] ?? schema;
}

export function previewDiagramImport<TParse extends { schema: SystemSchema }>(
  context: DiagramImportContext,
  parseResult: TParse
): DiagramImportPreview<TParse> {
  const scopedImported = resolveScopedSchema(context, parseResult.schema);
  const mergePlan = computeImportMergePlan(context.baseSchema, scopedImported);
  return { parseResult, mergePlan, scopedImported };
}

export function buildDiagramImportContext(
  get: () => {
    schema: SystemSchema;
    loadedSystems: LoadedSystem[];
    currentFilePath: string;
    workspaceName: string;
    isWorkspaceOpen: boolean;
  }
): DiagramImportContext {
  const { schema, loadedSystems, currentFilePath, workspaceName, isWorkspaceOpen } = get();
  return {
    baseSchema: schema,
    loadedSystems,
    currentFilePath,
    workspaceName,
    isWorkspaceOpen,
  };
}

export function parentEntityRefForImport(context: DiagramImportContext): string {
  return getSchemaEntityRef(
    context.baseSchema,
    workspaceRoot(context.workspaceName, context.isWorkspaceOpen)
  );
}

function layoutNewNodes(
  existingNodes: BlueprintRFNode[],
  mergedSchema: SystemSchema,
  previousRefs: Set<string>
): BlueprintRFNode[] {
  const maxX = existingNodes.reduce((max, node) => Math.max(max, node.position.x), 0);
  const offsetX = existingNodes.length > 0 ? maxX + 320 : 100;
  const newDomainNodes = mergedSchema.nodes.filter(node => !previousRefs.has(node.entityRef));

  return newDomainNodes.map((node, index) =>
    mapDomainNodeToRFNode({
      ...node,
      x: offsetX + (index % 3) * 280,
      y: 100 + Math.floor(index / 3) * 180,
    })
  );
}

function syncNodeFromSchema(node: BlueprintRFNode, finalSchema: SystemSchema): BlueprintRFNode {
  const ref = node.data.entityRef || node.id;
  const domain = finalSchema.nodes.find(schemaNode => schemaNode.entityRef === ref);
  if (!domain) return node;

  return {
    ...node,
    data: {
      ...node.data,
      name: domain.name,
      type: domain.type,
      external: domain.external,
      entityRef: domain.entityRef,
    },
  };
}

function buildMergedRfNodes(
  existingNodes: BlueprintRFNode[],
  finalSchema: SystemSchema,
  previousRefs: Set<string>
): BlueprintRFNode[] {
  const preservedNodes = existingNodes.filter(node => {
    const ref = node.data.entityRef || node.id;
    return finalSchema.nodes.some(schemaNode => schemaNode.entityRef === ref);
  });

  return [
    ...preservedNodes.map(node => syncNodeFromSchema(node, finalSchema)),
    ...layoutNewNodes(preservedNodes, finalSchema, previousRefs),
  ];
}

export function executeDiagramImport(
  set: (partial: Record<string, unknown>) => void,
  get: () => {
    nodes: BlueprintRFNode[];
    loadedSystems: LoadedSystem[];
    currentFilePath: string;
    recordHistory: () => void;
    checkPendingChanges: () => Promise<void>;
    logger: { error: (message: string, err: unknown) => void };
  },
  context: DiagramImportContext,
  scopedImported: SystemSchema,
  resolutions: ConflictResolutions,
  errorLabel: string
): boolean {
  try {
    set({ lastError: null });

    const { nodes, loadedSystems, currentFilePath, recordHistory, checkPendingChanges } = get();
    const previousRefs = new Set(context.baseSchema.nodes.map(node => node.entityRef));
    const merged = applyImportMergePlan(context.baseSchema, scopedImported, resolutions);
    const finalSchema = resolveScopedSchema(context, merged);
    const mergedRfNodes = buildMergedRfNodes(nodes, finalSchema, previousRefs);
    const mergedRfEdges = mapDomainDepsToRFEdges(finalSchema.dependencies);

    recordHistory();
    applyStateUpdates(set, get, mergedRfNodes, mergedRfEdges);

    set({
      loadedSystems: loadedSystems.map(sys =>
        sys.path === currentFilePath ? { ...sys, schema: finalSchema, name: finalSchema.name } : sys
      ),
    });
    void checkPendingChanges();

    return true;
  } catch (error: unknown) {
    const errorMsg = (error instanceof Error ? error.message : undefined) || errorLabel;
    set({ lastError: errorMsg });
    get().logger.error(errorLabel, error);
    return false;
  }
}
