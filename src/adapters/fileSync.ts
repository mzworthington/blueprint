import type { FileSystemPort, WorkspacePort } from '../domain/ports';

/**
 * Local File Sync utilities implementing the File System Access API
 * and providing a standard download fallback.
 */
export const BrowserFileSystemAdapter: FileSystemPort = {
  /**
   * Saves a YAML string directly to the local filesystem using showSaveFilePicker
   * or downloads it as a fallback.
   */
  saveSchema: async (yamlContent: string, fileName: string): Promise<boolean> => {
    try {
      if (typeof (window as any).showSaveFilePicker === 'function') {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: fileName,
          types: [
            {
              description: 'YAML Schema Files',
              accept: { 'text/yaml': ['.yaml', '.yml'] },
            },
          ],
        });
        const writable = await handle.createWritable();
        await writable.write(yamlContent);
        await writable.close();
        return true;
      } else {
        const blob = new Blob([yamlContent], { type: 'text/yaml;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        return true;
      }
    } catch (e) {
      if ((e as Error).name === 'AbortError') {
        return false;
      }
      throw e;
    }
  },

  /**
   * Reads a YAML string from the local filesystem using showOpenFilePicker
   * or fallback file input.
   */
  loadSchema: async (): Promise<string | null> => {
    try {
      if (typeof (window as any).showOpenFilePicker === 'function') {
        const [handle] = await (window as any).showOpenFilePicker({
          types: [
            {
              description: 'YAML Schema Files',
              accept: { 'text/yaml': ['.yaml', '.yml'] },
            },
          ],
        });
        const file = await handle.getFile();
        const content = await file.text();
        return content;
      } else {
        return new Promise(resolve => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = '.yaml,.yml';
          input.onchange = async (event: Event) => {
            const target = event.target as HTMLInputElement;
            if (target.files && target.files.length > 0) {
              const file = target.files[0];
              const content = await file.text();
              resolve(content);
            } else {
              resolve(null);
            }
          };
          input.click();
          resolve(null);
        });
      }
    } catch (e) {
      if ((e as Error).name === 'AbortError') {
        return null;
      }
      throw e;
    }
  },
};

let activeDirectoryHandle: any | null = null;

/**
 * Concrete implementation of WorkspacePort using native File System Access API
 */
export const BrowserWorkspaceAdapter: WorkspacePort = {
  selectDirectory: async (): Promise<boolean> => {
    try {
      if (typeof (window as any).showDirectoryPicker === 'function') {
        activeDirectoryHandle = await (window as any).showDirectoryPicker({
          mode: 'readwrite',
        });
        return true;
      }
      return false;
    } catch (e) {
      if ((e as Error).name === 'AbortError') {
        return false;
      }
      throw e;
    }
  },

  readFile: async (relativePath: string): Promise<string> => {
    if (!activeDirectoryHandle) {
      throw new Error('No workspace directory active');
    }
    const parts = relativePath.split('/').filter(p => p && p !== '.');
    let currentHandle = activeDirectoryHandle;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (part === '..') {
        continue;
      }
      currentHandle = await currentHandle.getDirectoryHandle(part, { create: false });
    }

    const fileName = parts[parts.length - 1];
    const fileHandle = await currentHandle.getFileHandle(fileName, { create: false });
    const file = await fileHandle.getFile();
    return await file.text();
  },

  writeFile: async (relativePath: string, content: string): Promise<boolean> => {
    if (!activeDirectoryHandle) {
      throw new Error('No workspace directory active');
    }
    try {
      const parts = relativePath.split('/').filter(p => p && p !== '.');
      let currentHandle = activeDirectoryHandle;

      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (part === '..') continue;
        currentHandle = await currentHandle.getDirectoryHandle(part, { create: true });
      }

      const fileName = parts[parts.length - 1];
      const fileHandle = await currentHandle.getFileHandle(fileName, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(content);
      await writable.close();
      return true;
    } catch (e) {
      console.error('Failed to write relative file to directory handle', e);
      return false;
    }
  },

  getDirectoryName: (): string => {
    return activeDirectoryHandle ? activeDirectoryHandle.name : '';
  },

  hasPermission: async (): Promise<boolean> => {
    if (!activeDirectoryHandle) return false;
    const opts = { mode: 'readwrite' };
    try {
      if ((await activeDirectoryHandle.queryPermission(opts)) === 'granted') {
        return true;
      }
      if ((await activeDirectoryHandle.requestPermission(opts)) === 'granted') {
        return true;
      }
    } catch {
      return false;
    }
    return false;
  },

  readDirectoryFiles: async (): Promise<Array<{ name: string; content: string }>> => {
    if (!activeDirectoryHandle) {
      throw new Error('No workspace directory active');
    }
    const files: Array<{ name: string; content: string }> = [];
    for await (const entry of activeDirectoryHandle.values()) {
      if (entry.kind === 'file' && (entry.name.endsWith('.yaml') || entry.name.endsWith('.yml'))) {
        const file = await entry.getFile();
        const content = await file.text();
        files.push({ name: entry.name, content });
      }
    }
    return files;
  },
};
