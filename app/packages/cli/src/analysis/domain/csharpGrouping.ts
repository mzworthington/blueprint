import type { NodeType } from '@blueprint/core';
import { slugify } from '@blueprint/core';
import { isTestProjectSegment } from './testPath.ts';

const LAYOUT_ROOTS = new Set(['src', 'lib', 'source', 'sources']);

/** Boilerplate C# sources that add noise without architectural signal. */
export function shouldSkipCSharpFile(relativePath: string, baseName: string): boolean {
  const normalized = relativePath.replace(/\\/g, '/');
  if (baseName === 'GlobalUsings') return true;
  if (/\/Migrations\//i.test(normalized)) return true;
  if (/\.Designer$/i.test(baseName)) return true;
  if (/ModelSnapshot$/i.test(baseName)) return true;
  return false;
}

export function isCSharpSourcePath(relativePath: string): boolean {
  return relativePath.replace(/\\/g, '/').toLowerCase().endsWith('.cs');
}

/**
 * Roll up a C# file into a layer component under its project container.
 * e.g. src/Ordering.API/Application/Commands/Foo.cs → Application Layer
 */
export function resolveCSharpComponent(
  relativePath: string,
  baseName: string
): { componentId: string; componentName: string } | null {
  if (shouldSkipCSharpFile(relativePath, baseName)) return null;

  const parts = relativePath.replace(/\\/g, '/').split('/').filter(Boolean);
  const dirParts = parts.slice(0, -1);
  if (dirParts.length === 0) {
    return { componentId: slugify(baseName), componentName: baseName };
  }

  const projectIdx = findProjectRootIndex(dirParts);
  const afterProject = dirParts.slice(projectIdx + 1);

  if (afterProject.length === 0) {
    return { componentId: slugify(baseName), componentName: baseName };
  }

  const layer = afterProject[0];
  return {
    componentId: slugify(layer),
    componentName: `${layer} Layer`,
  };
}

function findProjectRootIndex(dirParts: string[]): number {
  const srcIdx = dirParts.findIndex(p => LAYOUT_ROOTS.has(p.toLowerCase()));
  if (srcIdx >= 0 && srcIdx + 1 < dirParts.length) {
    return srcIdx + 1;
  }

  const testIdx = dirParts.findIndex(p => isTestProjectSegment(p));
  if (testIdx >= 0) {
    return testIdx;
  }

  return 0;
}

/** Prefer more specific architectural roles when merging rolled-up C# layers. */
export function nodeTypePriority(type: NodeType): number {
  switch (type) {
    case 'rest-api':
    case 'gateway-api':
    case 'web-app':
      return 50;
    case 'event-broker':
      return 40;
    case 'relational-database':
    case 'cache-store':
      return 30;
    default:
      return 10;
  }
}

/** Infer container node type from .NET project naming conventions. */
export function classifyCSharpContainer(displayName: string, containerId: string): NodeType {
  const normalizedName = displayName.replace(/\./g, '');
  const lowerId = containerId.toLowerCase();

  if (/\.api$/i.test(displayName) || (lowerId.endsWith('-api') && !lowerId.includes('test'))) {
    return 'rest-api';
  }
  if (/webapp|clientapp|hybridapp/i.test(normalizedName)) {
    return 'web-app';
  }
  if (/processor$/i.test(normalizedName) || lowerId.includes('processor')) {
    return 'background-worker';
  }
  if (/eventbus/i.test(normalizedName)) {
    return 'event-broker';
  }
  return 'container';
}
