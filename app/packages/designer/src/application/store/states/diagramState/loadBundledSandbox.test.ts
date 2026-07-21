import { describe, it, expect } from 'vitest';
import { activateBundledSandbox, pickSandboxEntryDiagram } from './loadBundledSandbox';
import type { SystemSchema } from '@blueprint/core';

const contextSchema: SystemSchema = {
  name: 'Blueprint Context',
  version: '1.0.0',
  level: 'context',
  entityRef: 'blueprint',
  nodes: [
    { entityRef: 'blueprint/user', type: 'person', name: 'User' },
    { entityRef: 'blueprint/app', type: 'software-system', name: 'App' },
  ],
  dependencies: [],
};

describe('loadBundledSandbox', () => {
  it('pickSandboxEntryDiagram prefers context level', () => {
    const entry = pickSandboxEntryDiagram([
      {
        path: 'app/containers.yaml',
        name: 'Containers',
        schema: { ...contextSchema, level: 'container', nodes: [] },
      },
      { path: 'context.yaml', name: 'Context', schema: contextSchema },
    ]);
    expect(entry?.path).toBe('context.yaml');
  });

  it('activateBundledSandbox loads systems and initializes the entry diagram', () => {
    const systems = [
      { path: 'context.yaml', name: 'Context', schema: contextSchema },
      {
        path: 'app/containers.yaml',
        name: 'Containers',
        schema: {
          name: 'App Containers',
          version: '1.0.0',
          level: 'container' as const,
          entityRef: 'blueprint/app',
          nodes: [],
          dependencies: [],
        },
      },
    ];

    let store: Record<string, unknown> = {
      isWorkspaceOpen: false,
      loadedSystems: [],
      workspaceName: '',
      diagramLoadCount: 0,
      isLoading: false,
      systemSelectInFlight: null as string | null,
      clearHistory: () => {},
      initSchema: (schema: SystemSchema) => {
        store = { ...store, schema };
      },
    };

    activateBundledSandbox(
      partial => {
        store = { ...store, ...partial };
      },
      () =>
        store as {
          isWorkspaceOpen: boolean;
          initSchema: (schema: SystemSchema) => void;
          clearHistory: () => void;
          diagramLoadCount: number;
          isLoading: boolean | string;
          systemSelectInFlight: string | null;
          loadedSystems: typeof systems;
          workspaceName: string;
        },
      systems
    );

    expect(store.loadedSystems).toHaveLength(2);
    expect(store.currentFilePath).toBe('context.yaml');
    expect(store.workspaceCatalog).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: 'context.yaml', level: 'context' })])
    );
    expect(store.schema).toMatchObject({ level: 'context', name: 'Blueprint Context' });
  });

  it('activateBundledSandbox replaces a prior empty canvas', () => {
    let store: Record<string, unknown> = {
      isWorkspaceOpen: false,
      loadedSystems: [
        {
          path: 'blueprint.yaml',
          name: 'Empty',
          schema: {
            name: 'Empty',
            version: '1.0.0',
            level: 'container',
            nodes: [],
            dependencies: [],
          },
        },
      ],
      currentFilePath: 'blueprint.yaml',
      workspaceName: '',
      diagramLoadCount: 0,
      isLoading: false,
      systemSelectInFlight: null as string | null,
      clearHistory: () => {},
      initSchema: (schema: SystemSchema) => {
        store = { ...store, schema };
      },
    };

    activateBundledSandbox(
      partial => {
        store = { ...store, ...partial };
      },
      () =>
        store as {
          isWorkspaceOpen: boolean;
          initSchema: (schema: SystemSchema) => void;
          clearHistory: () => void;
          diagramLoadCount: number;
          isLoading: boolean | string;
          systemSelectInFlight: string | null;
          loadedSystems: Array<{ path: string; name: string; schema: SystemSchema }>;
          workspaceName: string;
        },
      [{ path: 'context.yaml', name: 'Context', schema: contextSchema }]
    );

    expect(store.currentFilePath).toBe('context.yaml');
    expect((store.schema as SystemSchema).nodes).toHaveLength(2);
  });
});
