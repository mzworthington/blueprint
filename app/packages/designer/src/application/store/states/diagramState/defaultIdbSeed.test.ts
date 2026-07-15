import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  cancelDefaultIdbSeed,
  resetDefaultIdbSeedFlag,
  seedDefaultSchemasSafely,
  isDefaultIdbSeedCancelled,
} from './defaultIdbSeed';
import type { SystemSchema } from '@blueprint/core';

const schema: SystemSchema = {
  name: 'Demo',
  version: '1.0.0',
  level: 'context',
  entityRef: 'demo',
  nodes: [{ entityRef: 'demo/a', type: 'software-system', name: 'A' }],
  dependencies: [],
};

describe('defaultIdbSeed', () => {
  beforeEach(() => {
    resetDefaultIdbSeedFlag();
  });

  it('seeds when path has no stored data', async () => {
    const saveBaselineSchema = vi.fn().mockResolvedValue(undefined);
    const saveWorkingSchema = vi.fn().mockResolvedValue(undefined);

    await seedDefaultSchemasSafely(
      [{ path: 'context.yaml', schema }],
      { schemas: { 'context.yaml': schema }, nodeRefMap: { 'context.yaml': {} } },
      {
        pathHasStoredData: async () => false,
        saveBaselineSchema,
        saveWorkingSchema,
      }
    );

    expect(saveBaselineSchema).toHaveBeenCalledOnce();
    expect(saveWorkingSchema).toHaveBeenCalledOnce();
  });

  it('skips paths that already have IndexedDB data', async () => {
    const saveBaselineSchema = vi.fn();
    const saveWorkingSchema = vi.fn();

    await seedDefaultSchemasSafely(
      [{ path: 'context.yaml', schema }],
      { schemas: { 'context.yaml': schema }, nodeRefMap: { 'context.yaml': {} } },
      {
        pathHasStoredData: async () => true,
        saveBaselineSchema,
        saveWorkingSchema,
      }
    );

    expect(saveBaselineSchema).not.toHaveBeenCalled();
    expect(saveWorkingSchema).not.toHaveBeenCalled();
  });

  it('stops when seed is cancelled (workspace opened)', async () => {
    cancelDefaultIdbSeed();
    expect(isDefaultIdbSeedCancelled()).toBe(true);

    const saveBaselineSchema = vi.fn();
    await seedDefaultSchemasSafely(
      [{ path: 'context.yaml', schema }],
      { schemas: { 'context.yaml': schema }, nodeRefMap: { 'context.yaml': {} } },
      {
        pathHasStoredData: async () => false,
        saveBaselineSchema,
        saveWorkingSchema: vi.fn(),
      }
    );

    expect(saveBaselineSchema).not.toHaveBeenCalled();
  });
});
