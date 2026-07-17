import { describe, it, expect } from 'vitest';
import type { SystemSchema } from '@blueprint/core';
import { countSchemaForensicsMetrics } from './countForensicsMetrics';

const schema = (partial: Partial<SystemSchema> & Pick<SystemSchema, 'nodes'>): SystemSchema => ({
  name: 'Demo',
  version: '1.0.0',
  level: 'component',
  dependencies: [],
  ...partial,
});

describe('countSchemaForensicsMetrics', () => {
  it('counts diagram-wide externals, tests, and dependencies when nothing is selected', () => {
    const s = schema({
      nodes: [
        { entityRef: 'a/core', name: 'Core', type: 'component' },
        { entityRef: 'a/ext', name: 'Ext', type: 'component', external: true },
        { entityRef: 'a/test', name: 'Test', type: 'component', isTest: true },
        { entityRef: 'a/both', name: 'Both', type: 'component', external: true, isTest: true },
      ],
      dependencies: [
        { from: 'a/core', to: 'a/ext', type: 'direct-call' },
        { from: 'a/core', to: 'a/test', type: 'direct-call' },
        { from: 'a/ext', to: 'a/both', type: 'direct-call' },
      ],
    });

    expect(countSchemaForensicsMetrics(s)).toEqual({
      externals: 2,
      tests: 2,
      dependencies: 3,
    });
  });

  it('counts partners and incident edges for a selected node', () => {
    const s = schema({
      nodes: [
        { entityRef: 'a/core', name: 'Core', type: 'component' },
        { entityRef: 'a/ext', name: 'Ext', type: 'component', external: true },
        { entityRef: 'a/test', name: 'Test', type: 'component', isTest: true },
        { entityRef: 'a/other', name: 'Other', type: 'component', external: true },
      ],
      dependencies: [
        { from: 'a/core', to: 'a/ext', type: 'direct-call' },
        { from: 'a/test', to: 'a/core', type: 'direct-call' },
        { from: 'a/ext', to: 'a/other', type: 'direct-call' },
      ],
    });

    expect(countSchemaForensicsMetrics(s, 'a/core')).toEqual({
      externals: 1,
      tests: 1,
      dependencies: 2,
    });
  });

  it('returns zeros for an unknown selection', () => {
    const s = schema({
      nodes: [{ entityRef: 'a/core', name: 'Core', type: 'component', external: true }],
      dependencies: [{ from: 'a/core', to: 'a/missing', type: 'direct-call' }],
    });

    expect(countSchemaForensicsMetrics(s, 'a/missing-node')).toEqual({
      externals: 0,
      tests: 0,
      dependencies: 0,
    });
  });
});
