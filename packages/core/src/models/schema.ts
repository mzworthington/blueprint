export type C4Level = 'context' | 'container' | 'component' | 'code';

export type NodeType =
  | 'person'
  | 'software-system'
  | 'web-app'
  | 'mobile-app'
  | 'single-page-app'
  | 'microservice'
  | 'database'
  | 'cache-store'
  | 'event-broker'
  | 'serverless-app'
  | 'component'
  | 'code-module'
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
  c4Ref?: string;
  external?: boolean;
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
  level: C4Level;
  parentRef?: string;
  nodes: SystemNode[];
  dependencies: SystemDependency[];
}

export interface ValidationIssue {
  type: 'cycle' | 'disconnected' | 'invalid-connection';
  message: string;
  path?: string[];
}

export interface ValidationResult {
  isValid: boolean;
  issues: ValidationIssue[];
}

export interface WorkspaceHierarchy {
  parent: string;
  children: string[];
}

export interface WorkspaceManifest {
  name: string;
  root: string;
  hierarchy: WorkspaceHierarchy[];
}
