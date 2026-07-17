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
import type { BlueprintRFEdge, BlueprintRFNode } from '../../layoutUtils';
import { mapDomainDepToRFEdge, mapDomainNodeToRFNode } from '../../layoutUtils';
import { applyStateUpdates } from './applyStateUpdates';

type LoadedSystem = { path: string; name: string; schema: SystemSchema };

export interface MermaidImportPreview {
  parseResult: MermaidParseResult;
  mergePlan: ImportMergePlan;
  scopedImported: SystemSchema;
}

export function previewMermaidImport(
  mermaid: string,
  baseSchema: SystemSchema,
  loadedSystems: LoadedSystem[],
  currentFilePath: string,
  workspaceName: string,
  isWorkspaceOpen: boolean
): MermaidImportPreview {
  const parentEntityRef = getSchemaEntityRef(
    baseSchema,
    isWorkspaceOpen ? workspaceName : undefined
  );

  const parseResult = parseMermaidToSchema(mermaid, {
    targetLevel: baseSchema.level,
    parentEntityRef,
  });

  const systemsForResolve = loadedSystems.map(sys =>
    sys.path === currentFilePath
      ? { path: sys.path, schema: parseResult.schema }
      : { path: sys.path, schema: sys.schema }
  );
  if (!systemsForResolve.some(s => s.path === currentFilePath)) {
    systemsForResolve.push({ path: currentFilePath, schema: parseResult.schema });
  }

  const resolved = resolveWorkspaceEntityRefs(
    systemsForResolve,
    isWorkspaceOpen ? workspaceName : undefined
  );

  const scopedImported = resolved.schemas[currentFilePath] ?? parseResult.schema;
  const mergePlan = computeImportMergePlan(baseSchema, scopedImported);

  return { parseResult, mergePlan, scopedImported };
}

function layoutNewNodes(
  existingNodes: BlueprintRFNode[],
  mergedSchema: SystemSchema,
  previousRefs: Set<string>
): BlueprintRFNode[] {
  const maxX = existingNodes.reduce((max, n) => Math.max(max, n.position.x), 0);
  const offsetX = existingNodes.length > 0 ? maxX + 320 : 100;
  const newDomainNodes = mergedSchema.nodes.filter(n => !previousRefs.has(n.entityRef));

  return newDomainNodes.map((n, i) => {
    const rf = mapDomainNodeToRFNode({
      ...n,
      x: offsetX + (i % 3) * 280,
      y: 100 + Math.floor(i / 3) * 180,
    });
    return rf;
  });
}

export function executeMermaidImport(
  set: (partial: Record<string, unknown>) => void,
  get: () => {
    schema: SystemSchema;
    nodes: BlueprintRFNode[];
    edges: BlueprintRFEdge[];
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
      edges,
      currentFilePath,
      loadedSystems,
      workspaceName,
      isWorkspaceOpen,
    } = get();

    const { scopedImported } = previewMermaidImport(
      mermaid,
      baseSchema,
      loadedSystems,
      currentFilePath,
      workspaceName,
      isWorkspaceOpen
    );

    const previousRefs = new Set(baseSchema.nodes.map(n => n.entityRef));
    const merged = applyImportMergePlan(baseSchema, scopedImported, resolutions);

    const resolved = resolveWorkspaceEntityRefs(
      loadedSystems.map(sys =>
        sys.path === currentFilePath ? { path: sys.path, schema: merged } : sys
      ),
      isWorkspaceOpen ? workspaceName : undefined
    );

    const finalSchema = resolved.schemas[currentFilePath] ?? merged;

    const preservedNodes = nodes.filter(n => {
      const ref = n.data.entityRef || n.id;
      return finalSchema.nodes.some(fn => fn.entityRef === ref);
    });

    const newRfNodes = layoutNewNodes(preservedNodes, finalSchema, previousRefs);
    const mergedRfNodes = [
      ...preservedNodes.map(n => {
        const domain = finalSchema.nodes.find(fn => fn.entityRef === (n.data.entityRef || n.id));
        return domain
          ? {
              ...n,
              data: {
                ...n.data,
                name: domain.name,
                type: domain.type,
                external: domain.external,
                entityRef: domain.entityRef,
              },
            }
          : n;
      }),
      ...newRfNodes,
    ];

    const mergedRfEdges = finalSchema.dependencies.map(mapDomainDepToRFEdge);

    get().recordHistory();
    applyStateUpdates(set, get, mergedRfNodes, mergedRfEdges);

    const nextLoadedSystems = loadedSystems.map(sys =>
      sys.path === currentFilePath ? { ...sys, schema: finalSchema, name: finalSchema.name } : sys
    );
    set({ loadedSystems: nextLoadedSystems });
    void get().checkPendingChanges();

    return true;
  } catch (e: unknown) {
    const errorMsg =
      (e instanceof Error ? e.message : undefined) || 'Failed to import Mermaid diagram';
    set({ lastError: errorMsg });
    get().logger.error('Failed to import Mermaid diagram', e);
    return false;
  }
}
