import { applyNodeChanges, applyEdgeChanges } from '@xyflow/react';
import type { NodeChange, EdgeChange, Connection } from '@xyflow/react';
import type { UiState } from './uiState';
import type { IoState } from './ioState';
import {
  parseSchemaFromYaml,
  parseSchemaFromJson,
  type SystemSchema,
  type SystemNode,
  type SystemDependency,
  type NodeType,
  type C4Level,
  type ValidationResult,
} from '@blueprint/core';
import { mapDomainNodeToRFNode, mapDomainDepToRFEdge } from '../layoutUtils';
import type { BlueprintRFNode, BlueprintRFEdge } from '../layoutUtils';
import { applyStateUpdates } from './diagramState/applyStateUpdates';
import { syncExternalContainers as syncExternalContainersAction } from './diagramState/syncExternalContainers';
import { importSchemaContent } from './diagramState/importSchema';
import { createDiagramInitialState } from './diagramState/initialState';
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
import { computeSchemaDiff } from '../../../infrastructure/db/db';

export interface DiagramState {
  schema: SystemSchema;
  nodes: BlueprintRFNode[];
  edges: BlueprintRFEdge[];
  selectedNodeId: string | null;
  validationResult: ValidationResult;
  yamlCode: string;
  lastError: string | null;
  currentFilePath: string;
  isWorkspaceOpen: boolean;
  workspaceName: string;
  loadedSystems: Array<{ path: string; name: string; schema: SystemSchema }>;
  nodeRefMap: Record<string, Record<string, string>>;
  past: Array<{ nodes: BlueprintRFNode[]; edges: BlueprintRFEdge[]; schema: SystemSchema }>;
  future: Array<{ nodes: BlueprintRFNode[]; edges: BlueprintRFEdge[]; schema: SystemSchema }>;
  hasPendingChanges: boolean;

  recordHistory: () => void;
  undo: () => void;
  redo: () => void;
  clearHistory: () => void;
  checkPendingChanges: () => Promise<void>;
  initSchema: (schema: SystemSchema) => void;
  updateSchemaName: (name: string) => void;
  updateSchemaLevel: (level: C4Level) => void;
  importYaml: (yamlContent: string) => boolean;
  importJson: (jsonContent: string) => boolean;
  clearError: () => void;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  addNode: (type: NodeType) => void;
  updateNode: (id: string, updates: Partial<SystemNode>) => void;
  deleteNode: (id: string) => void;
  selectNode: (id: string | null) => void;
  updateDependency: (from: string, to: string, updates: Partial<SystemDependency>) => void;
  deleteDependency: (from: string, to: string) => void;
  selectSystem: (path: string) => void;
  syncExternalContainers: () => void;
  /**
   * Apply the selected layout engine and sync positions into schema / YAML.
   * No-ops when no engine is selected.
   */
  applyClientLayout: (signal?: AbortSignal) => Promise<void>;
}

const initial = createDiagramInitialState();

type DiagramStateDeps = DiagramState & UiState & IoState;

export const createDiagramState = (set: any, get: () => DiagramStateDeps): DiagramState => ({
  schema: initial.schema,
  nodes: initial.nodes,
  edges: initial.edges,
  selectedNodeId: null,
  validationResult: initial.validationResult,
  yamlCode: initial.yamlCode,
  lastError: null,
  currentFilePath: initial.currentFilePath,
  isWorkspaceOpen: false,
  workspaceName: '',
  loadedSystems: initial.loadedSystems,
  nodeRefMap: initial.nodeRefMap,
  past: [],
  future: [],
  hasPendingChanges: false,

  checkPendingChanges: async () => {
    const { currentFilePath, hasPendingChanges } = get();
    if (!currentFilePath) return;
    try {
      const diff = await computeSchemaDiff(currentFilePath);
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
      // Ignore or log error
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

  selectSystem: (path: string) => {
    const { loadedSystems, logger } = get();
    const system = loadedSystems.find(s => s.path === path);
    if (!system) {
      logger.warn('System path not found in loaded systems', { path });
      return;
    }
    logger.info('Switching active system', { name: system.name, path });
    set({
      currentFilePath: path,
      selectedNodeId: null,
    });
    get().clearHistory();
    get().initSchema(system.schema);
  },

  initSchema: schema => {
    get().clearHistory();
    const rfNodes = schema.nodes.map(mapDomainNodeToRFNode);
    const rfEdges = schema.dependencies.map(mapDomainDepToRFEdge);
    applyStateUpdates(
      set,
      get,
      rfNodes,
      rfEdges,
      schema.name,
      schema.level,
      schema.entityRef ?? null
    );
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

  clearError: () => {
    set({ lastError: null });
  },

  onNodesChange: changes => {
    const hasRemoval = changes.some(c => c.type === 'remove');
    if (hasRemoval) {
      get().recordHistory();
    }
    const nextNodes = applyNodeChanges(changes, get().nodes) as unknown as BlueprintRFNode[];
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
    const nextEdges = applyEdgeChanges(
      persistedChanges,
      get().edges
    ) as unknown as BlueprintRFEdge[];
    applyStateUpdates(set, get, get().nodes, nextEdges);
  },

  onConnect: connection => {
    get().recordHistory();
    connectNodesMutation(set, get, connection);
  },

  addNode: type => {
    get().recordHistory();
    addNodeMutation(set, get, type);
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
      rightCollapsed: id ? false : get().rightCollapsed,
    });
  },

  updateDependency: (from, to, updates) => {
    get().recordHistory();
    updateDependencyMutation(set, get, from, to, updates);
  },

  deleteDependency: (from, to) => {
    get().recordHistory();
    deleteDependencyMutation(set, get, from, to);
  },

  syncExternalContainers: () => {
    syncExternalContainersAction(set, get);
  },

  applyClientLayout: async (signal?: AbortSignal) => {
    const { layoutEngine, layoutRegistry, nodes, edges, schema } = get();
    if (!layoutEngine || !schema?.nodes || !nodes) return;
    if (signal?.aborted) return;

    const positions = await computeClientLayout(layoutEngine, nodes, edges, layoutRegistry);
    if (signal?.aborted) return;
    const nextNodes = nodes.map(n => {
      const pos = positions.get(n.id);
      return pos ? { ...n, position: pos } : n;
    });
    const changed = nextNodes.some(
      (n, i) => n.position.x !== nodes[i]?.position.x || n.position.y !== nodes[i]?.position.y
    );
    if (!changed) return;
    get().recordHistory();
    applyStateUpdates(set, get, nextNodes, edges);
  },
});
