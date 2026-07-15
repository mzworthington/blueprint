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
import type { BlueprintRFNode, BlueprintRFEdge, ComponentEdgeData } from '../layoutUtils';
import { applyStateUpdates } from './diagramState/applyStateUpdates';
import { syncExternalContainers as syncExternalContainersAction } from './diagramState/syncExternalContainers';
import { importSchemaContent } from './diagramState/importSchema';
import { createDiagramInitialState } from './diagramState/initialState';

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
    get().initSchema(system.schema);
  },

  initSchema: schema => {
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
    const nextNodes = applyNodeChanges(changes, get().nodes) as unknown as BlueprintRFNode[];
    applyStateUpdates(set, get, nextNodes, get().edges);
  },

  onEdgesChange: changes => {
    const nextEdges = applyEdgeChanges(changes, get().edges) as unknown as BlueprintRFEdge[];
    applyStateUpdates(set, get, get().nodes, nextEdges);
  },

  onConnect: connection => {
    if (!connection.source || !connection.target) return;

    const newEdgeId = `edge-${connection.source}-${connection.target}`;

    if (get().edges.some(e => e.id === newEdgeId)) return;

    get().logger.info('Establishing connection edge between component nodes', {
      from: connection.source,
      to: connection.target,
      type: 'direct-call',
    });

    const newEdge: BlueprintRFEdge = {
      id: newEdgeId,
      source: connection.source,
      target: connection.target,
      type: 'default',
      data: { type: 'direct-call', description: '' },
      style: { strokeWidth: 2 },
    };

    applyStateUpdates(set, get, get().nodes, [...get().edges, newEdge]);
  },

  addNode: type => {
    const entityRef = `${type}-${Date.now().toString().slice(-4)}`;
    const name = `New ${type
      .split('-')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')}`;
    const newDomainNode: SystemNode = {
      entityRef,
      type,
      name,
      properties: {},
      x: 100 + Math.random() * 200,
      y: 100 + Math.random() * 200,
    };

    get().logger.info('Instantiating new visual node component', { entityRef, type, name });

    const newRFNode = mapDomainNodeToRFNode(newDomainNode);
    applyStateUpdates(set, get, [...get().nodes, newRFNode], get().edges);
  },

  updateNode: (id, updates) => {
    const nextNodes = get().nodes.map(rn => {
      if (rn.id === id) {
        const nextData = {
          ...rn.data,
          name: updates.name ?? rn.data.name,
          type: updates.type ?? rn.data.type,
          properties: updates.properties ?? rn.data.properties,
          external: updates.external !== undefined ? updates.external : rn.data.external,
          isTest: updates.isTest !== undefined ? updates.isTest : rn.data.isTest,
        };
        return {
          ...rn,
          data: nextData,
        };
      }
      return rn;
    });

    let nextEdges = get().edges;
    if (updates.entityRef && updates.entityRef !== id) {
      nextNodes.forEach(n => {
        if (n.id === id) {
          n.id = updates.entityRef!;
          n.data.id = updates.entityRef!;
          n.data.entityRef = updates.entityRef!;
        }
      });
      nextEdges = get().edges.map(re => {
        const updated = { ...re };
        if (re.source === id) {
          updated.source = updates.entityRef!;
          updated.id = `edge-${updates.entityRef}-${re.target}`;
        }
        if (re.target === id) {
          updated.target = updates.entityRef!;
          updated.id = `edge-${re.source}-${updates.entityRef}`;
        }
        return updated;
      });

      if (get().selectedNodeId === id) {
        set({ selectedNodeId: updates.entityRef });
      }
    }

    applyStateUpdates(set, get, nextNodes, nextEdges);
  },

  deleteNode: id => {
    get().logger.info('Deleting node component from canvas', { id });
    const nextNodes = get().nodes.filter(n => n.id !== id);
    const nextEdges = get().edges.filter(e => e.source !== id && e.target !== id);
    const nextSelected = get().selectedNodeId === id ? null : get().selectedNodeId;
    set({ selectedNodeId: nextSelected });
    applyStateUpdates(set, get, nextNodes, nextEdges);
  },

  selectNode: id => {
    set({
      selectedNodeId: id,
      rightCollapsed: id ? false : get().rightCollapsed,
    });
  },

  updateDependency: (from, to, updates) => {
    const edgeId = `edge-${from}-${to}`;
    const nextEdges = get().edges.map(e => {
      if (e.id === edgeId) {
        const nextData = {
          ...e.data,
          type: updates.type ?? e.data?.type,
          description: updates.description ?? e.data?.description,
        } as ComponentEdgeData;
        return {
          ...e,
          data: nextData,
          animated: nextData.type === 'publish-subscribe',
        };
      }
      return e;
    });
    applyStateUpdates(set, get, get().nodes, nextEdges);
  },

  deleteDependency: (from, to) => {
    const edgeId = `edge-${from}-${to}`;
    const nextEdges = get().edges.filter(e => e.id !== edgeId);
    applyStateUpdates(set, get, get().nodes, nextEdges);
  },

  syncExternalContainers: () => {
    syncExternalContainersAction(set, get);
  },
});
