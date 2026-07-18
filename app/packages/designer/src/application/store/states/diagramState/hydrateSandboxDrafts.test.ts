import { describe, it, expect, vi } from 'vitest';
import type { SystemSchema } from '@blueprint/core';
import type { WorkingCopyPort } from '../../../../core';
import { hydrateSandboxDrafts } from './hydrateSandboxDrafts';

const base: SystemSchema = {
  name: 'Demo',
  version: '1.0.0',
  level: 'container',
  entityRef: 'demo',
  nodes: [{ entityRef: 'demo/a', type: 'rest-api', name: 'A', x: 0, y: 0 }],
  dependencies: [],
};

describe('hydrateSandboxDrafts', () => {
  it('restores draft positions when topology matches', async () => {
    const draft: SystemSchema = {
      ...base,
      nodes: [{ entityRef: 'demo/a', type: 'rest-api', name: 'A', x: 42, y: 99 }],
    };
    const workingCopy: WorkingCopyPort = {
      saveBaselineSchema: vi.fn(),
      saveWorkingSchema: vi.fn(),
      computeSchemaDiff: vi.fn(),
      revertWorkingSchema: vi.fn(),
      pathHasStoredData: vi.fn().mockResolvedValue(true),
      loadWorkingSchema: vi.fn().mockResolvedValue(draft),
    };

    const result = await hydrateSandboxDrafts(
      [{ path: 'demo.yaml', name: 'Demo', schema: base }],
      workingCopy
    );

    expect(result.restoredCount).toBe(1);
    expect(result.systems[0]!.schema.nodes[0]).toMatchObject({ x: 42, y: 99 });
  });

  it('keeps memory schema when no draft exists', async () => {
    const workingCopy: WorkingCopyPort = {
      saveBaselineSchema: vi.fn(),
      saveWorkingSchema: vi.fn(),
      computeSchemaDiff: vi.fn(),
      revertWorkingSchema: vi.fn(),
      pathHasStoredData: vi.fn().mockResolvedValue(false),
      loadWorkingSchema: vi.fn().mockResolvedValue(null),
    };

    const result = await hydrateSandboxDrafts(
      [{ path: 'demo.yaml', name: 'Demo', schema: base }],
      workingCopy
    );

    expect(result.restoredCount).toBe(0);
    expect(result.systems[0]!.schema).toBe(base);
  });
});
