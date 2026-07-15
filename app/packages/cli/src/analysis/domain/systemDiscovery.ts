import { slugify } from '@blueprint/core';

export type DiscoveredSystem = {
  /** Slug used in entityRefs and output folders. */
  id: string;
  /** Human label for context diagram. */
  displayName: string;
  /**
   * Repo-relative directory that owns this system (`packages`, `plugins`, `microsite`).
   * Empty string = product hub or whole-repo fallback.
   */
  rootPath: string;
  kind: 'workspace' | 'standalone' | 'config' | 'fallback' | 'product';
  /**
   * Product group id — systems sharing this value fan into the product hub.
   * Different products (e.g. blueprint vs backstage) never share edges.
   */
  productId: string;
};

export type SystemDiscoveryFs = {
  exists(path: string): boolean;
  readText(path: string): string | null;
  listDirectoryNames(path: string): string[];
  getAbsolutePath(...parts: string[]): string;
};

/** Root dirs never promoted to standalone systems. */
const STANDALONE_DENYLIST = new Set([
  'node_modules',
  '.git',
  '.github',
  '.husky',
  '.vscode',
  '.idea',
  'dist',
  'build',
  'out',
  'coverage',
  'docs',
  'documentation',
  'scripts',
  'e2e',
  'cypress',
  'playwright',
  'blueprints',
  'tmp',
  'temp',
]);

