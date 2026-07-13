import type { ParsedSourceFile } from './types.ts';
import { NodeType, type SystemNode } from '../../core/generated/blueprint/v1/schema.ts';
import type { LanguageAnalyzer, ContainerInfo } from './languageAnalyzer.ts';

export class FallbackAnalyzer implements LanguageAnalyzer {
  supports(_fileExt: string): boolean {
    return true; // Catch-all fallback
  }

  createNode(sourceFile: ParsedSourceFile, cleanFileId: string, isTestFile: boolean): SystemNode {
    return {
      id: cleanFileId,
      type: NodeType.NODE_TYPE_BACKGROUND_WORKER,
      name: `${sourceFile.baseName} Service`,
      isTest: isTestFile,
      properties: {
        filepath: sourceFile.relativePath,
        namespaces: (sourceFile.namespaces || []).join(','),
        technology: 'Domain Service',
      },
    };
  }

  getContainerInfo(
    _node: SystemNode,
    _systemName: string,
    _fileExt: string,
    normalizedPath: string
  ): ContainerInfo | null {
    const parts = normalizedPath.split('/');
    const srcIndex = parts.indexOf('src');
    let folderName = '';
    if (srcIndex !== -1 && parts.length > srcIndex + 1) {
      folderName = parts[srcIndex + 1];
    } else if (parts.length > 2) {
      folderName = parts[parts.length - 2];
    }

    if (folderName && folderName !== 'src') {
      const containerName = folderName;
      const containerId = this.sanitizeId(folderName);
      const isApi =
        containerId.endsWith('api') ||
        containerId.includes('controller') ||
        containerId.includes('server');
      const containerType = isApi ? 'gateway-api' : 'background-worker';

      return {
        id: containerId,
        name: containerName,
        type: containerType,
        description: `Core services for ${containerName}`,
        technology: 'Unknown',
      };
    }

    return null;
  }

  private sanitizeId(raw: string): string {
    return raw.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  }
}
