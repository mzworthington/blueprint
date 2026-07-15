import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useBlueprintStore } from '../store';

describe('ioState Actions & State Management', () => {
  const mockFiles: Record<string, string> = {
    'blueprint.yaml': `
name: Root Context
version: 1.0.0
level: context
nodes:
  - entityRef: web-app
    type: web-app
    name: Web App
dependencies: []
`,
    'web/container.yaml': `
name: Web Containers
version: 1.0.0
level: container
id: web-app
nodes:
  - entityRef: controller
    type: component
    name: API Controller
dependencies: []
`,
  };

  const mockWorkspacePort: any = {
    selectDirectory: async () => true,
    readFile: async (path: string) => {
      if (mockFiles[path]) return mockFiles[path];
      throw new Error(`File not found: ${path}`);
    },
    writeFile: async (path: string, content: string) => {
      mockFiles[path] = content;
      return true;
    },
    getDirectoryName: () => 'MockWorkspace',
    hasPermission: async () => true,
    readDirectoryFiles: async () => {
      return Object.entries(mockFiles)
        .filter(([path]) => path.endsWith('.yaml') || path.endsWith('.yml'))
        .map(([path, content]) => ({ name: path, content }));
    },
  };

  beforeEach(() => {
    delete mockFiles['another-system.yaml'];
    useBlueprintStore.setState({
      workspacePort: mockWorkspacePort,
      currentFilePath: 'blueprint.yaml',
      isWorkspaceOpen: false,
      workspaceName: '',
    });
  });

  it('should open workspace, read blueprint.yaml, and mark workspace as open', async () => {
    const store = useBlueprintStore.getState();
    const success = await store.openWorkspaceDirectory();

    expect(success).toBe(true);
    const updatedState = useBlueprintStore.getState();
    expect(updatedState.isWorkspaceOpen).toBe(true);
    expect(updatedState.workspaceName).toBe('MockWorkspace');
    expect(updatedState.currentFilePath).toBe('blueprint.yaml');
    expect(updatedState.schema.name).toBe('Root Context');
    expect(updatedState.schema.level).toBe('context');
    expect(updatedState.nodes).toHaveLength(1);
  });

  it('should load multiple top-level systems and support selecting between them', async () => {
    mockFiles['another-system.yaml'] = `
name: Another System
version: 1.0.0
level: container
nodes: []
dependencies: []
`;
    const store = useBlueprintStore.getState();
    const success = await store.openWorkspaceDirectory();
    expect(success).toBe(true);

    const state = useBlueprintStore.getState();
    expect(state.loadedSystems).toHaveLength(3);
    expect(state.loadedSystems[0].path).toBe('blueprint.yaml');
    expect(state.loadedSystems[1].path).toBe('web/container.yaml');
    expect(state.loadedSystems[2].path).toBe('another-system.yaml');
    expect(state.currentFilePath).toBe('blueprint.yaml');

    store.selectSystem('another-system.yaml');
    const state2 = useBlueprintStore.getState();
    expect(state2.currentFilePath).toBe('another-system.yaml');
    expect(state2.schema.name).toBe('Another System');
  });

  // Save workspace manifest tests removed.

  describe('saveSchema error handling', () => {
    it('should return false if saveSchema port operation fails', async () => {
      const store = useBlueprintStore.getState();
      const spySave = vi.spyOn(store.fileSystemPort, 'saveSchema');
      spySave.mockResolvedValue(false);

      const success = await store.saveSchema();
      expect(success).toBe(false);
      spySave.mockRestore();
    });

    it('should return false and log error if saveSchema throws', async () => {
      const store = useBlueprintStore.getState();
      const spySave = vi.spyOn(store.fileSystemPort, 'saveSchema');
      spySave.mockRejectedValue(new Error('Write permission denied'));

      const success = await store.saveSchema();
      expect(success).toBe(false);
      spySave.mockRestore();
    });
  });

  describe('loadSchema error handling', () => {
    it('should load content and return true on successful parsing', async () => {
      const store = useBlueprintStore.getState();
      const spyLoad = vi.spyOn(store.fileSystemPort, 'loadSchema');
      spyLoad.mockResolvedValue('name: Test Load\nversion: 1.0.0\nlevel: context\nnodes: []');

      const success = await store.loadSchema();
      expect(success).toBe(true);
      expect(useBlueprintStore.getState().schema.name).toBe('Test Load');
      spyLoad.mockRestore();
    });

    it('should return false if loadSchema is cancelled by user', async () => {
      const store = useBlueprintStore.getState();
      const spyLoad = vi.spyOn(store.fileSystemPort, 'loadSchema');
      spyLoad.mockResolvedValue(null);

      const success = await store.loadSchema();
      expect(success).toBe(false);
      spyLoad.mockRestore();
    });

    it('should return false if loadSchema throws', async () => {
      const store = useBlueprintStore.getState();
      const spyLoad = vi.spyOn(store.fileSystemPort, 'loadSchema');
      spyLoad.mockRejectedValue(new Error('File corrupted'));

      const success = await store.loadSchema();
      expect(success).toBe(false);
      spyLoad.mockRestore();
    });
  });

  describe('saveActiveDiagram logic', () => {
    it('should delegate to saveSchema when workspace is not open', async () => {
      const store = useBlueprintStore.getState();
      const originalSaveSchema = store.saveSchema;
      useBlueprintStore.setState({ isWorkspaceOpen: false });

      const mockSaveSchema = vi.fn().mockResolvedValue(true);
      useBlueprintStore.setState({ saveSchema: mockSaveSchema });

      const success = await store.saveActiveDiagram();
      expect(success).toBe(true);
      expect(mockSaveSchema).toHaveBeenCalled();

      useBlueprintStore.setState({ saveSchema: originalSaveSchema });
    });

    it('should write to file successfully when workspace is open', async () => {
      const store = useBlueprintStore.getState();
      await store.openWorkspaceDirectory();

      const spyWrite = vi.spyOn(store.workspacePort, 'writeFile');
      spyWrite.mockResolvedValue(true);

      const success = await store.saveActiveDiagram();
      expect(success).toBe(true);
      spyWrite.mockRestore();
    });

    it('should return false if writeFile fails or throws when workspace is open', async () => {
      const store = useBlueprintStore.getState();
      await store.openWorkspaceDirectory();

      const spyWrite = vi.spyOn(store.workspacePort, 'writeFile');
      spyWrite.mockRejectedValue(new Error('Read-only filesystem'));

      const success = await store.saveActiveDiagram();
      expect(success).toBe(false);
      spyWrite.mockRestore();
    });
  });

  describe('openWorkspaceDirectory edge cases', () => {
    it('should fail if no files are returned from workspace', async () => {
      const store = useBlueprintStore.getState();
      const spyRead = vi.spyOn(store.workspacePort, 'readDirectoryFiles');
      spyRead.mockResolvedValue([]);

      const success = await store.openWorkspaceDirectory();
      expect(success).toBe(false);
      expect(useBlueprintStore.getState().lastError).toContain('No blueprint .yaml or .yml');
      spyRead.mockRestore();
    });

    it('should log/skip invalid manifests and schemas and continue if at least one schema is valid', async () => {
      const store = useBlueprintStore.getState();
      const spyRead = vi.spyOn(store.workspacePort, 'readDirectoryFiles');
      spyRead.mockResolvedValue([
        { name: 'workspace.yaml', content: 'invalid: :yaml' },
        { name: 'broken-schema.yaml', content: 'name: Broken\nlevel: invalid' },
        {
          name: 'valid.yaml',
          content: 'name: Valid Schema\nversion: 1.0.0\nlevel: context\nnodes: []',
        },
      ]);

      const success = await store.openWorkspaceDirectory();
      expect(success).toBe(true);
      expect(useBlueprintStore.getState().schema.name).toBe('Valid Schema');
      spyRead.mockRestore();
    });

    it('should fail if all schema files fail to parse', async () => {
      const store = useBlueprintStore.getState();
      const spyRead = vi.spyOn(store.workspacePort, 'readDirectoryFiles');
      spyRead.mockResolvedValue([{ name: 'broken.yaml', content: 'invalid: :yaml' }]);

      const success = await store.openWorkspaceDirectory();
      expect(success).toBe(false);
      expect(useBlueprintStore.getState().lastError).toContain('No valid blueprint schemas found');
      spyRead.mockRestore();
    });
  });
});
