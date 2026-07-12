import type { ParsedSourceFile } from './types.ts';
import type { SystemNode } from '../../core/generated/blueprint/v1/schema.ts';

export interface ContainerInfo {
  id: string;
  name: string;
  type:
    | 'gateway-api'
    | 'background-worker'
    | 'relational-database'
    | 'event-broker'
    | 'rest-api'
    | 'cache-store'
    | 'software-system';
  description: string;
  technology: string;
}

export interface LanguageAnalyzer {
  supports(fileExt: string): boolean;

  createNode(sourceFile: ParsedSourceFile, cleanFileId: string, isTestFile: boolean): SystemNode;

  getContainerInfo(
    node: SystemNode,
    systemName: string,
    fileExt: string,
    normalizedPath: string
  ): ContainerInfo | null;
}
