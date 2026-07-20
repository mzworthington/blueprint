import { describe, it, expect } from 'vitest';
import { buildWorkspaceCatalog } from './workspaceCatalog';
import type { SystemSchema } from '../models/schema';

describe('workspaceCatalog', () => {
  it('derives entityRef from schema name when missing', () => {
    const orphan: SystemSchema = {
      name: 'Orphan System',
      version: '1.0.0',
      level: 'container',
      nodes: [],
      dependencies: [],
    };
    const catalog = buildWorkspaceCatalog([{ path: 'orphan.yaml', schema: orphan }]);
    expect(catalog[0]?.entityRef).toBe('orphan-system');
  });
});
