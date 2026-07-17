import { describe, it, expect, beforeEach } from 'vitest';
import { useBlueprintStore } from '../../store';
import { resetDefaultIdbSeedFlag, isDefaultIdbSeedCancelled } from './defaultIdbSeed';
import { EMPTY_WORKSPACE_PATH, EMPTY_WORKSPACE_SCHEMA } from './resetToEmptyWorkspace';

describe('resetToEmptyWorkspace', () => {
  beforeEach(() => {
    resetDefaultIdbSeedFlag();
    useBlueprintStore.setState({
      schema: {
        name: 'Sandbox Context',
        version: '1.0.0',
        level: 'context',
        nodes: [{ entityRef: 'a/sys', name: 'Sys', type: 'software-system' }],
        dependencies: [],
      },
      loadedSystems: [
        {
          path: 'context.yaml',
          name: 'Sandbox Context',
          schema: {
            name: 'Sandbox Context',
            version: '1.0.0',
            level: 'context',
            nodes: [{ entityRef: 'a/sys', name: 'Sys', type: 'software-system' }],
            dependencies: [],
          },
        },
        {
          path: 'containers.yaml',
          name: 'Containers',
          schema: {
            name: 'Containers',
            version: '1.0.0',
            level: 'container',
            nodes: [],
            dependencies: [],
          },
        },
      ],
      currentFilePath: 'context.yaml',
      workspaceName: 'Sandbox',
      isWorkspaceOpen: false,
      selectedNodeId: 'a/sys',
    });
  });

  it('clears sandbox systems and leaves a blank diagram', () => {
    useBlueprintStore.getState().resetToEmptyWorkspace();

    const state = useBlueprintStore.getState();
    expect(state.schema.name).toBe(EMPTY_WORKSPACE_SCHEMA.name);
    expect(state.schema.nodes).toEqual([]);
    expect(state.schema.dependencies).toEqual([]);
    expect(state.nodes).toEqual([]);
    expect(state.edges).toEqual([]);
    expect(state.currentFilePath).toBe(EMPTY_WORKSPACE_PATH);
    expect(state.loadedSystems).toHaveLength(1);
    expect(state.loadedSystems[0]?.path).toBe(EMPTY_WORKSPACE_PATH);
    expect(state.loadedSystems[0]?.schema.nodes).toEqual([]);
    expect(state.workspaceName).toBe('Empty Workspace');
    expect(state.selectedNodeId).toBeNull();
    expect(isDefaultIdbSeedCancelled()).toBe(true);
  });
});
