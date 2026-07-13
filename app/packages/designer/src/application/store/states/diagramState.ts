import { applyNodeChanges, applyEdgeChanges } from '@xyflow/react';
import type { NodeChange, EdgeChange, Connection } from '@xyflow/react';
import type { UiState } from './uiState';
import type { IoState } from './ioState';
import {
  type SystemSchema,
  type SystemNode,
  type SystemDependency,
  type NodeType,
  type C4Level,
  type ValidationResult,
  validateGraph,
  parseSchemaFromYaml,
  parseSchemaFromJson,
  serializeSchemaToYaml,
  resolveWorkspaceEntityRefs,
  getSystemIdFromPath,
  isEntityRef,
} from '../../../core';
import {
  mapDomainNodeToRFNode,
  mapDomainDepToRFEdge,
  getClosestHandles,
  rebuildSchemaFromCanvas,
} from '../layoutUtils';
import type { BlueprintRFNode, BlueprintRFEdge, ComponentEdgeData } from '../layoutUtils';
import { defaultLoadedSystems, defaultInitialSchema } from '../defaultData';
import { saveWorkingSchema, saveBaselineSchema } from '../../../infrastructure/db/db';

export interface DiagramState {
  schema: SystemSchema;
  nodes: BlueprintRFNode[];
  edges: BlueprintRFEdge[];
  selectedNodeId: string | null;
  validationResult: ValidationResult;
  yamlCode: string;
  lastError: string | null;
  currentFilePath: string;
  navigationStack: Array<{ path: string; schema: SystemSchema }>;
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
  zoomIntoNode: (nodeId: string) => Promise<boolean>;
  zoomOut: () => Promise<boolean>;
  selectSystem: (path: string) => void;
  syncExternalContainers: () => void;
}

