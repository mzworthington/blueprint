import type { ParsedSourceFile } from './types.ts';
import { type SystemNode, slugify } from '@blueprint/core';
import type { LanguageAnalyzer, ContainerInfo } from './languageAnalyzer.ts';

export class PythonAnalyzer implements LanguageAnalyzer {
  supports(fileExt: string): boolean {
    return fileExt === 'py';
  }

  createNode(sourceFile: ParsedSourceFile, cleanFileId: string, isTestFile: boolean): SystemNode {
    return {
      entityRef: cleanFileId,
      type: 'background-worker',
      name: `${sourceFile.baseName} Service`,
      isTest: isTestFile,
      properties: {
        filepath: sourceFile.relativePath,
        namespaces: (sourceFile.namespaces || []).join(','),
        technology: 'Python Domain Service',
      },
    };
  }

  getContainerInfo(
    node: SystemNode,
    _systemName: string,
    _fileExt: string,
    normalizedPath: string
  ): ContainerInfo | null {
    const namespacesStr = node.properties?.namespaces as string | undefined;
    const namespaces = namespacesStr ? namespacesStr.split(',').filter(Boolean) : [];
    let containerName = '';
    let containerId = '';

    if (namespaces.length > 0) {
      const primaryNamespace = namespaces[0];
      const parts = primaryNamespace.split('.');
      const segment = parts.slice(0, Math.min(parts.length, 2)).join('.');
      if (segment && segment !== 'System' && segment !== 'Microsoft') {
        containerName = segment;
        containerId = slugify(segment);
      }
    }

    if (!containerId) {
      const parts = normalizedPath.split('/');
      const srcIndex = parts.indexOf('src');
      let folderName = '';
      if (srcIndex !== -1 && parts.length > srcIndex + 1) {
        folderName = parts[srcIndex + 1];
      } else if (parts.length > 2) {
        folderName = parts[parts.length - 2];
      }

      if (folderName && folderName !== 'src') {
        containerName = folderName;
        containerId = slugify(folderName);
      }
    }

    if (containerId) {
      const isApi =
        containerId.endsWith('api') ||
        containerId.includes('controller') ||
        containerId.includes('server');
      const containerType = isApi ? 'gateway-api' : 'background-worker';
      const desc = isApi
        ? `REST API endpoints for ${containerName}`
        : `Core domain services for ${containerName}`;

      return {
        entityRef: containerId,
        name: containerName,
        type: containerType,
        description: desc,
        technology: 'Python',
      };
    }

    return null;
  }
}
