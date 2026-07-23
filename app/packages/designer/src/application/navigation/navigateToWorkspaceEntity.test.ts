import { describe, it, expect, vi } from 'vitest';
import { navigateToWorkspaceEntity } from './navigateToWorkspaceEntity';
import type { WorkspaceCatalogEntry } from '@blueprint/core';

const catalog: WorkspaceCatalogEntry[] = [
  {
    path: 'containers.yaml',
    name: 'Billing Containers',
    level: 'container',
    entityRef: 'billing',
    nodeEntityRefs: ['billing/api'],
  },
];

describe('navigateToWorkspaceEntity', () => {
  it('updates the URL and lets useUrlSync load the diagram', () => {
    const setLocation = vi.fn();

    const ok = navigateToWorkspaceEntity('billing/api', {
      workspaceCatalog: catalog,
      setLocation,
    });

    expect(ok).toBe(true);
    expect(setLocation).toHaveBeenCalledWith('/workspace/billing/api');
  });

  it('uses the diagram entityRef in the URL when the target is a diagram', () => {
    const setLocation = vi.fn();

    const ok = navigateToWorkspaceEntity('billing', {
      workspaceCatalog: catalog,
      setLocation,
    });

    expect(ok).toBe(true);
    expect(setLocation).toHaveBeenCalledWith('/workspace/billing');
  });

  it('returns false when the entity is not in the catalog', () => {
    const setLocation = vi.fn();

    const ok = navigateToWorkspaceEntity('missing/api', {
      workspaceCatalog: catalog,
      setLocation,
    });

    expect(ok).toBe(false);
    expect(setLocation).not.toHaveBeenCalled();
  });
});
