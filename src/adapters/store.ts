import { create } from 'zustand';
import { applyNodeChanges, applyEdgeChanges } from '@xyflow/react';
import * as yaml from 'js-yaml';
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
  WorkspaceManifest,
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

const defaultBlueprintModules = import.meta.glob<{ default: string }>(
  '../../blueprints/*.{yaml,yml}',
  {
    query: '?raw',
    eager: true,
  }
);

const getFileName = (filePath: string) => {
  const parts = filePath.split('/');
  return parts[parts.length - 1];
};

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

  workspaceManifest: WorkspaceManifest | null;
  workspaceManifestYaml: string | null;
  saveWorkspaceManifest: (manifestYaml: string) => Promise<boolean>;
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
  label: d.description || undefined,
  style: {
    strokeWidth: 2,
  },
  labelStyle: { fill: '#94a3b8', fontSize: 10, fontWeight: 500 },
  labelBgStyle: { fill: '#020617', fillOpacity: 0.85 },
  labelBgPadding: [6, 4] as [number, number],
  labelBgBorderRadius: 4,
});

const getClosestHandles = (
  sourceNode: BlueprintRFNode,
  targetNode: BlueprintRFNode
): { sourceHandle: string; targetHandle: string } => {
  const aw = sourceNode.measured?.width ?? 256;
  const ah = sourceNode.measured?.height ?? 120;
  const ax = sourceNode.position.x;
  const ay = sourceNode.position.y;

  const bw = targetNode.measured?.width ?? 256;
  const bh = targetNode.measured?.height ?? 120;
  const bx = targetNode.position.x;
  const by = targetNode.position.y;

  const cxA = ax + aw / 2;
  const cyA = ay + ah / 2;
  const cxB = bx + bw / 2;
  const cyB = by + bh / 2;

  const dx = cxB - cxA;
  const dy = cyB - cyA;

  if (Math.abs(dx) > Math.abs(dy)) {
    if (dx > 0) {
      return { sourceHandle: 'right-source', targetHandle: 'left-target' };
    } else {
      return { sourceHandle: 'left-source', targetHandle: 'right-target' };
    }
  } else {
    if (dy > 0) {
      return { sourceHandle: 'bottom-source', targetHandle: 'top-target' };
    } else {
      return { sourceHandle: 'top-source', targetHandle: 'bottom-target' };
    }
  }
};

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

export let defaultInitialSchema: SystemSchema = {
  name: 'Empty Workspace',
  version: '1.0.0',
  level: 'context',
  nodes: [],
  dependencies: [],
};

export const defaultLoadedSystems: Array<{ path: string; name: string; schema: SystemSchema }> = [];
export let defaultWorkspaceManifest: WorkspaceManifest | null = null;
export let defaultWorkspaceManifestYaml: string | null = null;

Object.entries(defaultBlueprintModules).forEach(([filePath, module]) => {
  const fileName = getFileName(filePath);
  if (fileName === 'workspace.yaml' || fileName.endsWith('-workspace.yaml')) {
    try {
      const yamlContent = module.default;
      defaultWorkspaceManifest = yaml.load(yamlContent) as WorkspaceManifest;
      defaultWorkspaceManifestYaml = yamlContent;
    } catch (e) {
      console.error('Failed to parse default workspace manifest:', filePath, e);
    }
    return;
  }
  try {
    const yamlContent = module.default;
    const parsed = parseSchemaFromYaml(yamlContent);
    defaultLoadedSystems.push({
      path: fileName,
      name: parsed.name || fileName.replace(/\.ya?ml$/, ''),
      schema: parsed,
    });
  } catch (e) {
    console.error('Failed to parse default blueprint:', filePath, e);
  }
});

defaultLoadedSystems.sort((a, b) => {
  const levels: Record<string, number> = { context: 1, container: 2, component: 3, code: 4 };
  const levelA = levels[a.schema.level] || 5;
  const levelB = levels[b.schema.level] || 5;
  if (levelA !== levelB) return levelA - levelB;
  return a.path.localeCompare(b.path);
});

