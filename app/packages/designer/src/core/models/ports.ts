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
