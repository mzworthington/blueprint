import { create } from 'zustand';
import { applyNodeChanges, applyEdgeChanges } from '@xyflow/react';
import type {
  Node as RFNode,
  Edge as RFEdge,
  NodeChange,
  EdgeChange,
  Connection,
} from '@xyflow/react';
import type {
  SystemSchema,
  SystemNode,
  SystemDependency,
  NodeType,
  DependencyType,
  ValidationResult,
  PropertyMap,
  C4Level,
} from '../domain/schema';
import { validateGraph, parseSchemaFromYaml, serializeSchemaToYaml } from '../domain/graph';
import type { FileSystemPort, WorkspacePort, LoggerPort } from '../domain/ports';
import { BrowserFileSystemAdapter, BrowserWorkspaceAdapter } from './fileSync';
import { ConsoleLoggerAdapter } from './telemetry';

export function resolveRelativePath(basePath: string, relativePath: string): string {
  if (relativePath.startsWith('/') || relativePath.includes('://')) {
    return relativePath;
  }
  const baseDir = basePath.split('/').slice(0, -1);
  const relParts = relativePath.split('/');

  for (const part of relParts) {
    if (part === '.' || part === '') {
      continue;
    } else if (part === '..') {
      baseDir.pop();
    } else {
      baseDir.push(part);
    }
  }
  return baseDir.join('/');
}
// Load all default blueprints in the blueprints directory at compile/run time via Vite
const defaultBlueprintModules = import.meta.glob<{ default: string }>('../../blueprints/*.ya?ml', {
  query: '?raw',
  eager: true,
});

const getFileName = (filePath: string) => {
  const parts = filePath.split('/');
  return parts[parts.length - 1];
};

// Strict UI node/edge schemas to decouple React Flow interfaces from pure domain models
export type ComponentNodeData = {
  [key: string]: unknown;
  id: string;
  type: NodeType;
  name: string;
  c4Ref?: string;
  external?: boolean;
  isTest?: boolean;
  properties: PropertyMap;
};

export type BlueprintRFNode = RFNode<ComponentNodeData, 'blueprintNode'>;

export type ComponentEdgeData = {
  [key: string]: unknown;
  type: DependencyType;
  description: string;
};

export type BlueprintRFEdge = RFEdge<ComponentEdgeData>;

interface BlueprintState {
  schema: SystemSchema;

  nodes: BlueprintRFNode[];
  edges: BlueprintRFEdge[];

  selectedNodeId: string | null;
  validationResult: ValidationResult;
  yamlCode: string;
  lastError: string | null;

  initSchema: (schema: SystemSchema) => void;
  updateSchemaName: (name: string) => void;
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

  fileSystemPort: FileSystemPort;
  saveSchema: () => Promise<boolean>;
  loadSchema: () => Promise<boolean>;

  workspacePort: WorkspacePort;
  currentFilePath: string;
  navigationStack: Array<{ path: string; schema: SystemSchema }>;
  isWorkspaceOpen: boolean;
  workspaceName: string;
  openWorkspaceDirectory: () => Promise<boolean>;
  zoomIntoNode: (nodeId: string) => Promise<boolean>;
  zoomOut: () => Promise<boolean>;
  saveActiveDiagram: () => Promise<boolean>;

  logger: LoggerPort;

  showTests: boolean;
  toggleShowTests: () => void;

  leftCollapsed: boolean;
  rightCollapsed: boolean;
  toggleLeftCollapsed: () => void;
  toggleRightCollapsed: () => void;

  loadedSystems: Array<{ path: string; name: string; schema: SystemSchema }>;
  selectSystem: (path: string) => void;
}
const mapDomainNodeToRFNode = (n: SystemNode): BlueprintRFNode => ({
  id: n.id,
  type: 'blueprintNode',
  position: { x: n.x ?? 150 + Math.random() * 200, y: n.y ?? 150 + Math.random() * 200 },
  data: {
    id: n.id,
    type: n.type,
    name: n.name,
    c4Ref: n.c4Ref,
    external: n.external,
    isTest: n.isTest,
    properties: n.properties || {},
  },
});

const mapDomainDepToRFEdge = (d: SystemDependency): BlueprintRFEdge => ({
  id: `edge-${d.from}-${d.to}`,
  source: d.from,
  target: d.to,
  type: 'default',
  animated: d.type === 'publish-subscribe',
  data: { type: d.type, description: d.description || '' },
  style: {
    strokeWidth: 2,
  },
});

