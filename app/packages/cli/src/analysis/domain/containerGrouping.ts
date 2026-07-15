import { slugify } from '@blueprint/core';
import { LAYOUT_IDENTITY_DENYLIST } from './analysisOptions.ts';
import { isTestProjectSegment } from './testPath.ts';

/** Path segments that mark a layout root; the *next* segment may be a container. */
const LAYOUT_ROOTS = new Set(['src', 'lib', 'source', 'sources']);

/** Default monorepo package folder names when no explicit workspace roots are provided. */
const DEFAULT_WORKSPACE_PACKAGE_ROOTS = ['packages', 'plugins', 'apps', 'libs', 'services'];

export type ResolveContainerOptions = {
  /**
   * When set, `packages/<name>` (or other workspace roots) is only accepted if this
   * returns true (typically: `<root>/<name>/package.json` exists).
   */
  isPackageRoot?: (packageDirRelative: string) => boolean;
  /** Collapse `foo-module-bar` → `foo` (prefix before `-module-`). */
  rollupModules?: boolean;
  /**
   * Workspace package parent dirs (`packages`, `plugins`, …).
   * Defaults to common monorepo folder names.
   */
  workspacePackageRoots?: string[];
};

/**
 * Collapse plugin-module style names: `auth-backend-module-okta-provider` → `auth-backend`.
 * Only applies when `-module-` appears; leaves other names unchanged.
 */
export function rollupModuleContainerName(name: string): string {
  const idx = name.toLowerCase().indexOf('-module-');
  if (idx <= 0) return name;
  return name.slice(0, idx);
}

function finalizeName(
  name: string,
  rollupModules: boolean
): { containerId: string; displayName: string } {
  const displayName = rollupModules ? rollupModuleContainerName(name) : name;
  return { containerId: slugify(displayName), displayName };
}

function isDeniedIdentity(name: string): boolean {
  return LAYOUT_IDENTITY_DENYLIST.has(name.toLowerCase());
}

/**
 * Resolve a logical container from a file path.
 *
 * Prefer declared workspace packages (`…/packages|plugins/<name>/…` with package.json when
 * `isPackageRoot` is provided), then dedicated test projects (`*.UnitTests`), then a
 * non-leftover folder under `src`/`lib`, then the file's parent directory — never promoting
 * layout leftovers (`src`, `types`, …) as the container identity.
 */
export function resolveContainerFromPath(
  relativePath: string,
  options: ResolveContainerOptions = {}
): {
  containerId: string;
  displayName: string;
} {
  const rollupModules = !!options.rollupModules;
  const workspaceRoots = new Set(
    (options.workspacePackageRoots?.length
      ? options.workspacePackageRoots
      : DEFAULT_WORKSPACE_PACKAGE_ROOTS
    ).map(r => r.toLowerCase())
  );
  const parts = relativePath.replace(/\\/g, '/').split('/').filter(Boolean);
  if (parts.length === 0) {
    return { containerId: 'core', displayName: 'core' };
  }

  const rejectedNames = new Set<string>();

  const workspaceIdx = parts.findIndex(p => workspaceRoots.has(p.toLowerCase()));
  if (workspaceIdx >= 0 && parts[workspaceIdx + 1] && workspaceIdx + 1 < parts.length - 1) {
    const name = parts[workspaceIdx + 1];
    if (!isDeniedIdentity(name)) {
      const packageDir = parts.slice(0, workspaceIdx + 2).join('/');
      const accepted = options.isPackageRoot ? options.isPackageRoot(packageDir) : true;
      if (accepted) {
        return finalizeName(name, rollupModules);
      }
      rejectedNames.add(name.toLowerCase());
    }
  }

  // Prefer Ordering.UnitTests over nested Domain/Application folders inside that project.
  const testProject = parts.find(
    (p, i) => i < parts.length - 1 && !rejectedNames.has(p.toLowerCase()) && isTestProjectSegment(p)
  );
  if (testProject) {
    return finalizeName(testProject, rollupModules);
  }

  const layoutIdx = parts.findIndex(p => LAYOUT_ROOTS.has(p));
  if (layoutIdx >= 0 && layoutIdx + 1 < parts.length - 1) {
    for (let i = layoutIdx + 1; i < parts.length - 1; i++) {
      const name = parts[i];
      if (isDeniedIdentity(name) || rejectedNames.has(name.toLowerCase())) continue;
      return finalizeName(name, rollupModules);
    }
  }

  for (let i = parts.length - 2; i >= 0; i--) {
    const name = parts[i];
    if (LAYOUT_ROOTS.has(name) || workspaceRoots.has(name.toLowerCase())) continue;
    if (isDeniedIdentity(name) || rejectedNames.has(name.toLowerCase())) continue;
    return finalizeName(name, rollupModules);
  }

  return { containerId: 'core', displayName: 'core' };
}

export function componentMapKey(containerId: string, componentId: string): string {
  return `${containerId}/${componentId}`;
}
