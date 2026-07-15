import type { ParsedSourceFile } from './types.ts';
import { type SystemNode } from '@blueprint/core';
import type { LanguageAnalyzer, ContainerInfo } from './languageAnalyzer.ts';

export class CSharpAnalyzer implements LanguageAnalyzer {
  supports(fileExt: string): boolean {
    return fileExt === 'cs';
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
        technology: 'C# Domain Service',
      },
    };
  }

  getContainerInfo(
    node: SystemNode,
    systemName: string,
    fileExt: string,
    normalizedPath: string
  ): ContainerInfo | null {
    // Resolve container from namespaces or folder structures
    const namespacesStr = node.properties?.namespaces as string | undefined;
    const namespaces = namespacesStr ? namespacesStr.split(',').filter(Boolean) : [];
    let containerName = '';
    let containerId = '';

    // A. Use namespace if present
    if (namespaces.length > 0) {
      const primaryNamespace = namespaces[0];
      const parts = primaryNamespace.split('.');
      const segment = parts.slice(0, Math.min(parts.length, 2)).join('.');
      if (segment && segment !== 'System' && segment !== 'Microsoft') {
        containerName = segment;
        containerId = this.sanitizeId(segment);
      }
    }

    // B. Fallback to folder structure
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
        containerId = this.sanitizeId(folderName);
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
        technology: 'C# / .NET',
      };
    }

    return null;
  }

  private sanitizeId(raw: string): string {
    return raw.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  }
}