const rebuildSchemaFromCanvas = (
  name: string,
  version: string,
  level: C4Level,
  parentRef: string | undefined,
  rfNodes: BlueprintRFNode[],
  rfEdges: BlueprintRFEdge[]
): SystemSchema => {
  const nodes: SystemNode[] = rfNodes.map(rn => ({
    id: rn.id,
    type: rn.data.type,
    name: rn.data.name,
    c4Ref: rn.data.c4Ref,
    external: rn.data.external,
    isTest: rn.data.isTest,
    properties: rn.data.properties,
    x: rn.position.x,
    y: rn.position.y,
  }));

  const dependencies: SystemDependency[] = rfEdges.map(re => ({
    from: re.source,
    to: re.target,
    type: re.data?.type || 'direct-call',
    description: re.data?.description || '',
  }));

  return { name, version, level, parentRef, nodes, dependencies };
};

let defaultInitialSchema: SystemSchema = {
  name: 'New Cloud Workspace',
  version: '1.0.0',
  level: 'container',
  nodes: [
    { id: 'gateway', type: 'rest-api', name: 'API Gateway', x: 100, y: 150 },
    { id: 'auth-svc', type: 'grpc-service', name: 'Auth Service', x: 400, y: 100 },
    { id: 'user-db', type: 'relational-database', name: 'User Relational DB', x: 700, y: 150 },
  ],
  dependencies: [
    { from: 'gateway', to: 'auth-svc', type: 'direct-call', description: 'Validate tokens' },
    { from: 'auth-svc', to: 'user-db', type: 'read-write', description: 'Fetch session records' },
  ],
};

const defaultLoadedSystems: Array<{ path: string; name: string; schema: SystemSchema }> = [];

Object.entries(defaultBlueprintModules).forEach(([filePath, module]) => {
  try {
    const yamlContent = module.default;
    const parsed = parseSchemaFromYaml(yamlContent);
    const fileName = getFileName(filePath);
    defaultLoadedSystems.push({
      path: fileName,
      name: parsed.name || fileName.replace(/\.ya?ml$/, ''),
      schema: parsed,
    });
  } catch (e) {
    console.error('Failed to parse default blueprint:', filePath, e);
  }
});

if (defaultLoadedSystems.length > 0) {
  defaultInitialSchema = defaultLoadedSystems[0].schema;
} else {
  defaultLoadedSystems.push({
    path: 'blueprint.yaml',
    name: defaultInitialSchema.name,
    schema: defaultInitialSchema,
  });
}

