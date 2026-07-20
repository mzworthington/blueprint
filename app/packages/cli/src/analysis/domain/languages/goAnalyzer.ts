import type { ParsedSourceFile } from '../types.ts';
import { type SystemNode, slugify } from '@blueprint/core';
import type { LanguageAnalyzer, ContainerInfo } from './languageAnalyzer.ts';

export class GoAnalyzer implements LanguageAnalyzer {
  supports(fileExt: string): boolean {
    return fileExt === 'go';
  }

  createNode(sourceFile: ParsedSourceFile, cleanFileId: string, isTestFile: boolean): SystemNode {
    return {
      entityRef: cleanFileId,
      type: 'background-worker',
      name: `${sourceFile.baseName} Service`,
      isTest: isTestFile,
      properties: {
        filepath: sourceFile.relativePath,
        technology: 'Go Domain Service',
      },
    };
  }

  getContainerInfo(
    _node: SystemNode,
    _systemName: string,
    _fileExt: string,
    normalizedPath: string
  ): ContainerInfo | null {
    // Go packages live at the immediate parent directory of the file.
    const parts = normalizedPath.split('/');
    // Remove the filename
    const dirParts = parts.slice(0, -1);

    // Skip generic top-level directories shared across all Go projects.
    const skipDirs = new Set(['cmd', 'internal', 'pkg', 'vendor', 'src']);

    let folderName = '';
    // Walk from deepest to shallowest, take first meaningful segment.
    for (let i = dirParts.length - 1; i >= 0; i--) {
      if (!skipDirs.has(dirParts[i])) {
        folderName = dirParts[i];
        break;
      }
    }

    if (!folderName) return null;

    const containerId = slugify(folderName);
    const isApi =
      containerId.endsWith('api') ||
      folderName.toLowerCase().includes('handler') ||
      folderName.toLowerCase().includes('http') ||
      folderName.toLowerCase().includes('server');
    const containerType = isApi ? 'rest-api' : 'background-worker';

    return {
      entityRef: containerId,
      name: folderName,
      type: containerType,
      description: isApi ? `HTTP handlers for ${folderName}` : `Go package: ${folderName}`,
      technology: 'Go',
    };
  }
}
