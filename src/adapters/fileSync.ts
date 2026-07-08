import type { FileSystemPort } from '../domain/ports';

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
      if ('showSaveFilePicker' in window) {
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
        // Classic browser download fallback
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
      if ('showOpenFilePicker' in window) {
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
        // Classic browser file input fallback
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
