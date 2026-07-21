import type { UiState } from './uiState';
import type { IoState } from './ioState';
import {
  parseSchemaFromYaml,
  parseSchemaFromJson,
  dedupeDependencies,
  assessSchemaVersion,
  normalizeGroupedNodePositions,
  hasGroupedLayout,
  prepareGroupedNodesForLayout,
  hasFinitePosition,
  type SchemaVersionAssessment,
  type SystemSchema,
  type SystemNode,
  type SystemDependency,
  type NodeType,
  type C4Level,
  type ValidationResult,
  type ConflictResolutions,
  type ExternalCandidateFilters,
  type IacSourceFile,
  type IacSourceKind,
  type WorkspaceEntity,
  type WorkspaceCatalogEntry,
} from '@blueprint/core';
import { ensureSystemLoaded } from './ioState/ensureSystemLoaded';
import type { CanvasNodeChange, CanvasEdgeChange, CanvasConnection } from '../../../core';
import {
  mapDomainNodesToRFNodes,
  mapDomainDepsToRFEdges,
  refreshGroupBoundsFromChildren,
  getNodeDimensions,
  sortNodesForReactFlow,
  layoutGroupedDomainNodes,
  shouldAutoLayoutOnLoad,
} from '../layoutUtils';
import type { BlueprintRFNode, BlueprintRFEdge } from '../layoutUtils';
import { applyStateUpdates } from './diagramState/applyStateUpdates';
import { syncExternalContainers as syncExternalContainersAction } from './diagramState/syncExternalContainers';
import {
  addExternalDependencies as addExternalDependenciesAction,
  listWorkspaceExternalCandidates as listWorkspaceExternalCandidatesAction,
  syncSuggestedExternals as syncSuggestedExternalsAction,
} from './diagramState/externalDependencies';
import { importSchemaContent } from './diagramState/importSchema';
import {
  executeMermaidImport,
  previewMermaidImport,
  type MermaidImportPreview,
} from './diagramState/importMermaid';
import {
  executeIacImport,
  previewIacImport,
  type IacImportPreview,
} from './diagramState/importIac';
import { createDiagramInitialState } from './diagramState/initialState';
import { activateBundledSandbox } from './diagramState/loadBundledSandbox';
import { resetToEmptyWorkspace as resetToEmptyWorkspaceAction } from './diagramState/resetToEmptyWorkspace';
import {
  addNodeMutation,
  updateNodeMutation,
  deleteNodeMutation,
} from './diagramState/nodeMutations';
import {
  connectNodesMutation,
  updateDependencyMutation,
  deleteDependencyMutation,
} from './diagramState/edgeMutations';
import { computeClientLayout } from '../../layout/computeClientLayout';

export interface DiagramState {
  schema: SystemSchema;
  nodes: BlueprintRFNode[];
  edges: BlueprintRFEdge[];
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  validationResult: ValidationResult;
  yamlCode: string;
  lastError: string | null;
  schemaVersionWarning: SchemaVersionAssessment | null;
  currentFilePath: string;
  isWorkspaceOpen: boolean;
  workspaceName: string;
  /** Lightweight workspace index (all diagrams). Full schemas live in loadedSystems. */
  workspaceCatalog: WorkspaceCatalogEntry[];
  loadedSystems: Array<{ path: string; name: string; schema: SystemSchema }>;
  nodeRefMap: Record<string, Record<string, string>>;
  past: Array<{ nodes: BlueprintRFNode[]; edges: BlueprintRFEdge[]; schema: SystemSchema }>;
  future: Array<{ nodes: BlueprintRFNode[]; edges: BlueprintRFEdge[]; schema: SystemSchema }>;
  hasPendingChanges: boolean;
  /** When true, canvas positions are written into schema/YAML on save. */
  layoutCustomized: boolean;
  /** Bumped on each initSchema so Canvas can run load layout + fitView. */
  layoutSessionId: number;

