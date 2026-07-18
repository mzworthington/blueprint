/**
 * Driving/Driven Ports for the Blueprint Application Core.
 * Interfaces defined here separate pure domain/application logic
 * from concrete external adapters (like DOM elements or local filesystem IO).
 */

/**
 * Driven Outbound Port for local file operations.
 */
export interface FileSystemPort {
  saveSchema(yamlContent: string, fileName: string): Promise<boolean>;
  loadSchema(): Promise<string | null>;
}

/**
 * Driven Outbound Port for multi-file workspace operations.
 */
export interface WorkspacePort {
  selectDirectory(): Promise<boolean>;
  readFile(relativePath: string): Promise<string>;
  writeFile(relativePath: string, content: string): Promise<boolean>;
  getDirectoryName(): string;
  hasPermission(): Promise<boolean>;
  readDirectoryFiles(): Promise<Array<{ name: string; content: string }>>;
}

/**
 * Driven Outbound Port for structured observability logging.
 */
export interface LoggerPort {
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, error?: unknown, context?: Record<string, unknown>): void;
}

/**
 * Safe default noop logger implementation.
 */
export const noopLogger: LoggerPort = {
  info: () => {},
  warn: () => {},
  error: () => {},
};

/**
 * Safe default noop filesystem implementation.
 */
export const noopFileSystem: FileSystemPort = {
  saveSchema: async () => false,
  loadSchema: async () => null,
};

/**
 * Safe default noop workspace implementation.
 */
export const noopWorkspace: WorkspacePort = {
  selectDirectory: async () => false,
  readFile: async () => '',
  writeFile: async () => false,
  getDirectoryName: () => '',
  hasPermission: async () => false,
  readDirectoryFiles: async () => [],
};

/** Engine ids selectable in the designer layout prototype. */
export type LayoutEngineId = 'dagre' | 'elk' | 'd3-hierarchy';

export type LayoutPosition = { x: number; y: number };

export type LayoutNodeInput = {
  id: string;
  width: number;
  height: number;
};

export type LayoutEdgeInput = {
  id: string;
  source: string;
  target: string;
};

/**
 * Driven outbound port for a single graph layout algorithm.
 * Adapters wrap dagre / ELK / d3-hierarchy (or fakes in tests).
 */
export interface LayoutEnginePort {
  computeLayout(
    nodes: LayoutNodeInput[],
    edges: LayoutEdgeInput[]
  ): Promise<Map<string, LayoutPosition>>;
}

/**
 * Registry of layout engines available to the application use-case.
 */
export interface LayoutRegistryPort {
  get(engine: LayoutEngineId): LayoutEnginePort | undefined;
}

export const noopLayoutRegistry: LayoutRegistryPort = {
  get: () => undefined,
};

/**
 * Driven outbound port for runtime network connectivity belief
 * (`navigator.onLine` / online-offline events in the browser).
 * Not a guarantee of reachability — only what the host reports.
 */
export interface NetworkStatusPort {
  isOnline(): boolean;
  /** Subscribe to connectivity changes; returns unsubscribe. */
  subscribe(listener: (online: boolean) => void): () => void;
}

/** Safe default: always online, no subscriptions (tests / SSR). */
export const alwaysOnlineNetworkStatus: NetworkStatusPort = {
  isOnline: () => true,
  subscribe: () => () => {},
};

/** Persisted draft node row (working / baseline IndexedDB shape). */
export type WorkingCopyNode = {
  entityRef: string;
  id: string;
  systemId: string;
  containerId?: string;
  type: string;
  name: string;
  properties: import('@blueprint/core').PropertyMap;
  x?: number;
  y?: number;
  external?: boolean;
  isTest?: boolean;
  filePath: string;
};

export type WorkingCopyDependency = {
  id: string;
  fromRef: string;
  toRef: string;
  type: string;
  description?: string;
  filePath: string;
};

export type SchemaDiff = {
  nodes: {
    added: WorkingCopyNode[];
    modified: { original: WorkingCopyNode; current: WorkingCopyNode }[];
    deleted: WorkingCopyNode[];
  };
  dependencies: {
    added: WorkingCopyDependency[];
    deleted: WorkingCopyDependency[];
  };
};

export type SaveWorkingCopyArgs = {
  filePath: string;
  schema: import('@blueprint/core').SystemSchema;
  systemId: string;
  nodeRefMap: Record<string, string>;
};

export type LoadWorkingCopyArgs = {
  filePath: string;
  systemName?: string;
  systemVersion?: string;
  systemLevel?: string;
  systemEntityRef?: string;
};

/**
 * Driven outbound port for IndexedDB working-copy / baseline persistence and diffs.
 */
export interface WorkingCopyPort {
  saveBaselineSchema(args: SaveWorkingCopyArgs): Promise<void>;
  saveWorkingSchema(args: SaveWorkingCopyArgs): Promise<void>;
  computeSchemaDiff(filePath: string): Promise<SchemaDiff>;
  revertWorkingSchema(args: LoadWorkingCopyArgs): Promise<import('@blueprint/core').SystemSchema>;
  pathHasStoredData(filePath: string): Promise<boolean>;
  loadWorkingSchema(
    args: LoadWorkingCopyArgs
  ): Promise<import('@blueprint/core').SystemSchema | null>;
}

export const noopWorkingCopy: WorkingCopyPort = {
  saveBaselineSchema: async () => {},
  saveWorkingSchema: async () => {},
  computeSchemaDiff: async () => ({
    nodes: { added: [], modified: [], deleted: [] },
    dependencies: { added: [], deleted: [] },
  }),
  revertWorkingSchema: async args => ({
    name: args.systemName || 'Restored Schema',
    version: args.systemVersion || '1.0.0',
    level: (args.systemLevel as import('@blueprint/core').C4Level) || 'container',
    entityRef: args.systemEntityRef,
    nodes: [],
    dependencies: [],
  }),
  pathHasStoredData: async () => false,
  loadWorkingSchema: async () => null,
};

/** Opaque canvas graph change payloads (React Flow NodeChange / EdgeChange at the adapter). */
export type CanvasNodeChange = { type: string; id?: string; [key: string]: unknown };
export type CanvasEdgeChange = { type: string; id?: string; [key: string]: unknown };

export type CanvasConnection = {
  source: string | null;
  target: string | null;
  sourceHandle?: string | null;
  targetHandle?: string | null;
};

/**
 * Driven port for applying UI-framework graph change lists to canvas nodes/edges.
 * Keeps @xyflow/react out of the application store.
 */
export interface GraphChangePort {
  applyNodeChanges<TNode>(changes: CanvasNodeChange[], nodes: TNode[]): TNode[];
  applyEdgeChanges<TEdge>(changes: CanvasEdgeChange[], edges: TEdge[]): TEdge[];
}

export const noopGraphChange: GraphChangePort = {
  applyNodeChanges: (_changes, nodes) => nodes,
  applyEdgeChanges: (_changes, edges) => edges,
};
