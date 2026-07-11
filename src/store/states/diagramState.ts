import { applyNodeChanges, applyEdgeChanges } from '@xyflow/react';
import type { NodeChange, EdgeChange, Connection } from '@xyflow/react';
import type { UiState } from './uiState';
import type { IoState } from './ioState';
import type {
  SystemSchema,
  SystemNode,
  SystemDependency,
  NodeType,
  C4Level,
  WorkspaceManifest,
  ValidationResult,
} from '../../domain/schema';
import { validateGraph, parseSchemaFromYaml, serializeSchemaToYaml } from '../../domain/graph';
import { resolveRelativePath, resolveWorkspaceManifestState, getFileName } from '../../domain/path';
import {
  mapDomainNodeToRFNode,
  mapDomainDepToRFEdge,
  getClosestHandles,
  rebuildSchemaFromCanvas,
} from '../layoutUtils';
import type { BlueprintRFNode, BlueprintRFEdge, ComponentEdgeData } from '../layoutUtils';
import {
  defaultLoadedSystems,
  defaultLoadedManifests,
  defaultWorkspaceManifest,
  defaultWorkspaceManifestYaml,
  defaultInitialSchema,
} from '../defaultData';

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
  workspaceManifest: WorkspaceManifest | null;
  workspaceManifestYaml: string | null;
  workspaceManifestPath: string | null;
  loadedManifests: Array<{ path: string; manifest: WorkspaceManifest; yaml: string }>;
  loadedSystems: Array<{ path: string; name: string; schema: SystemSchema }>;

  initSchema: (schema: SystemSchema) => void;
  updateSchemaName: (name: string) => void;
  updateSchemaLevel: (level: C4Level) => void;
  importYaml: (yamlContent: string) => boolean;
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

  set({
    nodes: nextNodes,
    edges: highlightedEdges,
    schema: nextSchema,
    validationResult,
    yamlCode,
    loadedSystems: nextLoadedSystems,
  });
};