if (defaultLoadedSystems.length > 0) {
  let resolvedRootSystem = defaultLoadedSystems[0];
  const manifest = defaultWorkspaceManifest as WorkspaceManifest | null;
  if (manifest && manifest.root) {
    const resolvedRootName = getFileName(manifest.root);
    const foundRoot = defaultLoadedSystems.find(
      s => s.path === manifest.root || s.path === resolvedRootName
    );
    if (foundRoot) {
      resolvedRootSystem = foundRoot;
    }
  }
  defaultInitialSchema = resolvedRootSystem.schema;
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
        issues: validationResult.issues.map(i => ({
          type: i.type,
          message: i.message,
          path: i.path,
        })),
      });
    }

    const cycleNodes = new Set(
      validationResult.issues
        .filter(issue => issue.type === 'cycle' && issue.path)
        .flatMap(issue => issue.path || [])
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
    workspaceManifest: defaultWorkspaceManifest,
    workspaceManifestYaml: defaultWorkspaceManifestYaml,
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

    updateSchemaLevel: level => {
      applyStateUpdates(get().nodes, get().edges, undefined, level);
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

      const nextEdges = get().edges.filter(e => e.source !== id && e.target !== id);

      const nextSelected = get().selectedNodeId === id ? null : get().selectedNodeId;
      set({ selectedNodeId: nextSelected });
      applyStateUpdates(nextNodes, nextEdges);
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

        const manifestFile = files.find(
          f => f.name === 'workspace.yaml' || f.name.endsWith('-workspace.yaml')
        );
        let parsedManifest: WorkspaceManifest | null = null;
        if (manifestFile) {
          try {
            parsedManifest = yaml.load(manifestFile.content) as WorkspaceManifest;
          } catch (e) {
            logger.error('Failed to parse workspace manifest YAML', e);
          }
        }

        const schemaFiles = files.filter(f => f !== manifestFile);

        const nextLoadedSystems = schemaFiles.map(file => {
          const schema = parseSchemaFromYaml(file.content);
          return {
            path: file.name,
            name: schema.name || file.name.replace(/\.ya?ml$/, ''),
            schema,
          };
        });

        if (nextLoadedSystems.length === 0) {
          throw new Error('No valid blueprint schemas found in selected directory');
        }

        let firstSystem = nextLoadedSystems[0];
        if (parsedManifest?.root) {
          const resolvedRootName = getFileName(parsedManifest.root);
          const foundRoot = nextLoadedSystems.find(
            s => s.path === parsedManifest.root || s.path === resolvedRootName
          );
          if (foundRoot) {
            firstSystem = foundRoot;
          }
        }

        set({
          isWorkspaceOpen: true,
          workspaceName: workspacePort.getDirectoryName(),
          workspaceManifest: parsedManifest,
          workspaceManifestYaml: manifestFile ? manifestFile.content : null,
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

      const targetPath = resolveRelativePath(currentFilePath, node.c4Ref);

      if (!isWorkspaceOpen) {
        const resolvedFileName = getFileName(targetPath);
        const found = defaultLoadedSystems.find(
          s => s.path === targetPath || s.path === resolvedFileName
        );
        if (found) {
          const newStack = [...navigationStack, { path: currentFilePath, schema }];
          set({
            currentFilePath: found.path,
            navigationStack: newStack,
            selectedNodeId: null,
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
            set({
              currentFilePath: found.path,
              selectedNodeId: null,
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

          set({
            currentFilePath: targetPath,
            selectedNodeId: null,
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

    saveWorkspaceManifest: async (manifestYaml: string) => {
      const { workspacePort, fileSystemPort, isWorkspaceOpen, logger } = get();
      try {
        const parsed = yaml.load(manifestYaml) as WorkspaceManifest;
        if (!parsed.name || !parsed.root) {
          throw new Error('Workspace manifest must contain "name" and "root" properties');
        }

        let success = false;
        if (isWorkspaceOpen) {
          success = await workspacePort.writeFile('blueprint-workspace.yaml', manifestYaml);
        } else {
          success = await fileSystemPort.saveSchema(manifestYaml, 'blueprint-workspace.yaml');
        }

        if (success) {
          set({
            workspaceManifest: parsed,
            workspaceManifestYaml: manifestYaml,
            workspaceName: parsed.name,
            lastError: null,
          });
          logger.info('Workspace manifest saved successfully');
        }
        return success;
      } catch (err) {
        logger.error('Failed to save workspace manifest', err);
        set({ lastError: `Failed to save manifest: ${(err as Error).message}` });
        return false;
      }
    },
  };
});
