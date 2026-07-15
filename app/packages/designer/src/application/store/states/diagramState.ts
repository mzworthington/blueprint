import { applyNodeChanges, applyEdgeChanges } from '@xyflow/react';
import type { NodeChange, EdgeChange, Connection } from '@xyflow/react';
import type { UiState } from './uiState';
import type { IoState } from './ioState';
import {
  validateGraph,
  parseSchemaFromYaml,
  parseSchemaFromJson,
  serializeSchemaToYaml,
} from '../../../core';
import {
  type SystemSchema,
  type SystemNode,
  type SystemDependency,
  type NodeType,
  type C4Level,
  type ValidationResult,
  resolveWorkspaceEntityRefs,
  slugify,
} from '@blueprint/core';
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

const applyStateUpdates = (
  set: any,
  get: any,
  nextNodes: BlueprintRFNode[],
  nextEdges: BlueprintRFEdge[],
  customSchemaName?: string,
  customSchemaLevel?: C4Level,
  customId?: string | null,
  customEntityRef?: string | null
) => {
  const currentSchema = get().schema;
  const name = customSchemaName ?? currentSchema.name;
  const version = currentSchema.version;
  const level = customSchemaLevel ?? currentSchema.level;
  const id = customId !== undefined ? (customId === null ? undefined : customId) : currentSchema.id;
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
    id,
    nextNodes,
    edgesWithHandles,
    entityRef
  );

  const nextLoadedSystems =
    get().loadedSystems?.map((sys: any) => {
      if (sys.path === get().currentFilePath) {
        return { ...sys, name: nextSchema.name, schema: nextSchema };
      }
      return sys;
    }) || [];

  let workspaceName = get().workspaceName;
  const nameChanged = name !== get().schema.name;
  if (!get().isWorkspaceOpen && nameChanged && (level === 'container' || level === 'context')) {
    workspaceName = name;
  } else if (!workspaceName && (level === 'container' || level === 'context')) {
    workspaceName = name;
  }

  const resolved = resolveWorkspaceEntityRefs(nextLoadedSystems, workspaceName);
  const currentFilePath = get().currentFilePath;
  const fileRefMap = resolved.nodeRefMap[currentFilePath] || {};
  const activeResolvedSchema = resolved.schemas[currentFilePath];
  const systemId =
    activeResolvedSchema?.entityRef || slugify(workspaceName || '').replace(/_/g, '-') || 'default';

  // Map nextSchema nodes and dependencies to fully resolved FQNs
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
    const entityRef =
      node.data.entityRef && node.data.entityRef.includes('/')
        ? node.data.entityRef
        : fileRefMap[node.id] || fileRefMap[node.data.entityRef || ''] || `${systemId}/${node.id}`;
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
    : nextSchemaMapped;

  set({
    workspaceName,
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
const initialValidation = validateGraph(initialSchemaResolved);
const initialYaml = serializeSchemaToYaml(initialSchemaResolved);

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
    applyStateUpdates(
      set,
      get,
      rfNodes,
      rfEdges,
      schema.name,
      schema.level,
      schema.id ?? null,
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

    const activeContainerNode = parentSystem.schema.nodes.find(n => n.entityRef === schema.id);

    if (!activeContainerNode) {
      logger.warn(
        `Could not map the current component diagram to any container node in parent schema. Make sure the schema has a valid id.`
      );
      return;
    }

    const relatedContainerIds = new Set<string>();
    parentSystem.schema.dependencies.forEach(dep => {
      if (dep.from === activeContainerNode.entityRef) {
        relatedContainerIds.add(dep.to);
      } else if (dep.to === activeContainerNode.entityRef) {
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
        const extNode = parentSystem.schema.nodes.find(n => n.entityRef === extId);
        if (extNode) {
          maxX += 180;
          if (maxX > 600) {
            maxX = 100;
            maxY += 120;
          }

          const newRFNode = mapDomainNodeToRFNode({
            entityRef: extNode.entityRef,
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
