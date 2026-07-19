import {
  parseMermaidToSchema,
  applyImportMergePlan,
  computeImportMergePlan,
  resolveWorkspaceEntityRefs,
  getSchemaEntityRef,
  type ConflictResolutions,
  type ImportMergePlan,
  type MermaidParseResult,
  type SystemSchema,
} from '@blueprint/core';
import type { BlueprintRFNode } from '../../layoutUtils';
import { mapDomainDepsToRFEdges, mapDomainNodeToRFNode } from '../../layoutUtils';
import { applyStateUpdates } from './applyStateUpdates';

type LoadedSystem = { path: string; name: string; schema: SystemSchema };

export interface MermaidImportContext {
  baseSchema: SystemSchema;
  loadedSystems: LoadedSystem[];
  currentFilePath: string;
  workspaceName: string;
  isWorkspaceOpen: boolean;
}

export interface MermaidImportPreview {
  parseResult: MermaidParseResult;
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

function resolveScopedSchema(context: MermaidImportContext, schema: SystemSchema): SystemSchema {
  const resolved = resolveWorkspaceEntityRefs(
    systemsWithSchema(context.loadedSystems, context.currentFilePath, schema),
    workspaceRoot(context.workspaceName, context.isWorkspaceOpen)
  );

  return resolved.schemas[context.currentFilePath] ?? schema;
}

export function previewMermaidImport(
  mermaid: string,
  context: MermaidImportContext
): MermaidImportPreview {
  const parentEntityRef = getSchemaEntityRef(
    context.baseSchema,
    workspaceRoot(context.workspaceName, context.isWorkspaceOpen)
  );

  const parseResult = parseMermaidToSchema(mermaid, {
    targetLevel: context.baseSchema.level,
    parentEntityRef,
  });

  const scopedImported = resolveScopedSchema(context, parseResult.schema);
  const mergePlan = computeImportMergePlan(context.baseSchema, scopedImported);

  return { parseResult, mergePlan, scopedImported };
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

export function executeMermaidImport(
  set: (partial: Record<string, unknown>) => void,
  get: () => {
    schema: SystemSchema;
    nodes: BlueprintRFNode[];
    currentFilePath: string;
    loadedSystems: LoadedSystem[];
    workspaceName: string;
    isWorkspaceOpen: boolean;
    recordHistory: () => void;
    checkPendingChanges: () => Promise<void>;
    logger: { error: (message: string, err: unknown) => void };
  },
  mermaid: string,
  resolutions: ConflictResolutions
): boolean {
  try {
    set({ lastError: null });

    const {
      schema: baseSchema,
      nodes,
      currentFilePath,
      loadedSystems,
      workspaceName,
      isWorkspaceOpen,
      recordHistory,
      checkPendingChanges,
    } = get();

    const context: MermaidImportContext = {
      baseSchema,
      loadedSystems,
      currentFilePath,
      workspaceName,
      isWorkspaceOpen,
    };

    const { scopedImported } = previewMermaidImport(mermaid, context);
    const previousRefs = new Set(baseSchema.nodes.map(node => node.entityRef));
    const merged = applyImportMergePlan(baseSchema, scopedImported, resolutions);
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
    const errorMsg =
      (error instanceof Error ? error.message : undefined) || 'Failed to import Mermaid diagram';
    set({ lastError: errorMsg });
    get().logger.error('Failed to import Mermaid diagram', error);
    return false;
  }
}
