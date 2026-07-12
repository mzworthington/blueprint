import * as pb from '../generated/blueprint/v1/schema';

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
  entityRef?: string;
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

// ==========================================
// Bidirectional Protobuf Mapping Functions
// ==========================================

export function toPbC4Level(level: C4Level): pb.C4Level {
  switch (level) {
    case 'context':
      return pb.C4Level.C4_LEVEL_CONTEXT;
    case 'container':
      return pb.C4Level.C4_LEVEL_CONTAINER;
    case 'component':
      return pb.C4Level.C4_LEVEL_COMPONENT;
    case 'code':
      return pb.C4Level.C4_LEVEL_CODE;
    default:
      return pb.C4Level.C4_LEVEL_UNSPECIFIED;
  }
}

export function fromPbC4Level(level: pb.C4Level): C4Level {
  switch (level) {
    case pb.C4Level.C4_LEVEL_CONTEXT:
      return 'context';
    case pb.C4Level.C4_LEVEL_CONTAINER:
      return 'container';
    case pb.C4Level.C4_LEVEL_COMPONENT:
      return 'component';
    case pb.C4Level.C4_LEVEL_CODE:
      return 'code';
    default:
      return 'context';
  }
}

export function toPbNodeType(type: NodeType): pb.NodeType {
  switch (type) {
    case 'person':
      return pb.NodeType.NODE_TYPE_PERSON;
    case 'software-system':
      return pb.NodeType.NODE_TYPE_SOFTWARE_SYSTEM;
    case 'web-app':
      return pb.NodeType.NODE_TYPE_WEB_APP;
    case 'mobile-app':
      return pb.NodeType.NODE_TYPE_MOBILE_APP;
    case 'single-page-app':
      return pb.NodeType.NODE_TYPE_SINGLE_PAGE_APP;
    case 'microservice':
      return pb.NodeType.NODE_TYPE_MICROSERVICE;
    case 'database':
      return pb.NodeType.NODE_TYPE_DATABASE;
    case 'cache-store':
      return pb.NodeType.NODE_TYPE_CACHE_STORE;
    case 'event-broker':
      return pb.NodeType.NODE_TYPE_EVENT_BROKER;
    case 'serverless-app':
      return pb.NodeType.NODE_TYPE_SERVERLESS_APP;
    case 'component':
      return pb.NodeType.NODE_TYPE_COMPONENT;
    case 'code-module':
      return pb.NodeType.NODE_TYPE_CODE_MODULE;
    case 'relational-database':
      return pb.NodeType.NODE_TYPE_RELATIONAL_DATABASE;
    case 'grpc-service':
      return pb.NodeType.NODE_TYPE_GRPC_SERVICE;
    case 'serverless-function':
      return pb.NodeType.NODE_TYPE_SERVERLESS_FUNCTION;
    case 'rest-api':
      return pb.NodeType.NODE_TYPE_REST_API;
    case 'gateway-api':
      return pb.NodeType.NODE_TYPE_GATEWAY_API;
    case 'background-worker':
      return pb.NodeType.NODE_TYPE_BACKGROUND_WORKER;
    default:
      return pb.NodeType.NODE_TYPE_UNSPECIFIED;
  }
}

export function fromPbNodeType(type: pb.NodeType): NodeType {
  switch (type) {
    case pb.NodeType.NODE_TYPE_PERSON:
      return 'person';
    case pb.NodeType.NODE_TYPE_SOFTWARE_SYSTEM:
      return 'software-system';
    case pb.NodeType.NODE_TYPE_WEB_APP:
      return 'web-app';
    case pb.NodeType.NODE_TYPE_MOBILE_APP:
      return 'mobile-app';
    case pb.NodeType.NODE_TYPE_SINGLE_PAGE_APP:
      return 'single-page-app';
    case pb.NodeType.NODE_TYPE_MICROSERVICE:
      return 'microservice';
    case pb.NodeType.NODE_TYPE_DATABASE:
      return 'database';
    case pb.NodeType.NODE_TYPE_CACHE_STORE:
      return 'cache-store';
    case pb.NodeType.NODE_TYPE_EVENT_BROKER:
      return 'event-broker';
    case pb.NodeType.NODE_TYPE_SERVERLESS_APP:
      return 'serverless-app';
    case pb.NodeType.NODE_TYPE_COMPONENT:
      return 'component';
    case pb.NodeType.NODE_TYPE_CODE_MODULE:
      return 'code-module';
    case pb.NodeType.NODE_TYPE_RELATIONAL_DATABASE:
      return 'relational-database';
    case pb.NodeType.NODE_TYPE_GRPC_SERVICE:
      return 'grpc-service';
    case pb.NodeType.NODE_TYPE_SERVERLESS_FUNCTION:
      return 'serverless-function';
    case pb.NodeType.NODE_TYPE_REST_API:
      return 'rest-api';
    case pb.NodeType.NODE_TYPE_GATEWAY_API:
      return 'gateway-api';
    case pb.NodeType.NODE_TYPE_BACKGROUND_WORKER:
      return 'background-worker';
    default:
      return 'software-system';
  }
}

