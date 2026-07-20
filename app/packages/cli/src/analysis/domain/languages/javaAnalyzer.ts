import type { ParsedSourceFile } from '../types.ts';
import { type SystemNode, slugify } from '@blueprint/core';
import type { LanguageAnalyzer, ContainerInfo } from './languageAnalyzer.ts';

export class JavaAnalyzer implements LanguageAnalyzer {
  supports(fileExt: string): boolean {
    return fileExt === 'java' || fileExt === 'kt' || fileExt === 'kts';
  }

  createNode(sourceFile: ParsedSourceFile, cleanFileId: string, isTestFile: boolean): SystemNode {
    const ext = sourceFile.relativePath.split('.').pop()?.toLowerCase() ?? 'java';
    const lang = ext === 'java' ? 'Java' : 'Kotlin';

    return {
      entityRef: cleanFileId,
      type: 'background-worker',
      name: `${sourceFile.baseName} Service`,
      isTest: isTestFile,
      properties: {
        filepath: sourceFile.relativePath,
        namespaces: (sourceFile.namespaces ?? []).join(','),
        technology: `${lang} Domain Service`,
      },
    };
  }

  getContainerInfo(
    node: SystemNode,
    _systemName: string,
    _fileExt: string,
    normalizedPath: string
  ): ContainerInfo | null {
    // Prefer package declaration: e.g. com.acme.orders.controller → "orders.controller"
    const namespacesStr = node.properties?.namespaces as string | undefined;
    const namespaces = namespacesStr ? namespacesStr.split(',').filter(Boolean) : [];

    if (namespaces.length > 0) {
      const pkg = namespaces[0];
      const parts = pkg.split('.');
      // Skip standard reverse-domain prefix (com, org, io, net, …) + org name (2 segments)
      const meaningful = parts.slice(2);
      if (meaningful.length > 0) {
        const segment = meaningful[0];
        const containerId = slugify(segment);
        const isApi =
          segment.toLowerCase().includes('controller') ||
          segment.toLowerCase().includes('rest') ||
          segment.toLowerCase().includes('api') ||
          segment.toLowerCase().includes('web');
        return {
          entityRef: containerId,
          name: segment,
          type: isApi ? 'rest-api' : 'background-worker',
          description: isApi
            ? `REST controllers for ${segment}`
            : `Java/Kotlin package: ${segment}`,
          technology: 'Java / JVM',
        };
      }
    }

    // Path fallback: src/main/java/com/acme/<package>/<File>.java → take last meaningful folder
    const parts = normalizedPath.split('/');
    const javaIdx = parts.lastIndexOf('java');
    const dirParts = javaIdx !== -1 ? parts.slice(javaIdx + 1, -1) : parts.slice(0, -1);
    // Skip reverse-domain prefix (2 segments: com/acme)
    const meaningful = dirParts.slice(2);
    const segment = meaningful[0] ?? dirParts[dirParts.length - 1];

    if (!segment) return null;

    const containerId = slugify(segment);
    const isApi =
      segment.toLowerCase().includes('controller') ||
      segment.toLowerCase().includes('rest') ||
      segment.toLowerCase().includes('api');
    return {
      entityRef: containerId,
      name: segment,
      type: isApi ? 'rest-api' : 'background-worker',
      description: isApi ? `REST controllers for ${segment}` : `Java/Kotlin package: ${segment}`,
      technology: 'Java / JVM',
    };
  }
}
