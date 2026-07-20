import { describe, it, expect } from 'vitest';
import type { SystemSchema } from '@blueprint/core';
import { compareSystemSchemas, schemaDiffHasChanges } from './compareSystemSchemas';

const base: SystemSchema = {
  name: 'System A',
  version: '1.0.0',
  level: 'container',
  nodes: [
    { entityRef: 'a/api', type: 'rest-api', name: 'API', x: 0, y: 0 },
    { entityRef: 'a/db', type: 'relational-database', name: 'DB' },
  ],
  dependencies: [{ from: 'a/api', to: 'a/db', type: 'read-write' }],
};

describe('compareSystemSchemas', () => {
  it('returns empty diff for identical schemas', () => {
    const diff = compareSystemSchemas(base, { ...base, nodes: [...base.nodes] });
    expect(schemaDiffHasChanges(diff)).toBe(false);
  });

  it('detects added, modified, and deleted nodes', () => {
    const other: SystemSchema = {
      ...base,
      nodes: [
        { entityRef: 'a/api', type: 'rest-api', name: 'API v2', x: 10, y: 0 },
        { entityRef: 'a/cache', type: 'cache-store', name: 'Cache' },
      ],
      dependencies: [],
    };

    const diff = compareSystemSchemas(base, other);
    expect(diff.nodes.modified).toHaveLength(1);
    expect(diff.nodes.modified[0]?.current.name).toBe('API v2');
    expect(diff.nodes.added).toHaveLength(1);
    expect(diff.nodes.added[0]?.entityRef).toBe('a/cache');
    expect(diff.nodes.deleted).toHaveLength(1);
    expect(diff.nodes.deleted[0]?.entityRef).toBe('a/db');
    expect(diff.dependencies.deleted).toHaveLength(1);
    expect(schemaDiffHasChanges(diff)).toBe(true);
  });
});
