import { renderHook } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useUrlSync } from './useUrlSync';
import { useBlueprintStore } from '../../../../application/store/store';

const setLocation = vi.fn();
let mockLocation = '/workspace/blueprint/app/cli/nodefilesystem';

vi.mock('wouter', () => ({
  useLocation: () => [mockLocation, setLocation],
  useRoute: () => [true, { '*': 'blueprint/app/cli/nodefilesystem' }],
}));

describe('useUrlSync', () => {
  beforeEach(() => {
    mockLocation = '/workspace/blueprint/app/cli/nodefilesystem';
    setLocation.mockReset();
    const { initSchema } = useBlueprintStore.getState();
    initSchema({
      name: 'CLI Components',
      version: '1.0.0',
      level: 'component',
      entityRef: 'blueprint/app/cli',
      nodes: [
        {
          entityRef: 'blueprint/app/cli/nodefilesystem',
          type: 'background-worker',
          name: 'nodeFileSystem',
        },
        { entityRef: 'blueprint/app/cli/ports', type: 'background-worker', name: 'ports Service' },
      ],
      dependencies: [
        {
          from: 'blueprint/app/cli/nodefilesystem',
          to: 'blueprint/app/cli/ports',
          type: 'direct-call',
        },
      ],
    });
    useBlueprintStore.setState({
      selectedNodeId: 'blueprint/app/cli/nodefilesystem',
      currentFilePath: 'app/cli-components.yaml',
      workspaceCatalog: [
        {
          path: 'app/cli-components.yaml',
          name: 'CLI Components',
          level: 'component',
          entityRef: 'blueprint/app/cli',
          nodeEntityRefs: ['blueprint/app/cli/nodefilesystem', 'blueprint/app/cli/ports'],
        },
      ],
      loadedSystems: [
        {
          path: 'app/cli-components.yaml',
          name: 'CLI Components',
          schema: useBlueprintStore.getState().schema,
        },
      ],
      isWorkspaceOpen: true,
      workspaceName: 'blueprint',
      isStartupOpen: false,
      systemSelectInFlight: null,
      diagramLoadCount: 0,
    });
  });

  it('updates the URL when the user selects a different node on the canvas', () => {
    const { rerender } = renderHook(() => useUrlSync());

    useBlueprintStore.getState().selectNode('blueprint/app/cli/ports');
    rerender();

    expect(setLocation).toHaveBeenCalledWith('/workspace/blueprint/app/cli/ports', {
      replace: true,
    });
    expect(useBlueprintStore.getState().selectedNodeId).toBe('blueprint/app/cli/ports');
  });
});
