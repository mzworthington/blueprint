import { describe, it, expect } from 'vitest';
import {
  resolveContainerFromPath,
  rollupModuleContainerName,
  componentMapKey,
} from './containerGrouping.ts';
import { ModelExtractor } from './modelExtractor.ts';

describe('containerGrouping', () => {
  it('groups by packages/<name> instead of the first path segment', () => {
    expect(resolveContainerFromPath('app/packages/cli/src/blueprint.ts')).toEqual({
      containerId: 'cli',
      displayName: 'cli',
    });
    expect(resolveContainerFromPath('app/packages/designer/src/App.tsx')).toEqual({
      containerId: 'designer',
      displayName: 'designer',
    });
  });

  it('falls back to the folder under src/lib', () => {
    expect(resolveContainerFromPath('src/domain/graph.ts')).toEqual({
      containerId: 'domain',
      displayName: 'domain',
    });
  });

  it('refuses layout-leftover names as container identity', () => {
    expect(resolveContainerFromPath('src/foo.ts')).toEqual({
      containerId: 'core',
      displayName: 'core',
    });
    expect(resolveContainerFromPath('src/types/graph.ts')).toEqual({
      containerId: 'core',
      displayName: 'core',
    });
    expect(resolveContainerFromPath('src/utils/helpers/tool.ts')).toEqual({
      containerId: 'core',
      displayName: 'core',
    });
    expect(resolveContainerFromPath('src/types/domain/graph.ts')).toEqual({
      containerId: 'domain',
      displayName: 'domain',
    });
  });

  it('skips packages/<name> without package.json when isPackageRoot is provided', () => {
    const isPackageRoot = (dir: string) => dir === 'packages/catalog-backend';
    expect(resolveContainerFromPath('packages/loose-folder/src/x.ts', { isPackageRoot })).toEqual({
      containerId: 'core',
      displayName: 'core',
    });
    expect(
      resolveContainerFromPath('packages/catalog-backend/src/x.ts', { isPackageRoot })
    ).toEqual({
      containerId: 'catalog-backend',
      displayName: 'catalog-backend',
    });
  });

  it('optionally rolls up *-module-* container names', () => {
    expect(rollupModuleContainerName('auth-backend-module-okta-provider')).toBe('auth-backend');
    expect(rollupModuleContainerName('catalog-backend')).toBe('catalog-backend');

    expect(
      resolveContainerFromPath('packages/auth-backend-module-okta-provider/src/module.ts', {
        rollupModules: true,
      })
    ).toEqual({
      containerId: 'auth-backend',
      displayName: 'auth-backend',
    });
  });

  it('groups by plugins/<name> the same way as packages/<name>', () => {
    expect(
      resolveContainerFromPath('plugins/catalog/src/plugin.ts', {
        workspacePackageRoots: ['packages', 'plugins'],
      })
    ).toEqual({
      containerId: 'catalog',
      displayName: 'catalog',
    });
  });
});

describe('ModelExtractor', () => {
  it('assigns package containers, marks tests, and hydrates node types from markers', () => {
    const extractor = new ModelExtractor('ctx/sys');
    const { componentNodesMap, containerNodesMap, componentDependencies } = extractor.extractGraph([
      {
        filePath: 'app/packages/cli/src/blueprint.ts',
        relativePath: 'app/packages/cli/src/blueprint.ts',
        baseName: 'blueprint',
        isTestFile: false,
        imports: [],
        newExpressions: [],
        callExpressions: [],
      },
      {
        filePath: 'app/packages/cli/src/analysis/domain/modelExtractor.test.ts',
        relativePath: 'app/packages/cli/src/analysis/domain/modelExtractor.test.ts',
        baseName: 'modelExtractor.test',
        isTestFile: true,
        imports: [],
        newExpressions: [],
        callExpressions: [],
      },
      {
        filePath: 'app/packages/designer/src/App.tsx',
        relativePath: 'app/packages/designer/src/App.tsx',
        baseName: 'App',
        isTestFile: false,
        imports: [{ moduleSpecifier: 'react' }],
        newExpressions: [],
        callExpressions: [],
      },
      {
        filePath: 'app/packages/designer/src/db/db.ts',
        relativePath: 'app/packages/designer/src/db/db.ts',
        baseName: 'db',
        isTestFile: false,
        imports: [{ moduleSpecifier: 'dexie' }, { moduleSpecifier: './App' }],
        newExpressions: [],
        callExpressions: [],
      },
    ]);

    expect(containerNodesMap.has('cli')).toBe(true);
    expect(containerNodesMap.has('designer')).toBe(true);
    expect(containerNodesMap.has('app')).toBe(false);

    expect(componentNodesMap.get(componentMapKey('cli', 'blueprint'))?.isTest).toBe(false);
    expect(componentNodesMap.get(componentMapKey('cli', 'blueprint'))?.type).toBe(
      'background-worker'
    );
    expect(componentNodesMap.get(componentMapKey('cli', 'modelextractor-test'))?.isTest).toBe(true);
    expect(componentNodesMap.get(componentMapKey('designer', 'app'))?.type).toBe('gateway-api');
    expect(componentNodesMap.get(componentMapKey('designer', 'app'))?.properties?.containerId).toBe(
      'designer'
    );

    expect(
      componentDependencies.some(
        d => d.to.includes('/designer/app') && d.from.includes('/designer/db')
      )
    ).toBe(true);
  });
});