  recordHistory: () => void;
  undo: () => void;
  redo: () => void;
  clearHistory: () => void;
  checkPendingChanges: () => Promise<void>;
  initSchema: (schema: SystemSchema) => void;
  /** Blank canvas with no sandbox systems — used before Mermaid import from startup. */
  resetToEmptyWorkspace: () => void;
  updateSchemaName: (name: string) => void;
  updateSchemaLevel: (level: C4Level) => void;
  importYaml: (yamlContent: string) => boolean;
  importJson: (jsonContent: string) => boolean;
  previewMermaidImport: (mermaid: string) => MermaidImportPreview;
  importMermaid: (mermaid: string, resolutions: ConflictResolutions) => boolean;
  previewIacImport: (files: IacSourceFile[], kind?: IacSourceKind) => IacImportPreview;
  importIac: (
    files: IacSourceFile[],
    resolutions: ConflictResolutions,
    kind?: IacSourceKind
  ) => boolean;
  clearError: () => void;
  onNodesChange: (changes: CanvasNodeChange[]) => void;
  onEdgesChange: (changes: CanvasEdgeChange[]) => void;
  onConnect: (connection: CanvasConnection) => void;
  addNode: (type: NodeType, position?: { x: number; y: number }) => void;
  updateNode: (id: string, updates: Partial<SystemNode>) => void;
  deleteNode: (id: string) => void;
  selectNode: (id: string | null) => void;
  selectEdge: (id: string | null) => void;
  updateDependency: (from: string, to: string, updates: Partial<SystemDependency>) => void;
  deleteDependency: (from: string, to: string) => void;
  selectSystem: (path: string) => Promise<void>;
  listWorkspaceExternalCandidates: (filters?: ExternalCandidateFilters) => WorkspaceEntity[];
  addExternalDependencies: (entityRefs: string[]) => void;
  syncSuggestedExternals: () => void;
  syncExternalContainers: () => void;
  /**
   * Apply the selected layout engine and sync positions into schema / YAML.
   * Pass `persistToSchema: true` when the user explicitly requested layout.
   */
  applyClientLayout: (options?: {
    signal?: AbortSignal;
    persistToSchema?: boolean;
    recordHistory?: boolean;
    engine?: import('../../../core').LayoutEngineId;
  }) => Promise<void>;
  markLayoutCustomized: () => void;
  loadBundledSandbox: () => void;
}

const initial = createDiagramInitialState();

type DiagramStateDeps = DiagramState & UiState & IoState;

