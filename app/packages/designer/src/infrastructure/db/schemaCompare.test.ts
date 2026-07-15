import { describe, it, expect } from 'vitest';
import type { SystemSchema } from '@blueprint/core';
import { resolveSchemaOnWorkspaceOpen, schemasTopologicallyEqual } from './schemaCompare';

const base: SystemSchema = {
  name: 'App Containers',
  version: '1.0.0',
  level: 'container',
  entityRef: 'blueprint/app',
  nodes: [
    { entityRef: 'blueprint/app/cli', type: 'container', name: 'Cli Service', x: 10, y: 20 },
    { entityRef: 'blueprint/app/core', type: 'container', name: 'Core Service', x: 30, y: 40 },
  ],
  dependencies: [{ from: 'blueprint/app/cli', to: 'blueprint/app/core', type: 'inter-container' }],
};

describe('schemaCompare', () => {
  it('treats position-only differences as equal topology', () => {
    const moved: SystemSchema = {
      ...base,
      nodes: base.nodes.map(n =>
        n.entityRef === 'blueprint/app/cli' ? { ...n, x: 999, y: 999 } : n
      ),
    };
    expect(schemasTopologicallyEqual(base, moved)).toBe(true);
  });

  it('detects extra / changed dependencies', () => {
    const polluted: SystemSchema = {
      ...base,
      dependencies: [
        ...base.dependencies,
        {
          from: 'blueprint/app/cli',
          to: 'blueprint/blueprint',
          type: 'direct-call',
          description: 'Part of product system',
        },
      ],
    };
    expect(schemasTopologicallyEqual(base, polluted)).toBe(false);
  });

  it('keeps matching draft (with positions) on open', () => {
    const draft: SystemSchema = {
      ...base,
      nodes: base.nodes.map(n => ({ ...n, x: (n.x || 0) + 50 })),
    };
    const result = resolveSchemaOnWorkspaceOpen(base, draft);
    expect(result.discardedStaleDraft).toBe(false);
    expect(result.schema).toBe(draft);
  });

  it('discards topologically stale draft in favor of disk', () => {
    const stale: SystemSchema = {
      ...base,
      dependencies: [
        {
          from: 'blueprint/blueprint',
          to: 'blueprint/app/cli',
          type: 'direct-call',
          description: 'Part of product system',
        },
      ],
    };
    const result = resolveSchemaOnWorkspaceOpen(base, stale);
    expect(result.discardedStaleDraft).toBe(true);
    expect(result.schema).toBe(base);
  });

  it('uses disk when there is no draft', () => {
    const result = resolveSchemaOnWorkspaceOpen(base, null);
    expect(result).toEqual({ schema: base, discardedStaleDraft: false });
  });
});