export const useBlueprintStore = create<BlueprintState>((set, get) => {
  const applyStateUpdates = (
    nextNodes: BlueprintRFNode[],
    nextEdges: BlueprintRFEdge[],
    customSchemaName?: string,
    customSchemaLevel?: C4Level,
    customParentRef?: string
  ) => {
    const currentSchema = get().schema;
    const name = customSchemaName ?? currentSchema.name;
    const version = currentSchema.version;
    const level = customSchemaLevel ?? currentSchema.level ?? 'container';
    const parentRef = customParentRef !== undefined ? customParentRef : currentSchema.parentRef;
    const nextSchema = rebuildSchemaFromCanvas(
      name,
      version,
      level,
      parentRef,
      nextNodes,
      nextEdges
    );

    // Validate
    const validationResult = validateGraph(nextSchema);
    const yamlCode = serializeSchemaToYaml(nextSchema);

    // Observability validation warnings
    if (!validationResult.isValid && get().logger) {
      get().logger.warn('Schema validation warnings triggered', {
        issues: validationResult.issues.map(i => ({
          type: i.type,
          message: i.message,
          path: i.path,
        })),
      });
    }

    // Apply validation highlights to edges involved in a cycle
    const cycleNodes = new Set(
      validationResult.issues
        .filter(issue => issue.type === 'cycle' && issue.path)
        .flatMap(issue => issue.path || [])
    );

    const highlightedEdges = nextEdges.map(edge => {
      const isCycleEdge = cycleNodes.has(edge.source) && cycleNodes.has(edge.target);
      return {
        ...edge,
        animated: edge.animated || isCycleEdge,
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
      get().loadedSystems?.map(sys => {
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
  const initialEdges = defaultInitialSchema.dependencies.map(mapDomainDepToRFEdge);
  const initialValidation = validateGraph(defaultInitialSchema);
  const initialYaml = serializeSchemaToYaml(defaultInitialSchema);

  return {
    schema: defaultInitialSchema,
    nodes: initialNodes,
    edges: initialEdges,
    selectedNodeId: null,
    validationResult: initialValidation,
    yamlCode: initialYaml,
    lastError: null,
    showTests: false,
    leftCollapsed: true,
    rightCollapsed: true,
    fileSystemPort: BrowserFileSystemAdapter,
    workspacePort: BrowserWorkspaceAdapter,
    currentFilePath:
      defaultLoadedSystems.length > 0 ? defaultLoadedSystems[0].path : 'blueprint.yaml',
    navigationStack: [],
    isWorkspaceOpen: false,
    workspaceName: '',
    logger: ConsoleLoggerAdapter,
    loadedSystems: defaultLoadedSystems,

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

    saveSchema: async () => {
      const { yamlCode, schema, fileSystemPort, logger } = get();
      const sanitizedName = schema.name.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
      const start = performance.now();
      logger.info('Initiating schema file write', { file: `${sanitizedName}.yaml` });

      try {
        const success = await fileSystemPort.saveSchema(
          yamlCode,
          `${sanitizedName || 'blueprint'}.yaml`
        );
        const duration = performance.now() - start;
        if (success) {
          logger.info('Schema file written successfully', { durationMs: Math.round(duration) });
        } else {
          logger.warn('Schema file write cancelled or failed', {
            durationMs: Math.round(duration),
          });
        }
        return success;
      } catch (err) {
        logger.error('Failed to save schema file', err);
        return false;
      }
    },

    loadSchema: async () => {
      const { fileSystemPort, importYaml, logger } = get();
      const start = performance.now();
      logger.info('Opening file dialog for schema load');

      try {
        const content = await fileSystemPort.loadSchema();
        const duration = performance.now() - start;
        if (content) {
          const success = importYaml(content);
          logger.info('Schema file loaded and parsed', {
            durationMs: Math.round(duration),
            success,
          });
          return success;
        }
        logger.info('Schema load cancelled by user', { durationMs: Math.round(duration) });
        return false;
      } catch (err) {
        logger.error('Failed to load schema file', err);
        return false;
      }
    },

    initSchema: schema => {
      const rfNodes = schema.nodes.map(mapDomainNodeToRFNode);
      const rfEdges = schema.dependencies.map(mapDomainDepToRFEdge);
      applyStateUpdates(rfNodes, rfEdges, schema.name, schema.level, schema.parentRef);
    },

    updateSchemaName: name => {
      applyStateUpdates(get().nodes, get().edges, name);
    },

    importYaml: yamlContent => {
      try {
        set({ lastError: null });
        const schema = parseSchemaFromYaml(yamlContent);
        const name = schema.name || 'imported_schema';
        const path = `${name.toLowerCase().replace(/[^a-z0-9_-]/g, '_')}.yaml`;

        const existingIndex = get().loadedSystems.findIndex(s => s.path === path);
        let newLoadedSystems = [...get().loadedSystems];
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

    clearError: () => {
      set({ lastError: null });
    },

    onNodesChange: changes => {
      const nextNodes = applyNodeChanges(changes, get().nodes) as unknown as BlueprintRFNode[];
      applyStateUpdates(nextNodes, get().edges);
    },

    onEdgesChange: changes => {
      const nextEdges = applyEdgeChanges(changes, get().edges) as unknown as BlueprintRFEdge[];
      applyStateUpdates(get().nodes, nextEdges);
    },

    onConnect: connection => {
      if (!connection.source || !connection.target) return;

      const newEdgeId = `edge-${connection.source}-${connection.target}`;

      // Skip if edge already exists
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

      applyStateUpdates(get().nodes, [...get().edges, newEdge]);
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
      applyStateUpdates([...get().nodes, newRFNode], get().edges);
    },

    updateNode: (id, updates) => {
      const nextNodes = get().nodes.map(rn => {
        if (rn.id === id) {
          const nextData = {
            ...rn.data,
            name: updates.name ?? rn.data.name,
            type: updates.type ?? rn.data.type,
            properties: updates.properties ?? rn.data.properties,
          };
          return {
            ...rn,
            data: nextData,
          };
        }
        return rn;
      });

      // If ID changed, we also need to update dependencies that reference it
      let nextEdges = get().edges;
      if (updates.id && updates.id !== id) {
        nextNodes.forEach(n => {
          if (n.id === id) {
            n.id = updates.id!;
            n.data.id = updates.id!;
          }
        });
        nextEdges = get().edges.map(re => {
          let updated = { ...re };
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

      applyStateUpdates(nextNodes, nextEdges);
    },

    deleteNode: id => {
      get().logger.info('Deleting node component from canvas', { id });
      const nextNodes = get().nodes.filter(n => n.id !== id);
      // Remove any edges referencing this node
      const nextEdges = get().edges.filter(e => e.source !== id && e.target !== id);

      const nextSelected = get().selectedNodeId === id ? null : get().selectedNodeId;
      set({ selectedNodeId: nextSelected });
      applyStateUpdates(nextNodes, nextEdges);
    },

    selectNode: id => {
      set({ selectedNodeId: id });
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
      applyStateUpdates(get().nodes, nextEdges);
    },

    deleteDependency: (from, to) => {
      const edgeId = `edge-${from}-${to}`;
      const nextEdges = get().edges.filter(e => e.id !== edgeId);
      applyStateUpdates(get().nodes, nextEdges);
    },

    toggleShowTests: () => {
      set(state => ({ showTests: !state.showTests }));
    },

    toggleLeftCollapsed: () => {
      set(state => ({ leftCollapsed: !state.leftCollapsed }));
    },

    toggleRightCollapsed: () => {
      set(state => ({ rightCollapsed: !state.rightCollapsed }));
    },

    openWorkspaceDirectory: async () => {
      const { workspacePort, logger } = get();
      logger.info('Opening workspace folder picker');
      try {
        const ok = await workspacePort.selectDirectory();
        if (!ok) return false;

        const files = await workspacePort.readDirectoryFiles();
        if (files.length === 0) {
          throw new Error('No blueprint .yaml or .yml files found in selected directory');
        }

        const nextLoadedSystems = files.map(file => {
          const schema = parseSchemaFromYaml(file.content);
          return {
            path: file.name,
            name: schema.name || file.name.replace(/\.ya?ml$/, ''),
            schema,
          };
        });

        const firstSystem = nextLoadedSystems[0];

        set({
          isWorkspaceOpen: true,
          workspaceName: workspacePort.getDirectoryName(),
          loadedSystems: nextLoadedSystems,
          currentFilePath: firstSystem.path,
          navigationStack: [],
        });
        get().initSchema(firstSystem.schema);
        return true;
      } catch (err) {
        logger.error('Failed to open workspace directory', err);
        set({ lastError: (err as Error).message || 'Failed to open workspace directory' });
        return false;
      }
    },

    zoomIntoNode: async (nodeId: string) => {
      const { schema, currentFilePath, navigationStack, workspacePort, isWorkspaceOpen, logger } =
        get();
      const node = schema.nodes.find(n => n.id === nodeId);
      if (!node || !node.c4Ref) return false;

      logger.info('Zooming into sub-diagram', { node: node.name, ref: node.c4Ref });

      if (!isWorkspaceOpen) {
        logger.warn('Cannot zoom in: workspace directory not open.');
        set({ lastError: 'Please open a Workspace Folder to navigate C4 relative links.' });
        return false;
      }

      try {
        const targetPath = resolveRelativePath(currentFilePath, node.c4Ref);
        const content = await workspacePort.readFile(targetPath);
        const subSchema = parseSchemaFromYaml(content);

        const newStack = [...navigationStack, { path: currentFilePath, schema }];
        set({
          currentFilePath: targetPath,
          navigationStack: newStack,
          selectedNodeId: null,
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
      const { navigationStack, logger } = get();
      if (navigationStack.length === 0) {
        logger.info('Already at root of diagram, cannot zoom out');
        return false;
      }

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
    },

    saveActiveDiagram: async () => {
      const { yamlCode, currentFilePath, workspacePort, isWorkspaceOpen, logger } = get();
      if (!isWorkspaceOpen) {
        return get().saveSchema();
      }

      logger.info('Saving active diagram directly to workspace', { path: currentFilePath });
      try {
        const success = await workspacePort.writeFile(currentFilePath, yamlCode);
        if (success) {
          logger.info('Diagram saved successfully');
        } else {
          logger.error('Failed to save diagram');
        }
        return success;
      } catch (err) {
        logger.error('Error saving diagram in workspace', err);
        return false;
      }
    },
  };
});
