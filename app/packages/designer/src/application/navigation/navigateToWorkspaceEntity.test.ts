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
  it('navigates to the owning diagram and selects the entity', async () => {
    const setLocation = vi.fn();
    const selectSystem = vi.fn().mockResolvedValue(undefined);
    const selectNode = vi.fn();

    const ok = await navigateToWorkspaceEntity('billing/api', {
      workspaceCatalog: catalog,
      currentFilePath: 'context.yaml',
      setLocation,
      selectSystem,
      selectNode,
    });

    expect(ok).toBe(true);
    expect(setLocation).toHaveBeenCalledWith('/workspace/billing/api');
    expect(selectSystem).toHaveBeenCalledWith('containers.yaml');
    expect(selectNode).toHaveBeenCalledWith('billing/api');
  });

  it('skips diagram reload when already on the home diagram', async () => {
    const setLocation = vi.fn();
    const selectSystem = vi.fn().mockResolvedValue(undefined);
    const selectNode = vi.fn();

    const ok = await navigateToWorkspaceEntity('billing/api', {
      workspaceCatalog: catalog,
      currentFilePath: 'containers.yaml',
      setLocation,
      selectSystem,
      selectNode,
    });

    expect(ok).toBe(true);
    expect(setLocation).toHaveBeenCalledWith('/workspace/billing/api');
    expect(selectSystem).not.toHaveBeenCalled();
    expect(selectNode).toHaveBeenCalledWith('billing/api');
  });

  it('uses the diagram entityRef in the URL when the target is a diagram', async () => {
    const setLocation = vi.fn();
    const selectSystem = vi.fn().mockResolvedValue(undefined);
    const selectNode = vi.fn();

    const ok = await navigateToWorkspaceEntity('billing', {
      workspaceCatalog: catalog,
      currentFilePath: 'context.yaml',
      setLocation,
      selectSystem,
      selectNode,
    });

    expect(ok).toBe(true);
    expect(setLocation).toHaveBeenCalledWith('/workspace/billing');
    expect(selectSystem).toHaveBeenCalledWith('containers.yaml');
    expect(selectNode).not.toHaveBeenCalled();
  });

  it('returns false when the entity is not in the catalog', async () => {
    const setLocation = vi.fn();
    const selectSystem = vi.fn();
    const selectNode = vi.fn();

    const ok = await navigateToWorkspaceEntity('missing/api', {
      workspaceCatalog: catalog,
      currentFilePath: 'context.yaml',
      setLocation,
      selectSystem,
      selectNode,
    });

    expect(ok).toBe(false);
    expect(setLocation).not.toHaveBeenCalled();
    expect(selectSystem).not.toHaveBeenCalled();
    expect(selectNode).not.toHaveBeenCalled();
  });
});