export const createDiagramState = (set: any, get: () => DiagramStateDeps): DiagramState => ({
  schema: initial.schema,
  nodes: initial.nodes,
  edges: initial.edges,
  selectedNodeId: null,
  selectedEdgeId: null,
  validationResult: initial.validationResult,
  yamlCode: initial.yamlCode,
  lastError: null,
  schemaVersionWarning: assessSchemaVersion(initial.schema.version),
  currentFilePath: initial.currentFilePath,
  isWorkspaceOpen: false,
  workspaceName: '',
  workspaceCatalog: [],
  loadedSystems: initial.loadedSystems,
  nodeRefMap: initial.nodeRefMap,
  past: [],
  future: [],
  hasPendingChanges: false,
  layoutCustomized: false,
  layoutSessionId: 0,

  checkPendingChanges: async () => {
    const { currentFilePath, hasPendingChanges, workingCopyPort } = get();
    if (!currentFilePath) return;
    try {
      const diff = await workingCopyPort.computeSchemaDiff(currentFilePath);
      const hasChanges =
        diff.nodes.added.length > 0 ||
        diff.nodes.modified.length > 0 ||
        diff.nodes.deleted.length > 0 ||
        diff.dependencies.added.length > 0 ||
        diff.dependencies.deleted.length > 0;
      if (hasPendingChanges !== hasChanges) {
        set({ hasPendingChanges: hasChanges });
      }
    } catch (e) {
      get().logger.error('Failed to compute pending changes diff', e);
    }
  },

  recordHistory: () => {
    const { nodes, edges, schema } = get();
    const snapshot = {
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
      schema: JSON.parse(JSON.stringify(schema)),
    };
    set({
      past: [...get().past, snapshot].slice(-50),
      future: [],
    });
  },

  undo: () => {
    const { past, future, nodes, edges, schema } = get();
    if (past.length === 0) return;

    const previous = past[past.length - 1];
    const newPast = past.slice(0, past.length - 1);
    const currentSnapshot = {
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
      schema: JSON.parse(JSON.stringify(schema)),
    };

    set({
      past: newPast,
      future: [currentSnapshot, ...future],
    });

    applyStateUpdates(set, get, previous.nodes, previous.edges);
  },

  redo: () => {
    const { past, future, nodes, edges, schema } = get();
    if (future.length === 0) return;

    const next = future[0];
    const newFuture = future.slice(1);
    const currentSnapshot = {
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
      schema: JSON.parse(JSON.stringify(schema)),
    };

    set({
      past: [...past, currentSnapshot],
      future: newFuture,
    });

    applyStateUpdates(set, get, next.nodes, next.edges);
  },

  clearHistory: () => {
    set({
      past: [],
      future: [],
    });
  },

  selectSystem: async (path: string) => {
    const { logger, isWorkspaceOpen, workspacePort, workingCopyPort } = get();

    if (!get().loadedSystems.some(s => s.path === path) && isWorkspaceOpen) {
      const ok = await ensureSystemLoaded(path, {
        workspacePort,
        workingCopyPort,
        logger,
        get,
        set,
      });
      if (!ok) {
        logger.warn('System path not found in workspace', { path });
        return;
      }
    }

    const system = get().loadedSystems.find(s => s.path === path);
    if (!system) {
      logger.warn('System path not found in loaded systems', { path });
      return;
    }
    logger.info('Switching active system', { name: system.name, path });
    set({
      currentFilePath: path,
      selectedNodeId: null,
      selectedEdgeId: null,
      focusedCyclePath: null,
    });
    get().clearHistory();
    get().initSchema(system.schema);
  },

  initSchema: schema => {
    get().clearHistory();
    set({ focusedCyclePath: null });
    const grouped = hasGroupedLayout(schema.nodes);
    const layoutCustomized = schema.nodes.some(hasFinitePosition);
    const normalized: SystemSchema = {
      ...schema,
      nodes: grouped
        ? prepareGroupedNodesForLayout(schema.nodes)
        : normalizeGroupedNodePositions(schema.nodes),
      dependencies: dedupeDependencies(schema.dependencies ?? []),
    };
    const needsAutoLayout = shouldAutoLayoutOnLoad(normalized);
    set({
      layoutCustomized,
      ...(needsAutoLayout && get().layoutEngine === null ? { layoutEngine: 'dagre' } : {}),
    });
    const rfNodes = sortNodesForReactFlow(
      refreshGroupBoundsFromChildren(mapDomainNodesToRFNodes(normalized.nodes))
    );
    const rfEdges = mapDomainDepsToRFEdges(normalized.dependencies);
    set({ schemaVersionWarning: assessSchemaVersion(normalized.version) });
    applyStateUpdates(
      set,
      get,
      rfNodes,
      rfEdges,
      normalized.name,
      normalized.level,
      normalized.entityRef ?? null,
      normalized.source
    );
    set({ layoutSessionId: get().layoutSessionId + 1 });
  },

  loadBundledSandbox: () => {
    activateBundledSandbox(set, get);
  },

  markLayoutCustomized: () => {
    if (!get().layoutCustomized) {
      set({ layoutCustomized: true });
    }
  },

  resetToEmptyWorkspace: () => {
    resetToEmptyWorkspaceAction(set, get);
  },

  updateSchemaName: name => {
    const level = get().schema.level;
    if (level === 'container' || level === 'context') {
      set({ workspaceName: name });
    }
    applyStateUpdates(set, get, get().nodes, get().edges, name);
  },

  updateSchemaLevel: level => {
    applyStateUpdates(set, get, get().nodes, get().edges, undefined, level);
  },

  importYaml: yamlContent => {
    try {
      const schema = parseSchemaFromYaml(yamlContent);
      return importSchemaContent(set, get, schema, 'YAML');
    } catch (e: unknown) {
      const errorMsg =
        (e instanceof Error ? e.message : undefined) ||
        'Failed to import YAML schema configuration';
      set({ lastError: errorMsg });
      get().logger.error('Failed to import YAML schema configuration', e);
      return false;
    }
  },

  importJson: jsonContent => {
    try {
      const schema = parseSchemaFromJson(jsonContent);
      return importSchemaContent(set, get, schema, 'JSON');
    } catch (e: unknown) {
      const errorMsg =
        (e instanceof Error ? e.message : undefined) ||
        'Failed to import JSON schema configuration';
      set({ lastError: errorMsg });
      get().logger.error('Failed to import JSON schema configuration', e);
      return false;
    }
  },

  previewMermaidImport: mermaid => {
    const { schema, loadedSystems, currentFilePath, workspaceName, isWorkspaceOpen } = get();
    return previewMermaidImport(mermaid, {
      baseSchema: schema,
      loadedSystems,
      currentFilePath,
      workspaceName,
      isWorkspaceOpen,
    });
  },

  importMermaid: (mermaid, resolutions) => executeMermaidImport(set, get, mermaid, resolutions),

  previewIacImport: (files, kind = 'auto') => {
    const { schema, loadedSystems, currentFilePath, workspaceName, isWorkspaceOpen } = get();
    return previewIacImport(
      files,
      {
        baseSchema: schema,
        loadedSystems,
        currentFilePath,
        workspaceName,
        isWorkspaceOpen,
      },
      kind
    );
  },

  importIac: (files, resolutions, kind = 'auto') =>
    executeIacImport(set, get, files, resolutions, kind),

  clearError: () => {
    set({ lastError: null });
  },

  onNodesChange: changes => {
    const hasRemoval = changes.some(c => c.type === 'remove');
    if (hasRemoval) {
      get().recordHistory();
    }
    const finishedDrag = changes.some(
      c => c.type === 'position' && 'dragging' in c && c.dragging === false
    );
    if (finishedDrag) {
      get().markLayoutCustomized();
    }
    const nextNodes = get().graphChangePort.applyNodeChanges(changes, get().nodes);
    applyStateUpdates(set, get, nextNodes, get().edges);
  },

  onEdgesChange: changes => {
    // Coupling overlays are display-only (id prefix `coupling-`) and must not mutate schema edges.
    const persistedChanges = changes.filter(
      change => !('id' in change) || !String(change.id).startsWith('coupling-')
    );
    if (persistedChanges.length === 0) return;
    const hasRemoval = persistedChanges.some(c => c.type === 'remove');
    if (hasRemoval) {
      get().recordHistory();
    }
    const nextEdges = get().graphChangePort.applyEdgeChanges(persistedChanges, get().edges);
    applyStateUpdates(set, get, get().nodes, nextEdges);
  },

  onConnect: connection => {
    get().recordHistory();
    connectNodesMutation(set, get, connection);
  },

  addNode: (type, position) => {
    get().recordHistory();
    addNodeMutation(set, get, type, position);
  },

  updateNode: (id, updates) => {
    get().recordHistory();
    updateNodeMutation(set, get, id, updates);
  },

  deleteNode: id => {
    get().recordHistory();
    deleteNodeMutation(set, get, id);
  },

  selectNode: id => {
    set({
      selectedNodeId: id,
      selectedEdgeId: id ? null : get().selectedEdgeId,
      rightCollapsed: id ? false : get().rightCollapsed,
    });
  },

  selectEdge: id => {
    set({
      selectedEdgeId: id,
      selectedNodeId: id ? null : get().selectedNodeId,
      rightCollapsed: id ? false : get().rightCollapsed,
    });
  },

  updateDependency: (from, to, updates) => {
    get().recordHistory();
    updateDependencyMutation(set, get, from, to, updates);
  },

  deleteDependency: (from, to) => {
    get().recordHistory();
    const { selectedEdgeId, edges } = get();
    const selected = edges.find(e => e.id === selectedEdgeId);
    deleteDependencyMutation(set, get, from, to);
    if (selected && selected.source === from && selected.target === to) {
      set({ selectedEdgeId: null });
    }
  },

  syncExternalContainers: () => {
    syncExternalContainersAction(set, get);
  },

  listWorkspaceExternalCandidates: (filters?: ExternalCandidateFilters) => {
    return listWorkspaceExternalCandidatesAction(get, filters);
  },

  addExternalDependencies: (entityRefs: string[]) => {
    get().recordHistory();
    addExternalDependenciesAction(set, get, entityRefs);
  },

  syncSuggestedExternals: () => {
    get().recordHistory();
    syncSuggestedExternalsAction(set, get);
  },

  applyClientLayout: async (options = {}) => {
    const {
      signal,
      persistToSchema = false,
      recordHistory = true,
      engine: engineOverride,
    } = options;
    const { layoutEngine, layoutRegistry, nodes, edges, schema } = get();
    if (!schema?.nodes || !nodes) return;
    if (signal?.aborted) return;

    const grouped = hasGroupedLayout(schema.nodes);
    const engine = engineOverride ?? layoutEngine ?? 'dagre';

    if (grouped) {
      const laidOut = await layoutGroupedDomainNodes(
        schema.nodes,
        schema.dependencies ?? [],
        engine,
        layoutRegistry
      );
      if (signal?.aborted) return;

      const nextNodes = sortNodesForReactFlow(
        refreshGroupBoundsFromChildren(mapDomainNodesToRFNodes(laidOut))
      );
      if (persistToSchema) {
        get().markLayoutCustomized();
      }
      if (recordHistory) {
        get().recordHistory();
      }
      applyStateUpdates(set, get, nextNodes, edges);
      return;
    }

    const packedNodes = refreshGroupBoundsFromChildren(nodes);
    const topLevelNodes = packedNodes.filter(n => !n.parentId);
    const layoutInput = topLevelNodes.map(n => {
      const dims = getNodeDimensions(n);
      return {
        id: n.id,
        measured: n.measured,
        width: dims.width,
        height: dims.height,
      };
    });

    const topLevelEdges = edges.filter(
      e => topLevelNodes.some(n => n.id === e.source) && topLevelNodes.some(n => n.id === e.target)
    );

    const positions = await computeClientLayout(engine, layoutInput, topLevelEdges, layoutRegistry);
    if (signal?.aborted) return;

    const nextNodes = sortNodesForReactFlow(
      refreshGroupBoundsFromChildren(
        packedNodes.map(n => {
          if (n.parentId) return n;
          const pos = positions.get(n.id);
          return pos ? { ...n, position: pos } : n;
        })
      )
    );

    const changed = nextNodes.some(
      (n, i) =>
        n.position.x !== nodes[i]?.position.x ||
        n.position.y !== nodes[i]?.position.y ||
        (n.style as { width?: number })?.width !== (nodes[i]?.style as { width?: number })?.width ||
        (n.style as { height?: number })?.height !==
          (nodes[i]?.style as { height?: number })?.height
    );
    if (!changed) return;
    if (persistToSchema) {
      get().markLayoutCustomized();
    }
    if (recordHistory) {
      get().recordHistory();
    }
    applyStateUpdates(set, get, nextNodes, edges);
  },
});