export function toPbDependencyType(type: DependencyType): pb.DependencyType {
  switch (type) {
    case 'direct-call':
      return pb.DependencyType.DEPENDENCY_TYPE_DIRECT_CALL;
    case 'publish-subscribe':
      return pb.DependencyType.DEPENDENCY_TYPE_PUBLISH_SUBSCRIBE;
    case 'read-write':
      return pb.DependencyType.DEPENDENCY_TYPE_READ_WRITE;
    default:
      return pb.DependencyType.DEPENDENCY_TYPE_UNSPECIFIED;
  }
}

export function fromPbDependencyType(type: pb.DependencyType): DependencyType {
  switch (type) {
    case pb.DependencyType.DEPENDENCY_TYPE_DIRECT_CALL:
      return 'direct-call';
    case pb.DependencyType.DEPENDENCY_TYPE_PUBLISH_SUBSCRIBE:
      return 'publish-subscribe';
    case pb.DependencyType.DEPENDENCY_TYPE_READ_WRITE:
      return 'read-write';
    default:
      return 'direct-call';
  }
}

export function toPbSystemNode(node: SystemNode): pb.SystemNode {
  return {
    id: node.id,
    type: toPbNodeType(node.type),
    name: node.name,
    c4Ref: node.c4Ref ?? undefined,
    external: node.external ?? undefined,
    properties: node.properties ? { ...node.properties } : undefined,
    isTest: node.isTest ?? undefined,
    x: node.x ?? undefined,
    y: node.y ?? undefined,
    entityRef: node.entityRef ?? undefined,
  };
}

export function fromPbSystemNode(node: pb.SystemNode): SystemNode {
  const result: SystemNode = {
    id: node.id,
    type: fromPbNodeType(node.type),
    name: node.name,
  };
  if (node.c4Ref !== undefined) result.c4Ref = node.c4Ref;
  if (node.external !== undefined) result.external = node.external;
  if (node.properties !== undefined) result.properties = node.properties as PropertyMap;
  if (node.isTest !== undefined) result.isTest = node.isTest;
  if (node.x !== undefined) result.x = node.x;
  if (node.y !== undefined) result.y = node.y;
  if (node.entityRef !== undefined) result.entityRef = node.entityRef;
  return result;
}

export function toPbSystemDependency(dep: SystemDependency): pb.SystemDependency {
  return {
    from: dep.from,
    to: dep.to,
    type: toPbDependencyType(dep.type),
    description: dep.description ?? undefined,
  };
}

export function fromPbSystemDependency(dep: pb.SystemDependency): SystemDependency {
  const result: SystemDependency = {
    from: dep.from,
    to: dep.to,
    type: fromPbDependencyType(dep.type),
  };
  if (dep.description !== undefined) result.description = dep.description;
  return result;
}

export function toPbSystemSchema(schema: SystemSchema): pb.SystemSchema {
  return {
    name: schema.name,
    version: schema.version,
    level: toPbC4Level(schema.level),
    parentRef: schema.parentRef ?? undefined,
    nodes: schema.nodes.map(toPbSystemNode),
    dependencies: schema.dependencies.map(toPbSystemDependency),
  };
}

export function fromPbSystemSchema(schema: pb.SystemSchema): SystemSchema {
  const result: SystemSchema = {
    name: schema.name,
    version: schema.version,
    level: fromPbC4Level(schema.level),
    nodes: schema.nodes.map(fromPbSystemNode),
    dependencies: schema.dependencies.map(fromPbSystemDependency),
  };
  if (schema.parentRef !== undefined) result.parentRef = schema.parentRef;
  return result;
}

export function toPbWorkspaceHierarchy(hierarchy: WorkspaceHierarchy): pb.WorkspaceHierarchy {
  return {
    parent: hierarchy.parent,
    children: [...hierarchy.children],
  };
}

export function fromPbWorkspaceHierarchy(hierarchy: pb.WorkspaceHierarchy): WorkspaceHierarchy {
  return {
    parent: hierarchy.parent,
    children: [...hierarchy.children],
  };
}

export function toPbWorkspaceManifest(manifest: WorkspaceManifest): pb.WorkspaceManifest {
  return {
    name: manifest.name,
    root: manifest.root,
    hierarchy: manifest.hierarchy.map(toPbWorkspaceHierarchy),
  };
}

export function fromPbWorkspaceManifest(manifest: pb.WorkspaceManifest): WorkspaceManifest {
  return {
    name: manifest.name,
    root: manifest.root,
    hierarchy: manifest.hierarchy.map(fromPbWorkspaceHierarchy),
  };
}
