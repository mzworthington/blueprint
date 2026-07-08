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
 * Driven Outbound Port for structured observability logging.
 */
export interface LoggerPort {
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, error?: unknown, context?: Record<string, unknown>): void;
}
