import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BrowserFileSystemAdapter, BrowserWorkspaceAdapter } from './fileSync';

describe('fileSync Adapters', () => {
  beforeEach(() => {
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn().mockReturnValue('blob:mock-url'),
      revokeObjectURL: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('BrowserFileSystemAdapter (FileSystemPort)', () => {
    describe('saveSchema', () => {
      it('uses showSaveFilePicker if available in window', async () => {
        const mockWritable = {
          write: vi.fn().mockResolvedValue(undefined),
          close: vi.fn().mockResolvedValue(undefined),
        };
        const mockFileHandle = {
          createWritable: vi.fn().mockResolvedValue(mockWritable),
        };
        const mockShowSaveFilePicker = vi.fn().mockResolvedValue(mockFileHandle);

        vi.stubGlobal('showSaveFilePicker', mockShowSaveFilePicker);

        const success = await BrowserFileSystemAdapter.saveSchema('yaml-content', 'test.yaml');

        expect(success).toBe(true);
        expect(mockShowSaveFilePicker).toHaveBeenCalledWith({
          suggestedName: 'test.yaml',
          types: [
            {
              description: 'YAML Schema Files',
              accept: { 'text/yaml': ['.yaml', '.yml'] },
            },
          ],
        });
        expect(mockFileHandle.createWritable).toHaveBeenCalled();
        expect(mockWritable.write).toHaveBeenCalledWith('yaml-content');
        expect(mockWritable.close).toHaveBeenCalled();
      });

      it('falls back to browser anchor tag download if showSaveFilePicker is not supported', async () => {
        vi.stubGlobal('showSaveFilePicker', undefined);

        const mockClick = vi.fn();
        const originalCreateElement = document.createElement.bind(document);
        vi.spyOn(document, 'createElement').mockImplementation(tagName => {
          const el = originalCreateElement(tagName);
          if (tagName === 'a') {
            el.click = mockClick;
          }
          return el;
        });

        const success = await BrowserFileSystemAdapter.saveSchema('yaml-content', 'test.yaml');

        expect(success).toBe(true);
        expect(mockClick).toHaveBeenCalled();
      });
    });

    describe('loadSchema', () => {
      it('uses showOpenFilePicker if available in window', async () => {
        const mockFileObj = {
          text: vi.fn().mockResolvedValue('parsed-content'),
        };
        const mockFileHandle = {
          getFile: vi.fn().mockResolvedValue(mockFileObj),
        };
        const mockShowOpenFilePicker = vi.fn().mockResolvedValue([mockFileHandle]);

        vi.stubGlobal('showOpenFilePicker', mockShowOpenFilePicker);

        const content = await BrowserFileSystemAdapter.loadSchema();

        expect(content).toBe('parsed-content');
        expect(mockShowOpenFilePicker).toHaveBeenCalledWith({
          types: [
            {
              description: 'YAML Schema Files',
              accept: { 'text/yaml': ['.yaml', '.yml'] },
            },
          ],
        });
        expect(mockFileHandle.getFile).toHaveBeenCalled();
        expect(mockFileObj.text).toHaveBeenCalled();
      });

      it('falls back to file input click if showOpenFilePicker is not supported', async () => {
        vi.stubGlobal('showOpenFilePicker', undefined);

        const mockClick = vi.fn();
        const originalCreateElement = document.createElement.bind(document);
        vi.spyOn(document, 'createElement').mockImplementation(tagName => {
          const el = originalCreateElement(tagName);
          if (tagName === 'input') {
            el.click = mockClick;
          }
          return el;
        });

        await BrowserFileSystemAdapter.loadSchema();
        expect(mockClick).toHaveBeenCalled();
      });
    });
  });

  describe('BrowserWorkspaceAdapter (WorkspacePort)', () => {
    let mockFileHandle: any;
    let mockSubFileHandle: any;
    let mockDirectoryHandle: any;

    beforeEach(() => {
      mockFileHandle = {
        kind: 'file',
        name: 'system.yaml',
        getFile: vi.fn().mockResolvedValue({
          text: vi.fn().mockResolvedValue('file1 content'),
        }),
      };
      mockSubFileHandle = {
        kind: 'file',
        name: 'non-yaml-doc.txt',
      };
      mockDirectoryHandle = {
        name: 'SelectedWorkspaceFolder',
        values: () => {
          return {
            [Symbol.asyncIterator]() {
              let index = 0;
              const entries = [mockFileHandle, mockSubFileHandle];
              return {
                async next() {
                  if (index < entries.length) {
                    return { value: entries[index++], done: false };
                  }
                  return { done: true };
                },
              };
            },
          };
        },
        getDirectoryHandle: vi.fn(),
        getFileHandle: vi.fn(),
        queryPermission: vi.fn().mockResolvedValue('granted'),
        requestPermission: vi.fn().mockResolvedValue('granted'),
      };

      vi.stubGlobal('showDirectoryPicker', vi.fn().mockResolvedValue(mockDirectoryHandle));
    });

    it('selectDirectory prompts showDirectoryPicker and saves active handle', async () => {
      const ok = await BrowserWorkspaceAdapter.selectDirectory();
      expect(ok).toBe(true);
      expect(BrowserWorkspaceAdapter.getDirectoryName()).toBe('SelectedWorkspaceFolder');
    });

    it('hasPermission queries and requests browser file handle permissions', async () => {
      await BrowserWorkspaceAdapter.selectDirectory();

      const hasPerm = await BrowserWorkspaceAdapter.hasPermission();
      expect(hasPerm).toBe(true);
      expect(mockDirectoryHandle.queryPermission).toHaveBeenCalled();
    });

    it('readDirectoryFiles reads top-level .yaml and .yml files from active handle', async () => {
      await BrowserWorkspaceAdapter.selectDirectory();

      const files = await BrowserWorkspaceAdapter.readDirectoryFiles();

      expect(files).toHaveLength(1);
      expect(files[0]).toEqual({
        name: 'system.yaml',
        content: 'file1 content',
      });
    });

    it('readFile splits path and traverses directory handle recursively to return content', async () => {
      await BrowserWorkspaceAdapter.selectDirectory();

      const mockSubFile = {
        getFile: vi.fn().mockResolvedValue({
          text: vi.fn().mockResolvedValue('leaf node details'),
        }),
      };
      const mockNestedDir = {
        getDirectoryHandle: vi.fn().mockReturnThis(),
        getFileHandle: vi.fn().mockResolvedValue(mockSubFile),
      };
      mockDirectoryHandle.getDirectoryHandle.mockResolvedValue(mockNestedDir);

      const content = await BrowserWorkspaceAdapter.readFile('sub-dir/nested/my-diagram.yaml');

      expect(content).toBe('leaf node details');
      expect(mockDirectoryHandle.getDirectoryHandle).toHaveBeenCalledWith('sub-dir', {
        create: false,
      });
      expect(mockNestedDir.getDirectoryHandle).toHaveBeenCalledWith('nested', { create: false });
      expect(mockNestedDir.getFileHandle).toHaveBeenCalledWith('my-diagram.yaml', {
        create: false,
      });
    });

    it('writeFile creates directory structure and file handles to write content', async () => {
      await BrowserWorkspaceAdapter.selectDirectory();

      const mockWritable = {
        write: vi.fn().mockResolvedValue(undefined),
        close: vi.fn().mockResolvedValue(undefined),
      };
      const mockSubFile = {
        createWritable: vi.fn().mockResolvedValue(mockWritable),
      };
      const mockNestedDir = {
        getDirectoryHandle: vi.fn().mockReturnThis(),
        getFileHandle: vi.fn().mockResolvedValue(mockSubFile),
      };
      mockDirectoryHandle.getDirectoryHandle.mockResolvedValue(mockNestedDir);

      const ok = await BrowserWorkspaceAdapter.writeFile('services/auth/details.yaml', 'new data');

      expect(ok).toBe(true);
      expect(mockDirectoryHandle.getDirectoryHandle).toHaveBeenCalledWith('services', {
        create: true,
      });
      expect(mockNestedDir.getDirectoryHandle).toHaveBeenCalledWith('auth', { create: true });
      expect(mockNestedDir.getFileHandle).toHaveBeenCalledWith('details.yaml', { create: true });
      expect(mockWritable.write).toHaveBeenCalledWith('new data');
      expect(mockWritable.close).toHaveBeenCalled();
    });
  });
});
