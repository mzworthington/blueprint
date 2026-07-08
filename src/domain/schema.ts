export type NodeType =
  | 'relational-database'
  | 'event-broker'
  | 'grpc-service'
  | 'serverless-function'
  | 'rest-api'
  | 'cache-store'
  | 'gateway-api'
  | 'background-worker';

export interface PropertyMap {
  [key: string]: string | number | boolean;
}

export interface SystemNode {
  id: string;
  type: NodeType;
  name: string;
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
