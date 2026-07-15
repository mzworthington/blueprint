import type { ParsedSourceFile } from '../types.ts';
import type { SystemNode } from '@blueprint/core';
import type { LanguageAnalyzer, ContainerInfo } from './languageAnalyzer.ts';

export class TypeScriptAnalyzer implements LanguageAnalyzer {
  supports(fileExt: string): boolean {
    return ['ts', 'tsx', 'js', 'jsx'].includes(fileExt);
  }

  createNode(sourceFile: ParsedSourceFile, cleanFileId: string, isTestFile: boolean): SystemNode {
    const fileExt = sourceFile.relativePath.split('.').pop()?.toLowerCase();
    const langPrefix = ['js', 'jsx'].includes(fileExt || '') ? 'JavaScript' : 'TypeScript';

    return {
      entityRef: cleanFileId,
      type: 'background-worker',
      name: `${sourceFile.baseName} Service`,
      isTest: isTestFile,
      properties: {
        filepath: sourceFile.relativePath,
        namespaces: (sourceFile.namespaces || []).join(','),
        technology: `${langPrefix} Domain Service`,
      },
    };
  }

  getContainerInfo(
    node: SystemNode,
    systemName: string,
    fileExt: string,
    normalizedPath: string
  ): ContainerInfo | null {
    const langPrefix = ['js', 'jsx'].includes(fileExt) ? 'JavaScript' : 'TypeScript';

    // Core layer
    if (normalizedPath.startsWith('packages/core/') || normalizedPath.startsWith('src/domain/')) {
      return {
        entityRef: 'domain-logic',
        name: 'Domain Logic Layer',
        type: 'background-worker',
        description: 'Core domain logic, schema validation rules, and graph parsing.',
        technology: langPrefix,
      };
    }

    // Infrastructure / Application layers
    if (
      normalizedPath.startsWith('packages/app/src/infrastructure/') ||
      normalizedPath.startsWith('packages/app/src/application/') ||
      normalizedPath.startsWith('packages/app/src/store/') ||
      normalizedPath.startsWith('packages/app/src/adapters/') ||
      normalizedPath.startsWith('src/infrastructure/') ||
      normalizedPath.startsWith('src/application/') ||
      normalizedPath.startsWith('src/adapters/') ||
      normalizedPath.startsWith('src/store/')
    ) {
      const isStateOrSync =
        normalizedPath.includes('store') ||
        normalizedPath.includes('fileSync') ||
        normalizedPath.includes('telemetry') ||
        normalizedPath.includes('fileSystem') ||
        normalizedPath.includes('logging');
      if (isStateOrSync) {
        return {
          entityRef: 'state-sync',
          name: 'State & Sync Manager',
          type: 'cache-store',
          description: 'Zustand global store and local directory synchronization.',
          technology: 'Zustand / Filesystem API',
        };
      } else {
        return {
          entityRef: 'frontend-ui',
          name: 'Frontend React UI',
          type: 'gateway-api',
          description: 'React Flow canvas, sidebar configuration panel, and navigation UI.',
          technology: 'React + TailwindCSS',
        };
      }
    }

    // UI Layer
    if (
      normalizedPath.startsWith('packages/app/src/ui/') ||
      normalizedPath.startsWith('packages/app/src/components/') ||
      normalizedPath.startsWith('packages/app/src/pages/') ||
      normalizedPath.startsWith('src/ui/') ||
      normalizedPath.startsWith('src/components/') ||
      normalizedPath.startsWith('src/pages/')
    ) {
      return {
        entityRef: 'frontend-ui',
        name: 'Frontend React UI',
        type: 'gateway-api',
        description: 'React Flow canvas, sidebar configuration panel, and navigation UI.',
        technology: 'React + TailwindCSS',
      };
    }

    return null;
  }
}
