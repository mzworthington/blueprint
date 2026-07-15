import { slugify } from '@blueprint/core';

/** Path segments that are layout roots, not product containers. */
const LAYOUT_ROOTS = new Set(['src', 'lib', 'source', 'sources']);

/**
 * Resolve a logical container from a file path.
 * Prefers workspace package directories (`…/packages/<name>/…`), then the
 * folder under `src`/`lib`, then the file's parent directory.
 * Does not exclude test folders — those stay visible and are flagged via isTest.
 */
export function resolveContainerFromPath(relativePath: string): {
  containerId: string;
  displayName: string;
} {
  const parts = relativePath.replace(/\\/g, '/').split('/').filter(Boolean);
  if (parts.length === 0) {
    return { containerId: 'core', displayName: 'core' };
  }

  const packagesIdx = parts.findIndex(p => p === 'packages');
  if (packagesIdx >= 0 && parts[packagesIdx + 1] && packagesIdx + 1 < parts.length - 1) {
    const name = parts[packagesIdx + 1];
    return { containerId: slugify(name), displayName: name };
  }

  const layoutIdx = parts.findIndex(p => LAYOUT_ROOTS.has(p));
  if (layoutIdx >= 0 && parts[layoutIdx + 1] && layoutIdx + 1 < parts.length - 1) {
    const name = parts[layoutIdx + 1];
    return { containerId: slugify(name), displayName: name };
  }

  if (parts.length >= 2) {
    const name = parts[parts.length - 2];
    return { containerId: slugify(name), displayName: name };
  }

  return { containerId: 'core', displayName: 'core' };
}

export function componentMapKey(containerId: string, componentId: string): string {
  return `${containerId}/${componentId}`;
}
