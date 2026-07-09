export type C4Level = 'context' | 'container' | 'component' | 'code';

export type NodeType =
  // Level 1: System Context
  | 'person'
  | 'software-system'
  // Level 2: Container
  | 'web-app'
  | 'mobile-app'
  | 'single-page-app'
  | 'microservice'
  | 'database'
  | 'cache-store'
  | 'event-broker'
  | 'serverless-app'
  // Level 3 & 4: Component & Code
  | 'component'
  | 'code-module'
  // Legacy / existing node types
  | 'relational-database'
  | 'grpc-service'
  | 'serverless-function'
  | 'rest-api'
  | 'gateway-api'
  | 'background-worker';

export interface PropertyMap {
  [key: string]: string | number | boolean;
}

export interface SystemNode {
  id: string;
  type: NodeType;
  name: string;
  c4Ref?: string; // Relative file path or URL to the nested C4 diagram
  external?: boolean; // True if this is an external system or boundary reference
  properties?: PropertyMap;
  isTest?: boolean;
  x?: number;
  y?: number;
}

export type DependencyType = 'direct-call' | 'publish-subscribe' | 'read-write';

export interface SystemDependency {
  from: string;
  to: string;
  type: DependencyType;
  description?: string;
}

export interface SystemSchema {
  name: string;
  version: string;
  level?: C4Level;
  parentRef?: string; // Relative path to parent diagram (e.g. for Zoom Out)
  nodes: SystemNode[];
  dependencies: SystemDependency[];
}

export interface ValidationIssue {
  type: 'cycle' | 'disconnected' | 'invalid-connection';
  message: string;
  path?: string[]; // E.g., for cycles: ['A', 'B', 'C', 'A']
}

export interface ValidationResult {
  isValid: boolean;
  issues: ValidationIssue[];
}