const applyStateUpdates = (
  set: any,
  get: any,
  nextNodes: BlueprintRFNode[],
  nextEdges: BlueprintRFEdge[],
  customSchemaName?: string,
  customSchemaLevel?: C4Level,
  customParentRef?: string
) => {
  const currentSchema = get().schema;
  const name = customSchemaName ?? currentSchema.name;
  const version = currentSchema.version;
  const level = customSchemaLevel ?? currentSchema.level;
  const parentRef = customParentRef !== undefined ? customParentRef : currentSchema.parentRef;

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
    parentRef,
    nextNodes,
    edgesWithHandles
  );

  const validationResult = validateGraph(nextSchema);
  const yamlCode = serializeSchemaToYaml(nextSchema);

  if (!validationResult.isValid && get().logger) {
    get().logger.warn('Schema validation warnings triggered', {
      issues: validationResult.issues.map((i: any) => ({
        type: i.type,
        message: i.message,
        path: i.path,
      })),
    });
  }

  const cycleNodes = new Set(
    validationResult.issues
      .filter((issue: any) => issue.type === 'cycle' && issue.path)
      .flatMap((issue: any) => issue.path || [])
  );

  const highlightedEdges = edgesWithHandles.map(edge => {
    const isCycleEdge = cycleNodes.has(edge.source) && cycleNodes.has(edge.target);
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

  const nextLoadedSystems =
    get().loadedSystems?.map((sys: any) => {
      if (sys.path === get().currentFilePath) {
        return { ...sys, name: nextSchema.name, schema: nextSchema };
      }
      return sys;
    }) || [];

  const resolved = resolveWorkspaceEntityRefs(nextLoadedSystems, get().workspaceName);
  const currentFilePath = get().currentFilePath;
  const fileRefMap = resolved.nodeRefMap[currentFilePath] || {};
  const systemId = getSystemIdFromPath(currentFilePath);

  const resolvedNextNodes = nextNodes.map(node => {
    const entityRef = fileRefMap[node.id] || `${systemId}/${node.id}`;
    return {
      ...node,
      data: {
        ...node.data,
        entityRef,
      },
    };
  });

  const resolvedSchema = resolved.schemas[currentFilePath]
    ? resolved.schemas[currentFilePath]
    : {
        ...nextSchema,
        nodes: nextSchema.nodes.map(node => ({
          ...node,
          entityRef: fileRefMap[node.id] || `${systemId}/${node.id}`,
        })),
      };

  set({
    nodes: resolvedNextNodes,
    edges: highlightedEdges,
    schema: resolvedSchema,
    validationResult,
    yamlCode,
    loadedSystems: nextLoadedSystems.map((sys: any) => ({
      ...sys,
      schema: resolved.schemas[sys.path] || sys.schema,
    })),
    nodeRefMap: resolved.nodeRefMap,
  });

  // Sync working version to IndexedDB asynchronously
  saveWorkingSchema(currentFilePath, resolvedSchema, systemId, fileRefMap).catch((err: any) => {
    if (get().logger) {
      get().logger.error('Failed to sync working schema to IndexedDB', err);
    }
  });
};

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

const initialNodes = initialSchemaResolved.nodes.map(mapDomainNodeToRFNode).map(node => {
  const defaultPath = defaultLoadedSystems[0]?.path || 'blueprint.yaml';
  const fileRefMap = resolvedInitial.nodeRefMap[defaultPath] || {};
  const sysId = defaultLoadedSystems[0]
    ? getSystemIdFromPath(defaultLoadedSystems[0].path)
    : 'default';
  const entityRef = fileRefMap[node.id] || `${sysId}/${node.id}`;
  return {
    ...node,
    data: {
      ...node.data,
      entityRef,
    },
  };
});
const initialEdges = initialSchemaResolved.dependencies.map(mapDomainDepToRFEdge).map(edge => {
  const sourceNode = initialNodes.find(n => n.id === edge.source);
  const targetNode = initialNodes.find(n => n.id === edge.target);
  if (!sourceNode || !targetNode) return edge;
  const { sourceHandle, targetHandle } = getClosestHandles(sourceNode, targetNode);
  return {
    ...edge,
    sourceHandle,
    targetHandle,
  };
});
const initialValidation = validateGraph(initialSchemaResolved);
const initialYaml = serializeSchemaToYaml(initialSchemaResolved);

// Seed database with default systems asynchronously on startup
setTimeout(() => {
  initialLoadedSystemsResolved.forEach(sys => {
    const sysId = getSystemIdFromPath(sys.path);
    const fileRefMap = resolvedInitial.nodeRefMap[sys.path] || {};
    saveBaselineSchema(sys.path, sys.schema, sysId, fileRefMap).catch(() => {});
    saveWorkingSchema(sys.path, sys.schema, sysId, fileRefMap).catch(() => {});
  });
}, 100);

type DiagramStateDeps = DiagramState & UiState & IoState;

export const createDiagramState = (set: any, get: () => DiagramStateDeps): DiagramState => ({
  schema: initialSchemaResolved,
  nodes: initialNodes,
  edges: initialEdges,
  selectedNodeId: null,
  validationResult: initialValidation,
  yamlCode: initialYaml,
  lastError: null,
  currentFilePath:
    defaultLoadedSystems.length > 0 ? defaultLoadedSystems[0].path : 'blueprint.yaml',
  navigationStack: [],
  isWorkspaceOpen: false,
  workspaceName: '',
  loadedSystems: initialLoadedSystemsResolved,
  nodeRefMap: resolvedInitial.nodeRefMap,

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
    applyStateUpdates(set, get, rfNodes, rfEdges, schema.name, schema.level, schema.parentRef);
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
      set({ lastError: null });
      const schema = parseSchemaFromYaml(yamlContent);
      const name = schema.name || 'imported_schema';
      const path = `${name.toLowerCase().replace(/[^a-z0-9_-]/g, '_')}.yaml`;

      const existingIndex = get().loadedSystems.findIndex(s => s.path === path);
      const newLoadedSystems = [...get().loadedSystems];
      if (existingIndex >= 0) {
        newLoadedSystems[existingIndex] = { path, name, schema };
      } else {
        newLoadedSystems.push({ path, name, schema });
      }

      set({
        currentFilePath: path,
        loadedSystems: newLoadedSystems,
      });
      get().initSchema(schema);
      return true;
    } catch (e: any) {
      const errorMsg = e.message || 'Failed to import YAML schema configuration';
      set({ lastError: errorMsg });
      get().logger.error('Failed to import YAML schema configuration', e);
      return false;
    }
  },

  importJson: jsonContent => {
    try {
      set({ lastError: null });
      const schema = parseSchemaFromJson(jsonContent);
      const name = schema.name || 'imported_schema';
      const path = `${name.toLowerCase().replace(/[^a-z0-9_-]/g, '_')}.yaml`;

      const existingIndex = get().loadedSystems.findIndex(s => s.path === path);
      const newLoadedSystems = [...get().loadedSystems];
      if (existingIndex >= 0) {
        newLoadedSystems[existingIndex] = { path, name, schema };
      } else {
        newLoadedSystems.push({ path, name, schema });
      }

      set({
        currentFilePath: path,
        loadedSystems: newLoadedSystems,
      });
      get().initSchema(schema);
      return true;
    } catch (e: any) {
      const errorMsg = e.message || 'Failed to import JSON schema configuration';
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
    const id = `${type}-${Date.now().toString().slice(-4)}`;
    const name = `New ${type
      .split('-')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')}`;
    const newDomainNode: SystemNode = {
      id,
      type,
      name,
      properties: {},
      x: 100 + Math.random() * 200,
      y: 100 + Math.random() * 200,
    };

    get().logger.info('Instantiating new visual node component', { id, type, name });

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
    if (updates.id && updates.id !== id) {
      nextNodes.forEach(n => {
        if (n.id === id) {
          n.id = updates.id!;
          n.data.id = updates.id!;
        }
      });
      nextEdges = get().edges.map(re => {
        const updated = { ...re };
        if (re.source === id) {
          updated.source = updates.id!;
          updated.id = `edge-${updates.id}-${re.target}`;
        }
        if (re.target === id) {
          updated.target = updates.id!;
          updated.id = `edge-${re.source}-${updates.id}`;
        }
        return updated;
      });

      if (get().selectedNodeId === id) {
        set({ selectedNodeId: updates.id });
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

  zoomIntoNode: async (nodeId: string) => {
    const { schema, currentFilePath, navigationStack, loadedSystems, logger } = get();
    const node = schema.nodes.find(n => n.id === nodeId);
    if (!node) return false;

    const entityRef = node.entityRef || `${getSystemIdFromPath(currentFilePath)}/${node.id}`;
    const targetSystem = loadedSystems.find(s => s.schema.parentRef === entityRef);

    if (targetSystem) {
      logger.info('Zooming into sub-diagram via entityRef', { node: node.name, entityRef });
      const newStack = [...navigationStack, { path: currentFilePath, schema }];
      set({
        currentFilePath: targetSystem.path,
        navigationStack: newStack,
        selectedNodeId: null,
      });
      get().initSchema(targetSystem.schema);
      return true;
    }

    return false;
  },

  zoomOut: async () => {
    const { navigationStack, schema, loadedSystems, logger } = get();
    if (navigationStack.length > 0) {
      logger.info('Zooming out to parent diagram');
      const newStack = [...navigationStack];
      const parentState = newStack.pop();

      if (parentState) {
        set({
          currentFilePath: parentState.path,
          navigationStack: newStack,
          selectedNodeId: null,
        });
        get().initSchema(parentState.schema);
        return true;
      }
      return false;
    }

    if (schema.parentRef && isEntityRef(schema.parentRef)) {
      const parentSystem = loadedSystems.find(s =>
        s.schema.nodes.some(n => n.entityRef === schema.parentRef)
      );
      if (parentSystem) {
        logger.info('Zooming out to parent diagram via entityRef lookup', {
          parentRef: schema.parentRef,
        });
        set({
          currentFilePath: parentSystem.path,
          selectedNodeId: null,
        });
        get().initSchema(parentSystem.schema);
        return true;
      }
    }

    logger.info('Already at root of diagram, cannot zoom out');
    return false;
  },

  syncExternalContainers: () => {
    const { schema, loadedSystems, logger } = get();
    if (schema.level !== 'component') {
      logger.warn('Sync external containers is only available on component-level diagrams.');
      return;
    }

    const parentSystem = loadedSystems.find(s => s.schema.level === 'container');
    if (!parentSystem) {
      logger.warn('No container-level schema found in active workspace to sync with.');
      return;
    }

    const activeContainerNode = parentSystem.schema.nodes.find(
      n => n.entityRef === schema.parentRef
    );

    if (!activeContainerNode) {
      logger.warn(
        `Could not map the current component diagram to any container node in parent schema. Make sure the schema has a valid parentRef.`
      );
      return;
    }

    const relatedContainerIds = new Set<string>();
    parentSystem.schema.dependencies.forEach(dep => {
      if (dep.from === activeContainerNode.id) {
        relatedContainerIds.add(dep.to);
      } else if (dep.to === activeContainerNode.id) {
        relatedContainerIds.add(dep.from);
      }
    });

    if (relatedContainerIds.size === 0) {
      logger.info('No external container dependencies found in parent schema to sync.');
      return;
    }

    let addedCount = 0;
    const currentNodes = [...get().nodes];

    let maxX = 100;
    let maxY = 100;
    currentNodes.forEach(n => {
      if (n.position.x > maxX) maxX = n.position.x;
      if (n.position.y > maxY) maxY = n.position.y;
    });

    relatedContainerIds.forEach(extId => {
      const existingNodeIndex = currentNodes.findIndex(n => n.id === extId);
      if (existingNodeIndex >= 0) {
        const node = currentNodes[existingNodeIndex];
        if (!node.data.external) {
          currentNodes[existingNodeIndex] = {
            ...node,
            data: {
              ...node.data,
              external: true,
            },
          };
          addedCount++;
        }
      } else {
        const extNode = parentSystem.schema.nodes.find(n => n.id === extId);
        if (extNode) {
          maxX += 180;
          if (maxX > 600) {
            maxX = 100;
            maxY += 120;
          }

          const newRFNode = mapDomainNodeToRFNode({
            id: extNode.id,
            type: extNode.type,
            name: `${extNode.name} (External)`,
            external: true,
            properties: extNode.properties,
            x: maxX,
            y: maxY,
          });
          currentNodes.push(newRFNode);
          addedCount++;
        }
      }
    });

    if (addedCount > 0) {
      logger.info(`Successfully synced and imported ${addedCount} external container nodes.`);
      applyStateUpdates(set, get, currentNodes, get().edges);
      get().setNotification?.({
        type: 'success',
        title: 'Sync Externals',
        message: `Successfully synced and imported ${addedCount} external container nodes.`,
      });
    } else {
      logger.info('All external container dependencies are already mapped on the canvas.');
      get().setNotification?.({
        type: 'info',
        title: 'Sync Externals',
        message: 'All external container dependencies are already mapped on the canvas.',
      });
    }
  },
});
