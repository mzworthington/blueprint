import { describe, it, expect } from 'vitest';
import type { SystemSchema } from '../models/schema';
import {
  computeImportMergePlan,
  applyImportMergePlan,
  type ConflictResolution,
} from './schemaMerge';

const baseSchema: SystemSchema = {
  name: 'Existing',
  version: '1.0.0',
  level: 'container',
  entityRef: 'billing',
  nodes: [
    { entityRef: 'billing/gateway', type: 'rest-api', name: 'Gateway', x: 10, y: 20 },
    { entityRef: 'billing/auth', type: 'grpc-service', name: 'Auth Service', x: 100, y: 200 },
  ],
  dependencies: [{ from: 'billing/gateway', to: 'billing/auth', type: 'direct-call' }],
};

describe('computeImportMergePlan', () => {
  it('identifies additions when imported nodes are new', () => {
    const imported: SystemSchema = {
      name: 'Import',
      version: '1.0.0',
      level: 'container',
      nodes: [{ entityRef: 'billing/db', type: 'relational-database', name: 'Database' }],
      dependencies: [
        { from: 'billing/gateway', to: 'billing/db', type: 'read-write', description: 'Query' },
      ],
    };

    const plan = computeImportMergePlan(baseSchema, imported);

    expect(plan.additions.nodes).toHaveLength(1);
    expect(plan.additions.nodes[0].entityRef).toBe('billing/db');
    expect(plan.additions.dependencies).toHaveLength(1);
    expect(plan.conflicts).toHaveLength(0);
  });

  it('detects conflicts when entityRef matches but fields differ', () => {
    const imported: SystemSchema = {
      name: 'Import',
      version: '1.0.0',
      level: 'container',
      nodes: [{ entityRef: 'billing/gateway', type: 'microservice', name: 'API Gateway' }],
      dependencies: [],
    };

    const plan = computeImportMergePlan(baseSchema, imported);

    expect(plan.conflicts).toHaveLength(1);
    expect(plan.conflicts[0].entityRef).toBe('billing/gateway');
    expect(plan.unchanged.nodes).toHaveLength(1);
    expect(plan.unchanged.nodes[0].entityRef).toBe('billing/auth');
  });

  it('treats identical nodes as unchanged', () => {
    const imported: SystemSchema = {
      name: 'Import',
      version: '1.0.0',
      level: 'container',
      nodes: [{ entityRef: 'billing/gateway', type: 'rest-api', name: 'Gateway' }],
      dependencies: [],
    };

    const plan = computeImportMergePlan(baseSchema, imported);

    expect(plan.conflicts).toHaveLength(0);
    expect(plan.additions.nodes).toHaveLength(0);
    expect(plan.unchanged.nodes.some(n => n.entityRef === 'billing/gateway')).toBe(true);
  });
});

describe('applyImportMergePlan', () => {
  it('merges additions without touching existing nodes', () => {
    const imported: SystemSchema = {
      name: 'Import',
      version: '1.0.0',
      level: 'container',
      nodes: [{ entityRef: 'billing/db', type: 'relational-database', name: 'Database' }],
      dependencies: [{ from: 'billing/gateway', to: 'billing/db', type: 'read-write' }],
    };

    const merged = applyImportMergePlan(baseSchema, imported, {});

    expect(merged.nodes).toHaveLength(3);
    expect(merged.nodes.find(n => n.entityRef === 'billing/gateway')?.x).toBe(10);
    expect(merged.nodes.find(n => n.entityRef === 'billing/db')).toBeDefined();
    expect(merged.dependencies).toHaveLength(2);
  });

  it('skips conflicting nodes by default', () => {
    const imported: SystemSchema = {
      name: 'Import',
      version: '1.0.0',
      level: 'container',
      nodes: [{ entityRef: 'billing/gateway', type: 'microservice', name: 'API Gateway' }],
      dependencies: [],
    };

    const merged = applyImportMergePlan(baseSchema, imported, {});

    expect(merged.nodes.find(n => n.entityRef === 'billing/gateway')).toMatchObject({
      type: 'rest-api',
      name: 'Gateway',
    });
  });

  it('overwrites conflicting nodes when resolution is overwrite', () => {
    const imported: SystemSchema = {
      name: 'Import',
      version: '1.0.0',
      level: 'container',
      nodes: [{ entityRef: 'billing/gateway', type: 'microservice', name: 'API Gateway' }],
      dependencies: [],
    };

    const resolutions: Record<string, ConflictResolution> = {
      'billing/gateway': 'overwrite',
    };

    const merged = applyImportMergePlan(baseSchema, imported, resolutions);

    expect(merged.nodes.find(n => n.entityRef === 'billing/gateway')).toMatchObject({
      type: 'microservice',
      name: 'API Gateway',
    });
    expect(merged.nodes.find(n => n.entityRef === 'billing/gateway')?.x).toBe(10);
  });

  it('preserves forensics and properties when overwriting', () => {
    const baseWithEnrichment: SystemSchema = {
      ...baseSchema,
      nodes: [
        {
          entityRef: 'billing/gateway',
          type: 'rest-api',
          name: 'Gateway',
          x: 10,
          y: 20,
          properties: { team: 'payments', region: 'eu' },
          forensics: { hotspotScore: 0.9, churn: 12 },
        },
      ],
      dependencies: [],
    };
    const imported: SystemSchema = {
      name: 'Import',
      version: '1.0.0',
      level: 'container',
      nodes: [
        {
          entityRef: 'billing/gateway',
          type: 'microservice',
          name: 'API Gateway',
          properties: { region: 'us' },
        },
      ],
      dependencies: [],
    };

    const merged = applyImportMergePlan(baseWithEnrichment, imported, {
      'billing/gateway': 'overwrite',
    });

    const node = merged.nodes.find(n => n.entityRef === 'billing/gateway');
    expect(node).toMatchObject({
      type: 'microservice',
      name: 'API Gateway',
      x: 10,
      y: 20,
      properties: { team: 'payments', region: 'us' },
      forensics: { hotspotScore: 0.9, churn: 12 },
    });
  });

  it('renames conflicting nodes when resolution is rename', () => {
    const imported: SystemSchema = {
      name: 'Import',
      version: '1.0.0',
      level: 'container',
      nodes: [{ entityRef: 'billing/gateway', type: 'microservice', name: 'API Gateway' }],
      dependencies: [],
    };

    const resolutions: Record<string, ConflictResolution> = {
      'billing/gateway': 'rename',
    };

    const merged = applyImportMergePlan(baseSchema, imported, resolutions);

    expect(merged.nodes.filter(n => n.entityRef.startsWith('billing/gateway'))).toHaveLength(2);
    const renamed = merged.nodes.find(
      n => n.entityRef !== 'billing/gateway' && n.name === 'API Gateway'
    );
    expect(renamed).toBeDefined();
  });

  it('deduplicates identical edges', () => {
    const imported: SystemSchema = {
      name: 'Import',
      version: '1.0.0',
      level: 'container',
      nodes: [],
      dependencies: [{ from: 'billing/gateway', to: 'billing/auth', type: 'direct-call' }],
    };

    const merged = applyImportMergePlan(baseSchema, imported, {});

    expect(merged.dependencies).toHaveLength(1);
  });
});
