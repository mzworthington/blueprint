import type { AnalysisFileSystemPort } from './ports.ts';

const SKIP_DIR_NAMES = new Set([
  'node_modules',
  '.pulumi',
  '.git',
  'dist',
  'build',
  'coverage',
  '.next',
  '.turbo',
]);

export type DiscoveredPulumiRoot = {
  /** Absolute directory path of the Pulumi project. */
  rootPath: string;
  /** Slug used as system id under blueprints/. */
  systemId: string;
  /** Pulumi runtime from Pulumi.yaml (e.g. yaml, nodejs, python). */
  runtime: string;
  /** Absolute paths of source files in this project (non-recursive). */
  filePaths: string[];
};

function slugFromPath(rootPath: string, scanRoot: string): string {
  const normalizedRoot = rootPath.replace(/\\/g, '/').replace(/\/$/, '');
  const scanBase = scanRoot.replace(/\\/g, '/').replace(/\/$/, '');
  if (normalizedRoot === scanBase) return 'pulumi';

  const base = normalizedRoot.split('/').filter(Boolean).pop() || 'pulumi';
  return (
    base
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'pulumi'
  );
}

function isUnder(parent: string, child: string): boolean {
  const p = parent.replace(/\\/g, '/').replace(/\/$/, '');
  const c = child.replace(/\\/g, '/').replace(/\/$/, '');
  return c === p || c.startsWith(`${p}/`);
}

function isStackConfigFile(name: string): boolean {
  return /^Pulumi\.[^.]+\.ya?ml$/i.test(name);
}

function readProjectRuntime(pulumiYamlPath: string, fileSystem: AnalysisFileSystemPort): string {
  const content = fileSystem.readText(pulumiYamlPath);
  if (content === null) return 'yaml';
  const match = /^\s*runtime:\s*(\S+)/m.exec(content);
  return match?.[1] ?? 'yaml';
}

function isSourceFile(name: string, runtime: string): boolean {
  if (isStackConfigFile(name)) return false;
  if (name === 'Pulumi.yaml' || name === 'Pulumi.yml') return true;

  switch (runtime) {
    case 'yaml':
      return /\.ya?ml$/i.test(name) && !isStackConfigFile(name);
    case 'nodejs':
      return /\.tsx?$/i.test(name) && !/\.d\.ts$/i.test(name);
    case 'python':
      return name.endsWith('.py');
    case 'go':
      return name.endsWith('.go');
    case 'dotnet':
      return name.endsWith('.cs');
    default:
      return /\.ya?ml$/i.test(name) || /\.tsx?$/i.test(name);
  }
}

/**
 * Walk `scanRoot` and find Pulumi projects: directories that contain `Pulumi.yaml`.
 * Nested dirs under an already-discovered root are skipped as separate systems.
 */
export function discoverPulumiRoots(
  scanRoot: string,
  fileSystem: AnalysisFileSystemPort
): DiscoveredPulumiRoot[] {
  const absScan = fileSystem.getAbsolutePath(scanRoot);
  if (!fileSystem.exists(absScan)) return [];

  const dirsWithPulumi: string[] = [];

  const walk = (dir: string): void => {
    const names = fileSystem.listDirectoryNames(dir);
    if (names.some(n => n === 'Pulumi.yaml' || n === 'Pulumi.yml')) {
      dirsWithPulumi.push(dir);
    }

    for (const name of names) {
      if (SKIP_DIR_NAMES.has(name) || name.startsWith('.')) continue;
      if (name === 'Pulumi.yaml' || name === 'Pulumi.yml') continue;
      walk(fileSystem.getAbsolutePath(dir, name));
    }
  };

  walk(absScan);

  const sorted = [...dirsWithPulumi].sort((a, b) => a.length - b.length);
  const roots: string[] = [];
  for (const dir of sorted) {
    if (roots.some(r => isUnder(r, dir))) continue;
    roots.push(dir);
  }

  return roots.map(rootPath => {
    const pulumiYaml = fileSystem.getAbsolutePath(rootPath, 'Pulumi.yaml');
    const pulumiYml = fileSystem.getAbsolutePath(rootPath, 'Pulumi.yml');
    const projectFile = fileSystem.exists(pulumiYaml)
      ? pulumiYaml
      : fileSystem.exists(pulumiYml)
        ? pulumiYml
        : pulumiYaml;
    const runtime = readProjectRuntime(projectFile, fileSystem);
    const filePaths = fileSystem
      .listDirectoryNames(rootPath)
      .filter(name => isSourceFile(name, runtime))
      .map(name => fileSystem.getAbsolutePath(rootPath, name));

    return {
      rootPath,
      systemId: slugFromPath(rootPath, absScan),
      runtime,
      filePaths,
    };
  });
}
