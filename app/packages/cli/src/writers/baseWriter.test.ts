import { describe, it, expect, beforeEach } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { systemSchemaPublicUrl } from '@blueprint/core';
import { ContextLevelWriter } from './contextLevelWriter.ts';
import { ContainerLevelWriter } from './containerLevelWriter.ts';
import { ComponentLevelWriter } from './componentLevelWriter.ts';
import { resolveLocalSchemaUrl } from './baseWriter.ts';
import type { SystemNode, SystemDependency } from '@blueprint/core';
import { MockFileSystem, MockLogger } from '../test/fakes.ts';

function expectV3YamlHeader(yamlContent: string): void {
  expect(yamlContent.split('\n')[0]).toBe(`version: ${systemSchemaPublicUrl()}`);
  expect(yamlContent).toContain('metaData:');
}

describe('resolveLocalSchemaUrl', () => {
  it('resolves a path-relative schema from this repo blueprints tree', () => {
    const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../..');
    const yamlPath = path.join(repoRoot, 'blueprints/cli/containers.yaml');
    expect(resolveLocalSchemaUrl(yamlPath)).toBe('../../schemas/v3/blueprint.schema.json');
  });
});

describe('BaseWriter YAML v3 format', () => {
  let fileSystem: MockFileSystem;
  let logger: MockLogger;

  beforeEach(() => {
    fileSystem = new MockFileSystem();
    logger = new MockLogger();
  });

  it('writes v3 object YAML on context.yaml', async () => {
    const writer = new ContextLevelWriter(fileSystem, logger);
    await writer.write('/workspace/blueprints', 'my-context', 'my-system');

    const yamlContent = fileSystem.writtenFiles.get('/workspace/blueprints/context.yaml')!;
    expectV3YamlHeader(yamlContent);
    expect(yamlContent).toContain('entityRef: my-context');
  });

  it('writes metaData.source when git provenance is provided', async () => {
    const writer = new ContainerLevelWriter(fileSystem, logger);
    const containerNodesMap = new Map<string, SystemNode>([
      [
        'frontend-ui',
        { entityRef: 'my-context/my-system/frontend-ui', name: 'Frontend UI', type: 'web-app' },
      ],
    ]);

    await writer.write('/workspace/blueprints', 'my-context', 'my-system', containerNodesMap, [], {
      remoteUrl: 'https://github.com/org/repo',
      scannedAtCommit: 'abc123',
      scanRoot: '.',
    });

    const yamlContent = fileSystem.writtenFiles.get('/workspace/blueprints/containers.yaml')!;
    expect(yamlContent).toContain('source:');
    expect(yamlContent).toContain('remoteUrl: https://github.com/org/repo');
    expect(yamlContent).toContain('scannedAtCommit: abc123');
  });

  it('writes v3 object YAML on containers.yaml', async () => {
    const writer = new ContainerLevelWriter(fileSystem, logger);
    const containerNodesMap = new Map<string, SystemNode>([
      [
        'frontend-ui',
        { entityRef: 'my-context/my-system/frontend-ui', name: 'Frontend UI', type: 'web-app' },
      ],
    ]);
    const dependencies: SystemDependency[] = [];

    await writer.write(
      '/workspace/blueprints',
      'my-context',
      'my-system',
      containerNodesMap,
      dependencies
    );

    const yamlContent = fileSystem.writtenFiles.get('/workspace/blueprints/containers.yaml')!;
    expectV3YamlHeader(yamlContent);
    expect(yamlContent).toContain('level: container');
  });

  it('writes v3 object YAML on component YAML files', async () => {
    const writer = new ComponentLevelWriter(fileSystem, logger);
    const containerNodesMap = new Map<string, SystemNode>([
      [
        'frontend-ui',
        { entityRef: 'my-context/my-system/frontend-ui', name: 'Frontend UI', type: 'web-app' },
      ],
    ]);
    const componentNodesMap = new Map<string, SystemNode>([
      [
        'component-a',
        {
          entityRef: 'my-context/my-system/frontend-ui/component-a',
          name: 'Component A',
          type: 'component',
          properties: { containerId: 'frontend-ui' },
        },
      ],
    ]);
    const dependencies: SystemDependency[] = [];

    await writer.write(
      '/workspace/blueprints',
      'my-context',
      'my-system',
      componentNodesMap,
      dependencies,
      containerNodesMap
    );

    const written = [...fileSystem.writtenFiles.entries()].filter(([p]) =>
      p.endsWith('-components.yaml')
    );
    expect(written.length).toBeGreaterThan(0);
    for (const [, yamlContent] of written) {
      expectV3YamlHeader(yamlContent);
    }
  });
});
