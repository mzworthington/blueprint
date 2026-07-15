import { describe, it, expect } from 'vitest';
import {
  discoverSystems,
  partitionFilesBySystem,
  parseNpmWorkspaces,
  parsePnpmWorkspacePackages,
  workspaceRootsFromGlobs,
  withProductHub,
} from './systemDiscovery.ts';
import type { SystemDiscoveryFs } from './systemDiscovery.ts';

function memoryFs(opts: {
  texts?: Record<string, string>;
  dirs?: Record<string, string[]>;
}): SystemDiscoveryFs {
  const texts = new Map(Object.entries(opts.texts || {}));
  const dirs = new Map(Object.entries(opts.dirs || {}));
  return {
    exists: p => texts.has(p) || dirs.has(p),
    readText: p => texts.get(p) ?? null,
    listDirectoryNames: p => dirs.get(p) ?? [],
    getAbsolutePath: (...parts) => parts.join('/').replace(/\/+/g, '/'),
  };
}

describe('systemDiscovery', () => {
  it('extracts workspace roots from globs', () => {
    expect(workspaceRootsFromGlobs(['packages/*', 'plugins/*', './apps/*'])).toEqual([
      'packages',
      'plugins',
      'apps',
    ]);
  });

  it('parses npm and pnpm workspace declarations', () => {
    expect(parseNpmWorkspaces(JSON.stringify({ workspaces: ['packages/*', 'plugins/*'] }))).toEqual(
      ['packages/*', 'plugins/*']
    );
    expect(
      parseNpmWorkspaces(JSON.stringify({ workspaces: { packages: ['packages/*'] } }))
    ).toEqual(['packages/*']);
    expect(
      parsePnpmWorkspacePackages(['packages:', "  - 'packages/*'", "  - 'plugins/*'"].join('\n'))
    ).toEqual(['packages/*', 'plugins/*']);
  });

  it('discovers a product hub plus workspace/standalone spokes', () => {
    const fs = memoryFs({
      texts: {
        '/repo/package.json': JSON.stringify({
          name: 'backstage',
          workspaces: ['packages/*', 'plugins/*'],
        }),
        '/repo/microsite/package.json': JSON.stringify({ name: 'microsite' }),
        '/repo/docs-ui/package.json': JSON.stringify({ name: 'docs-ui' }),
      },
      dirs: {
        '/repo': ['packages', 'plugins', 'microsite', 'docs-ui', 'docs', 'node_modules', 'scripts'],
      },
    });

    const systems = discoverSystems('/repo', fs, { fallbackId: 'backstage' });
    expect(systems.map(s => s.id).sort()).toEqual([
      'backstage',
      'docs-ui',
      'microsite',
      'packages',
      'plugins',
    ]);
    expect(systems.find(s => s.id === 'backstage')?.kind).toBe('product');
    expect(systems.every(s => s.productId === 'backstage')).toBe(true);
    expect(systems.find(s => s.id === 'docs')).toBeUndefined();
  });

  it('withProductHub does not link different products together', () => {
    const backstage = withProductHub(
      [
        {
          id: 'packages',
          displayName: 'Packages',
          rootPath: 'packages',
          kind: 'workspace',
          productId: 'packages',
        },
      ],
      'backstage'
    );
    const blueprint = withProductHub(
      [
        {
          id: 'cli',
          displayName: 'Cli',
          rootPath: 'packages/cli',
          kind: 'workspace',
          productId: 'cli',
        },
      ],
      'blueprint'
    );
    expect(backstage[0].productId).toBe('backstage');
    expect(blueprint[0].productId).toBe('blueprint');
    expect(backstage[0].productId).not.toBe(blueprint[0].productId);
  });

  it('respects explicit systems config override and still adds a product hub', () => {
    const fs = memoryFs({ texts: {}, dirs: { '/repo': [] } });
    const systems = discoverSystems('/repo', fs, {
      systems: ['packages', 'microsite'],
      fallbackId: 'backstage',
    });
    expect(systems.map(s => s.id).sort()).toEqual(['backstage', 'microsite', 'packages']);
    expect(systems.find(s => s.id === 'backstage')?.kind).toBe('product');
  });

  it('falls back to a single system when no workspaces or standalone packages exist', () => {
    const fs = memoryFs({
      texts: { '/repo/package.json': JSON.stringify({ name: 'simple-app' }) },
      dirs: { '/repo': ['src'] },
    });
    const systems = discoverSystems('/repo', fs, { fallbackId: 'simple-app' });
    expect(systems).toEqual([
      {
        id: 'simple-app',
        displayName: 'Simple App',
        rootPath: '',
        kind: 'fallback',
        productId: 'simple-app',
      },
    ]);
  });

  it('partitions files by longest matching system root', () => {
    const systems = [
      {
        id: 'backstage',
        displayName: 'Backstage',
        rootPath: '',
        kind: 'product' as const,
        productId: 'backstage',
      },
      {
        id: 'packages',
        displayName: 'Packages',
        rootPath: 'packages',
        kind: 'workspace' as const,
        productId: 'backstage',
      },
      {
        id: 'microsite',
        displayName: 'Microsite',
        rootPath: 'microsite',
        kind: 'standalone' as const,
        productId: 'backstage',
      },
    ];
    const buckets = partitionFilesBySystem(
      [
        { relativePath: 'packages/catalog/src/index.ts' },
        { relativePath: 'microsite/src/pages/index.tsx' },
        { relativePath: 'README.md' },
      ],
      systems
    );
    expect(buckets.get('packages')).toHaveLength(1);
    expect(buckets.get('microsite')).toHaveLength(1);
    expect(buckets.get('backstage')?.map(f => f.relativePath)).toEqual(['README.md']);
  });
});
