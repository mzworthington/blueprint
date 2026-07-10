import type { WorkspaceManifest } from './schema';

export function resolveRelativePath(basePath: string, relativePath: string): string {
  if (relativePath.startsWith('/') || relativePath.includes('://')) {
    return relativePath;
  }
  const parts = basePath.split('/');
  parts.pop();
  const relParts = relativePath.split('/');
  for (const part of relParts) {
    if (part === '.') continue;
    if (part === '..') {
      parts.pop();
    } else {
      parts.push(part);
    }
  }
  return parts.join('/');
}

export function getClosestManifest(
  filePath: string,
  manifests: Array<{ path: string; manifest: WorkspaceManifest; yaml: string }>
) {
  if (manifests.length === 0) return null;
  const fileDir = filePath.split('/').slice(0, -1).join('/');
  let bestMatch: (typeof manifests)[0] | null = null;
  let maxCommonSegments = -1;

  for (const m of manifests) {
    const mDir = m.path.split('/').slice(0, -1).join('/');
    if (fileDir.startsWith(mDir) || mDir === '') {
      const segments = mDir ? mDir.split('/').length : 0;
      if (segments > maxCommonSegments) {
        maxCommonSegments = segments;
        bestMatch = m;
      }
    }
  }
  return bestMatch;
}

export const resolveWorkspaceManifestState = (
  path: string,
  loadedManifests: Array<{ path: string; manifest: WorkspaceManifest; yaml: string }>
) => {
  const activeManifest = getClosestManifest(path, loadedManifests);
  return {
    workspaceManifest: activeManifest ? activeManifest.manifest : null,
    workspaceManifestYaml: activeManifest ? activeManifest.yaml : null,
    workspaceManifestPath: activeManifest ? activeManifest.path : null,
  };
};

export const getFileName = (filePath: string) => {
  const parts = filePath.split('/');
  return parts[parts.length - 1];
};