function titleCase(name: string): string {
  if (!name) return 'App';
  return name
    .split(/[-_]/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

/**
 * Extract unique first path segments from workspace globs.
 * `packages/*` → `packages`, `apps/web/*` → `apps` (first segment only for multi-system split).
 */
export function workspaceRootsFromGlobs(globs: string[]): string[] {
  const roots = new Set<string>();
  for (const raw of globs) {
    const cleaned = raw.replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/$/, '');
    const first = cleaned.split('/').filter(Boolean)[0];
    if (!first || first.includes('*')) continue;
    roots.add(first);
  }
  return [...roots];
}

export function parseNpmWorkspaces(packageJsonText: string): string[] {
  try {
    const pkg = JSON.parse(packageJsonText) as {
      workspaces?: string[] | { packages?: string[] };
    };
    if (Array.isArray(pkg.workspaces)) return pkg.workspaces;
    if (pkg.workspaces && Array.isArray(pkg.workspaces.packages)) {
      return pkg.workspaces.packages;
    }
  } catch {
    // ignore
  }
  return [];
}

export function parsePnpmWorkspacePackages(yamlText: string): string[] {
  const packages: string[] = [];
  let inPackages = false;
  for (const line of yamlText.split(/\r?\n/)) {
    if (/^packages:\s*$/.test(line)) {
      inPackages = true;
      continue;
    }
    if (inPackages) {
      if (/^\S/.test(line) && !line.trim().startsWith('#')) {
        inPackages = false;
        continue;
      }
      const match = line.match(/^\s*-\s*['"]?([^'"#]+)['"]?\s*$/);
      if (match) packages.push(match[1].trim());
    }
  }
  return packages;
}

function readWorkspaceGlobs(cwd: string, fs: SystemDiscoveryFs): string[] {
  const pkgPath = fs.getAbsolutePath(cwd, 'package.json');
  if (fs.exists(pkgPath)) {
    const text = fs.readText(pkgPath);
    if (text) {
      const fromNpm = parseNpmWorkspaces(text);
      if (fromNpm.length > 0) return fromNpm;
    }
  }

  const pnpmPath = fs.getAbsolutePath(cwd, 'pnpm-workspace.yaml');
  if (fs.exists(pnpmPath)) {
    const text = fs.readText(pnpmPath);
    if (text) return parsePnpmWorkspacePackages(text);
  }

  return [];
}

function readPackageName(cwd: string, fs: SystemDiscoveryFs): string | undefined {
  const pkgPath = fs.getAbsolutePath(cwd, 'package.json');
  if (!fs.exists(pkgPath)) return undefined;
  const text = fs.readText(pkgPath);
  if (!text) return undefined;
  try {
    const name = JSON.parse(text).name as string | undefined;
    if (!name || name === 'root') return undefined;
    return name.includes('/') ? name.split('/').pop() : name;
  } catch {
    return undefined;
  }
}

/**
 * Attach a product hub when multiple subsystems are found so the context diagram
 * can fan spokes into one product node (e.g. Backstage ← packages/plugins/microsite).
 */
export function withProductHub(
  systems: DiscoveredSystem[],
  productName: string
): DiscoveredSystem[] {
  if (systems.length === 0) return systems;

  const productId = slugify(productName);
  if (systems.length === 1 && (systems[0].kind === 'fallback' || systems[0].id === productId)) {
    return [
      {
        ...systems[0],
        id: productId,
        displayName: titleCase(productName),
        productId,
        kind: systems[0].kind === 'fallback' ? 'fallback' : 'product',
      },
    ];
  }

  const children = systems.filter(s => s.id !== productId);
  const hub: DiscoveredSystem = {
    id: productId,
    displayName: titleCase(productName),
    rootPath: '',
    kind: 'product',
    productId,
  };

  return [
    hub,
    ...children.map(s => ({
      ...s,
      productId,
    })),
  ];
}

/**
 * Discover navigable software systems for a complex monorepo.
 *
 * 1. Config override (`systems`) when provided — still wrapped with a product hub
 * 2. Workspace roots + standalone packages + product hub
 * 3. Fallback single product system when nothing is detected
 */
export function discoverSystems(
  cwd: string,
  fs: SystemDiscoveryFs,
  options: {
    systems?: string[];
    fallbackId?: string;
  } = {}
): DiscoveredSystem[] {
  const productName =
    options.fallbackId ||
    readPackageName(cwd, fs) ||
    cwd.split(/[\\/]/).filter(Boolean).pop() ||
    'app';

  if (options.systems && options.systems.length > 0) {
    const configured = options.systems.map(name => {
      const id = slugify(name);
      return {
        id,
        displayName: titleCase(name),
        rootPath: name.replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/$/, ''),
        kind: 'config' as const,
        productId: id,
      };
    });
    return withProductHub(configured, productName);
  }

  const workspaceGlobs = readWorkspaceGlobs(cwd, fs);
  const roots = workspaceRootsFromGlobs(workspaceGlobs);
  const systems: DiscoveredSystem[] = roots.map(root => ({
    id: slugify(root),
    displayName: titleCase(root),
    rootPath: root,
    kind: 'workspace' as const,
    productId: slugify(root),
  }));

  const rootNames = new Set(roots.map(r => r.toLowerCase()));
  for (const entry of fs.listDirectoryNames(cwd)) {
    if (STANDALONE_DENYLIST.has(entry.toLowerCase())) continue;
    if (rootNames.has(entry.toLowerCase())) continue;
    if (entry.startsWith('.')) continue;

    const absDir = fs.getAbsolutePath(cwd, entry);
    const pkgJson = fs.getAbsolutePath(absDir, 'package.json');
    if (!fs.exists(pkgJson)) continue;

    systems.push({
      id: slugify(entry),
      displayName: titleCase(entry),
      rootPath: entry,
      kind: 'standalone',
      productId: slugify(entry),
    });
  }

  if (systems.length === 0) {
    const fallbackId = slugify(productName);
    return [
      {
        id: fallbackId,
        displayName: titleCase(productName),
        rootPath: '',
        kind: 'fallback',
        productId: fallbackId,
      },
    ];
  }

  return withProductHub(systems, productName);
}

/** Assign each source file to the best matching system (longest rootPath prefix wins). */
export function partitionFilesBySystem<T extends { relativePath: string }>(
  files: T[],
  systems: DiscoveredSystem[]
): Map<string, T[]> {
  const sorted = [...systems].sort((a, b) => b.rootPath.length - a.rootPath.length);
  const buckets = new Map<string, T[]>();
  for (const system of systems) {
    buckets.set(system.id, []);
  }

  // Prefer product hub as unmatched sink; otherwise any empty-root system.
  const fallback =
    systems.find(s => s.kind === 'product') || systems.find(s => s.rootPath === '') || systems[0];

  for (const file of files) {
    const rel = file.relativePath.replace(/\\/g, '/');
    let matched = fallback;
    for (const system of sorted) {
      if (!system.rootPath) continue;
      if (rel === system.rootPath || rel.startsWith(`${system.rootPath}/`)) {
        matched = system;
        break;
      }
    }
    buckets.get(matched.id)!.push(file);
  }

  return buckets;
}
