import type { AnalysisFileSystemPort } from './ports.ts';

const SKIP_DIR_NAMES = new Set([
  'node_modules',
  '.terraform',
  '.git',
  'dist',
  'build',
  'coverage',
  '.next',
  '.turbo',
]);

export type DiscoveredTerraformRoot = {
  /** Absolute directory path of the Terraform root module. */
  rootPath: string;
  /** Slug used as system id under blueprints/. */
  systemId: string;
  /** Absolute paths of `.tf` / `.tf.json` files in this root (non-recursive). */
  filePaths: string[];
};

function isTerraformFile(name: string): boolean {
  return name.endsWith('.tf') || name.endsWith('.tf.json');
}

function slugFromPath(rootPath: string, scanRoot: string): string {
  const normalizedRoot = rootPath.replace(/\\/g, '/').replace(/\/$/, '');
  const scanBase = scanRoot.replace(/\\/g, '/').replace(/\/$/, '');
  if (normalizedRoot === scanBase) return 'infrastructure';

  const base = normalizedRoot.split('/').filter(Boolean).pop() || 'infrastructure';
  return (
    base
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'infrastructure'
  );
}

function isUnder(parent: string, child: string): boolean {
  const p = parent.replace(/\\/g, '/').replace(/\/$/, '');
  const c = child.replace(/\\/g, '/').replace(/\/$/, '');
  return c === p || c.startsWith(`${p}/`);
}

/**
 * Walk `scanRoot` and find Terraform root modules: directories that contain
 * immediate `.tf` / `.tf.json` files. Nested dirs under an already-discovered
 * root are treated as module directories and skipped as separate systems.
 */
export function discoverTerraformRoots(
  scanRoot: string,
  fileSystem: AnalysisFileSystemPort
): DiscoveredTerraformRoot[] {
  const absScan = fileSystem.getAbsolutePath(scanRoot);
  if (!fileSystem.exists(absScan)) return [];

  const dirsWithTf: string[] = [];

  const walk = (dir: string): void => {
    const names = fileSystem.listDirectoryNames(dir);
    if (names.some(isTerraformFile)) {
      dirsWithTf.push(dir);
    }

    for (const name of names) {
      if (SKIP_DIR_NAMES.has(name) || name.startsWith('.')) continue;
      if (isTerraformFile(name)) continue;
      walk(fileSystem.getAbsolutePath(dir, name));
    }
  };

  walk(absScan);

  const sorted = [...dirsWithTf].sort((a, b) => a.length - b.length);
  const roots: string[] = [];
  for (const dir of sorted) {
    if (roots.some(r => isUnder(r, dir))) continue;
    roots.push(dir);
  }

  return roots.map(rootPath => {
    const filePaths = fileSystem
      .listDirectoryNames(rootPath)
      .filter(isTerraformFile)
      .map(name => fileSystem.getAbsolutePath(rootPath, name));
    return {
      rootPath,
      systemId: slugFromPath(rootPath, absScan),
      filePaths,
    };
  });
}