const initialNodes = defaultInitialSchema.nodes.map(mapDomainNodeToRFNode);
const initialEdges = defaultInitialSchema.dependencies.map(mapDomainDepToRFEdge).map(edge => {
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
const initialValidation = validateGraph(defaultInitialSchema);
const initialYaml = serializeSchemaToYaml(defaultInitialSchema);

type DiagramStateDeps = DiagramState & UiState & IoState;

export const createDiagramState = (
  set: (
    partial: Partial<DiagramStateDeps> | ((state: DiagramStateDeps) => Partial<DiagramStateDeps>),
    replace?: boolean
  ) => void,
  get: () => DiagramStateDeps
): DiagramState => ({
  schema: defaultInitialSchema,
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
  workspaceManifest: defaultWorkspaceManifest,
  workspaceManifestYaml: defaultWorkspaceManifestYaml,
  workspaceManifestPath: defaultWorkspaceManifest
    ? defaultLoadedManifests.find(m => m.manifest === defaultWorkspaceManifest)?.path || null
    : null,
  loadedManifests: defaultLoadedManifests,
  loadedSystems: defaultLoadedSystems,

  selectSystem: (path: string) => {
    const { loadedSystems, loadedManifests, logger } = get();
    const system = loadedSystems.find(s => s.path === path);
    if (!system) {
      logger.warn('System path not found in loaded systems', { path });
      return;
    }
    logger.info('Switching active system', { name: system.name, path });
    const manifestState = resolveWorkspaceManifestState(path, loadedManifests);
    set({
      currentFilePath: path,
      selectedNodeId: null,
      ...manifestState,
    });
    get().initSchema(system.schema);
  },

  initSchema: schema => {
    const rfNodes = schema.nodes.map(mapDomainNodeToRFNode);
    const rfEdges = schema.dependencies.map(mapDomainDepToRFEdge);
    applyStateUpdates(set, get, rfNodes, rfEdges, schema.name, schema.level, schema.parentRef);
  },

  updateSchemaName: name => {
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

      const manifestState = resolveWorkspaceManifestState(path, get().loadedManifests);
      set({
        currentFilePath: path,
        loadedSystems: newLoadedSystems,
        ...manifestState,
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
          c4Ref: 'c4Ref' in updates ? updates.c4Ref : rn.data.c4Ref,
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
    const { schema, currentFilePath, navigationStack, workspacePort, isWorkspaceOpen, logger } =
      get();
    const node = schema.nodes.find(n => n.id === nodeId);
    if (!node || !node.c4Ref) return false;

    logger.info('Zooming into sub-diagram', { node: node.name, ref: node.c4Ref });

    const targetPath = resolveRelativePath(currentFilePath, node.c4Ref);

    if (!isWorkspaceOpen) {
      const resolvedFileName = getFileName(targetPath);
      const found = get().loadedSystems.find(
        s => s.path === targetPath || s.path === resolvedFileName
      );
      if (found) {
        const newStack = [...navigationStack, { path: currentFilePath, schema }];
        const manifestState = resolveWorkspaceManifestState(found.path, get().loadedManifests);
        set({
          currentFilePath: found.path,
          navigationStack: newStack,
          selectedNodeId: null,
          ...manifestState,
        });
        get().initSchema(found.schema);
        return true;
      }

      logger.warn('Cannot zoom in: workspace directory not open.');
      set({ lastError: 'Please open a Workspace Folder to navigate C4 relative links.' });
      return false;
    }

    try {
      const content = await workspacePort.readFile(targetPath);
      const subSchema = parseSchemaFromYaml(content);

      const newStack = [...navigationStack, { path: currentFilePath, schema }];
      const manifestState = resolveWorkspaceManifestState(targetPath, get().loadedManifests);
      set({
        currentFilePath: targetPath,
        navigationStack: newStack,
        selectedNodeId: null,
        ...manifestState,
      });
      get().initSchema(subSchema);
      return true;
    } catch (err) {
      logger.error('Failed to load sub-diagram', err, { path: node.c4Ref });
      set({
        lastError: `Failed to load sub-diagram at ${node.c4Ref}: ${(err as Error).message}`,
      });
      return false;
    }
  },

  zoomOut: async () => {
    const {
      navigationStack,
      schema,
      currentFilePath,
      workspacePort,
      isWorkspaceOpen,
      workspaceManifest,
      logger,
    } = get();
    if (navigationStack.length > 0) {
      logger.info('Zooming out to parent diagram');
      const newStack = [...navigationStack];
      const parentState = newStack.pop();

      if (parentState) {
        const manifestState = resolveWorkspaceManifestState(
          parentState.path,
          get().loadedManifests
        );
        set({
          currentFilePath: parentState.path,
          navigationStack: newStack,
          selectedNodeId: null,
          ...manifestState,
        });
        get().initSchema(parentState.schema);
        return true;
      }
      return false;
    }

    let parentRefPath: string | null = null;
    if (workspaceManifest) {
      const currentName = getFileName(currentFilePath);
      const entry = workspaceManifest.hierarchy.find(h =>
        h.children.some(c => getFileName(c) === currentName)
      );
      if (entry) {
        parentRefPath = entry.parent;
      }
    }

    if (!parentRefPath && schema.parentRef) {
      parentRefPath = schema.parentRef;
    }

    if (parentRefPath) {
      logger.info('Zooming out to parent diagram via path lookup', { ref: parentRefPath });
      const targetPath = resolveRelativePath(currentFilePath, parentRefPath);

      if (!isWorkspaceOpen) {
        const resolvedFileName = getFileName(targetPath);
        const found = defaultLoadedSystems.find(
          s => s.path === targetPath || s.path === resolvedFileName
        );
        if (found) {
          const manifestState = resolveWorkspaceManifestState(found.path, get().loadedManifests);
          set({
            currentFilePath: found.path,
            selectedNodeId: null,
            ...manifestState,
          });
          get().initSchema(found.schema);
          return true;
        }
        logger.warn('Cannot zoom out: parent file not found in default systems.');
        return false;
      }

      try {
        const content = await workspacePort.readFile(targetPath);
        const parentSchema = parseSchemaFromYaml(content);

        const manifestState = resolveWorkspaceManifestState(targetPath, get().loadedManifests);
        set({
          currentFilePath: targetPath,
          selectedNodeId: null,
          ...manifestState,
        });
        get().initSchema(parentSchema);
        return true;
      } catch (err) {
        logger.error('Failed to load parent diagram', err, { path: parentRefPath });
        set({
          lastError: `Failed to load parent diagram at ${parentRefPath}: ${(err as Error).message}`,
        });
        return false;
      }
    }

    logger.info('Already at root of diagram, cannot zoom out');
    return false;
  },

  syncExternalContainers: () => {
    const { schema, currentFilePath, loadedSystems, logger } = get();
    if (schema.level !== 'component') {
      logger.warn('Sync external containers is only available on component-level diagrams.');
      return;
    }

    const parentSystem = loadedSystems.find(s => s.schema.level === 'container');
    if (!parentSystem) {
      logger.warn('No container-level schema found in active workspace to sync with.');
      return;
    }

    const currentFileName = getFileName(currentFilePath);
    const activeContainerNode = parentSystem.schema.nodes.find(n => {
      if (!n.c4Ref) return false;
      return getFileName(n.c4Ref) === currentFileName;
    });

    if (!activeContainerNode) {
      logger.warn(
        `Could not map the current component diagram to any container node in parent schema. Make sure a node has c4Ref referencing this component file.`
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
    } else {
      logger.info('All external container dependencies are already mapped on the canvas.');
    }
  },
});
