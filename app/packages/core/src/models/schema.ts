import { slugify } from '../lib/slug';

export type C4Level = 'context' | 'container' | 'component' | 'code';

export type EntityRef = string;

export { slugify };

export const EntityRef = {
  /**
   * Create a reference by slugifying and joining parts.
   */
  create(...parts: string[]): EntityRef {
    const cleanParts = parts.filter(Boolean).map(p => slugify(p));
    if (cleanParts.length === 0)
      throw new Error('At least one part is required to create an EntityRef.');
    return cleanParts.join('/');
  },

  /**
   * Evaluates the structural level based on the number of path segments
   */
  getLevel(ref: EntityRef): C4Level {
    const segments = ref.split('/').filter(Boolean);
    if (segments.length === 0 || segments.length > 4) {
      throw new Error(`Invalid EntityRef structure layout: ${ref}`);
    }
    switch (segments.length) {
      case 1:
        return 'context';
      case 2:
        return 'container';
      case 3:
        return 'component';
      default:
        return 'code';
    }
  },

  /**
   * Parses a reference value, optionally nesting it under a parent EntityRef.
   */
  parse(value: string, parent?: EntityRef): EntityRef {
    if (!value?.trim()) throw new Error('Value is required.');
    if (parent) {
      return this.child(parent, value);
    }
    return slugify(value);
  },

  /**
   * Appends a child reference identifier to a parent EntityRef.
   */
  child(parent: EntityRef, child: string): EntityRef {
    if (!parent?.trim()) throw new Error('Parent EntityRef is required.');
    if (!child?.trim()) throw new Error('Child identifier is required.');
    return `${parent}/${slugify(child)}`;
  },

  /**
   * Extracts the container ID segment from a container or component FQN.
   */
  getContainerId(ref: EntityRef): string {
    const segments = ref.split('/').filter(Boolean);
    if (segments.length < 2) {
      throw new Error('EntityRef is not at container or component level: ' + ref);
    }
    if (segments.length >= 3) {
      return segments[segments.length - 2];
    }
    return segments[segments.length - 1];
  },

  /**
   * Retrieves the parent EntityRef of the given ref.
   */
  getParent(ref: EntityRef): EntityRef | null {
    const segments = ref.split('/').filter(Boolean);
    if (segments.length <= 1) {
      return null;
    }
    return segments.slice(0, -1).join('/');
  },

  /**
   * Retrieves the last segment (leaf) of the given EntityRef.
   */
  leaf(ref: EntityRef): string {
    const segments = ref.split('/').filter(Boolean);
    if (segments.length === 0) return '';
    return segments[segments.length - 1];
  },
};

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
  | 'container'
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

export type ForensicClassification = 'hotspot' | 'knowledge-silo';

export interface CoupledFileForensics {
  path: string;
  score: number;
  sharedCommits: number;
}

export interface NodeForensics {
  complexity?: number;
  loc?: number;
  sloc?: number;
  churn?: number;
  authorCount?: number;
  topAuthorPercent?: number;
  hotspotScore?: number;
  classifications?: ForensicClassification[];
  coupledFiles?: CoupledFileForensics[];
  /** Git history lookback window (days) used when these metrics were collected. */
  sinceDays?: number;
  /** Rollups only (containers / systems) */
  fileCount?: number;
  hotspotCount?: number;
  knowledgeSiloCount?: number;
}

export interface SystemNode {
  entityRef: EntityRef;
  type: NodeType;
  name: string;
  external?: boolean;
  properties?: PropertyMap;
  isTest?: boolean;
  x?: number;
  y?: number;
  forensics?: NodeForensics;
}

export type DependencyType = 'direct-call' | 'publish-subscribe' | 'read-write' | 'inter-container';

export interface SystemDependency {
  from: EntityRef;
  to: EntityRef;
  type: DependencyType;
  description?: string;
}

export interface SystemSchema {
  /**
   * Identity of this diagram in the hierarchy.
   * Child diagrams link to parents by setting this equal to a parent node's entityRef.
   */
  entityRef?: EntityRef;
  name: string;
  /**
   * On disk (v3+): public JSON Schema URL for this contract.
   * In memory: may still be a semver placeholder until serialize rewrites it.
   */
  version: string;
  level: C4Level;
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
