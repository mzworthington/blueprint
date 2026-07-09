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
} from '../domain/schema';
import { validateGraph, parseSchemaFromYaml, serializeSchemaToYaml } from '../domain/graph';
import type { FileSystemPort, LoggerPort } from '../domain/ports';
import { BrowserFileSystemAdapter } from './fileSync';
import { ConsoleLoggerAdapter } from './telemetry';
import defaultYaml from '../../blueprint.yaml?raw';

// Strict UI node/edge schemas to decouple React Flow interfaces from pure domain models
export type ComponentNodeData = {
  [key: string]: unknown;
  id: string;
  type: NodeType;
  name: string;
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
  // Domain Schema state
  schema: SystemSchema;

  // React Flow visual states
  nodes: BlueprintRFNode[];
  edges: BlueprintRFEdge[];

  // UI selection and validation states
  selectedNodeId: string | null;
  validationResult: ValidationResult;
  yamlCode: string;
  lastError: string | null;

  // Actions
  initSchema: (schema: SystemSchema) => void;
  updateSchemaName: (name: string) => void;
  importYaml: (yamlContent: string) => boolean;
  clearError: () => void;

  // Canvas operations
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;

  // Node CRUD operations
  addNode: (type: NodeType) => void;
  updateNode: (id: string, updates: Partial<SystemNode>) => void;
  deleteNode: (id: string) => void;
  selectNode: (id: string | null) => void;

  // Dependency operations
  updateDependency: (from: string, to: string, updates: Partial<SystemDependency>) => void;
  deleteDependency: (from: string, to: string) => void;

  // File Sync actions via outbound Port
  fileSystemPort: FileSystemPort;
  saveSchema: () => Promise<boolean>;
  loadSchema: () => Promise<boolean>;

  // Observability logging port
  logger: LoggerPort;

  // Visual filters
  showTests: boolean;
  toggleShowTests: () => void;

  // Panel collapse states
  leftCollapsed: boolean;
  rightCollapsed: boolean;
  toggleLeftCollapsed: () => void;
  toggleRightCollapsed: () => void;
}

// Helpers to map Domain Schema <-> React Flow Canvas
const mapDomainNodeToRFNode = (n: SystemNode): BlueprintRFNode => ({
  id: n.id,
  type: 'blueprintNode',
  position: { x: n.x ?? 150 + Math.random() * 200, y: n.y ?? 150 + Math.random() * 200 },
  data: {
    id: n.id,
    type: n.type,
    name: n.name,
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

// Re-generate pure schema from canvas state
const rebuildSchemaFromCanvas = (
  name: string,
  version: string,
  rfNodes: BlueprintRFNode[],
  rfEdges: BlueprintRFEdge[]
): SystemSchema => {
  const nodes: SystemNode[] = rfNodes.map(rn => ({
    id: rn.id,
    type: rn.data.type,
    name: rn.data.name,
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

  return { name, version, nodes, dependencies };
};

let defaultInitialSchema: SystemSchema;
try {
  defaultInitialSchema = parseSchemaFromYaml(defaultYaml);
} catch {
  defaultInitialSchema = {
    name: 'New Cloud Workspace',
    version: '1.0.0',
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
}

export const useBlueprintStore = create<BlueprintState>((set, get) => {
  const applyStateUpdates = (
    nextNodes: BlueprintRFNode[],
    nextEdges: BlueprintRFEdge[],
    customSchemaName?: string
  ) => {
    const currentSchema = get().schema;
    const name = customSchemaName ?? currentSchema.name;
    const version = currentSchema.version;
    const nextSchema = rebuildSchemaFromCanvas(name, version, nextNodes, nextEdges);

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

    set({
      nodes: nextNodes,
      edges: highlightedEdges,
      schema: nextSchema,
      validationResult,
      yamlCode,
    });
  };

  // Initialize store with default schema
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
    leftCollapsed: false,
    rightCollapsed: false,
    fileSystemPort: BrowserFileSystemAdapter,
    logger: ConsoleLoggerAdapter,

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
      applyStateUpdates(rfNodes, rfEdges, schema.name);
    },

    updateSchemaName: name => {
      applyStateUpdates(get().nodes, get().edges, name);
    },

    importYaml: yamlContent => {
      try {
        set({ lastError: null });
        const schema = parseSchemaFromYaml(yamlContent);
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
  };
});
