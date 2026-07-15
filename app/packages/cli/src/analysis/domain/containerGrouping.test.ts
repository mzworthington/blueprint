import { describe, it, expect } from 'vitest';
import { resolveContainerFromPath, componentMapKey } from './containerGrouping.ts';
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

  it('keeps test folders as normal containers (tagged separately via isTest)', () => {
    expect(resolveContainerFromPath('app/packages/cli/src/__tests__/helper.ts')).toEqual({
      containerId: 'cli',
      displayName: 'cli',
    });
    expect(resolveContainerFromPath('src/test/utils.ts')).toEqual({
      containerId: 'test',
      displayName: 'test',
    });
  });
});

describe('ModelExtractor', () => {
  it('assigns package containers and marks test files with isTest', () => {
    const extractor = new ModelExtractor('ctx/sys');
    const { componentNodesMap, containerNodesMap } = extractor.extractGraph([
      {
        relativePath: 'app/packages/cli/src/blueprint.ts',
        baseName: 'blueprint',
        isTestFile: false,
        imports: [],
      },
      {
        relativePath: 'app/packages/cli/src/analysis/domain/modelExtractor.test.ts',
        baseName: 'modelExtractor.test',
        isTestFile: true,
        imports: [],
      },
      {
        relativePath: 'app/packages/designer/src/App.tsx',
        baseName: 'App',
        isTestFile: false,
        imports: [],
      },
    ]);

    expect(containerNodesMap.has('cli')).toBe(true);
    expect(containerNodesMap.has('designer')).toBe(true);
    expect(containerNodesMap.has('app')).toBe(false);

    expect(componentNodesMap.get(componentMapKey('cli', 'blueprint'))?.isTest).toBe(false);
    expect(componentNodesMap.get(componentMapKey('cli', 'modelextractor-test'))?.isTest).toBe(true);
    expect(componentNodesMap.get(componentMapKey('designer', 'app'))?.properties?.containerId).toBe(
      'designer'
    );
  });
});
