import { describe, it, expect, beforeEach } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { blueprintYamlLanguageServerDirective } from '@blueprint/core';
import { ContextLevelWriter } from './contextLevelWriter.ts';
import { ContainerLevelWriter } from './containerLevelWriter.ts';
import { ComponentLevelWriter } from './componentLevelWriter.ts';
import { resolveLocalSchemaUrl } from './baseWriter.ts';
import type { SystemNode, SystemDependency } from '@blueprint/core';
import { MockLayout, MockFileSystem, MockLogger } from '../test/fakes.ts';

function expectSchemaDirective(yamlContent: string, schemaUrl?: string): void {
  const firstLine = yamlContent.split('\n')[0];
  expect(firstLine).toBe(blueprintYamlLanguageServerDirective(schemaUrl));
}

describe('resolveLocalSchemaUrl', () => {
  it('resolves a path-relative schema from this repo blueprints tree', () => {
    const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../..');
    const yamlPath = path.join(repoRoot, 'blueprints/cli/containers.yaml');
    expect(resolveLocalSchemaUrl(yamlPath)).toBe('../../schemas/v2/blueprint.schema.json');
  });
});

describe('BaseWriter YAML schema directive', () => {
  let layout: MockLayout;
  let fileSystem: MockFileSystem;
  let logger: MockLogger;

  beforeEach(() => {
    layout = new MockLayout();
    fileSystem = new MockFileSystem();
    logger = new MockLogger();
  });

  it('prepends the yaml-language-server schema line on context.yaml', async () => {
    const writer = new ContextLevelWriter(layout, fileSystem, logger);
    await writer.write('/workspace/blueprints', 'my-context', 'my-system');

    const yamlContent = fileSystem.writtenFiles.get('/workspace/blueprints/context.yaml')!;
    expectSchemaDirective(yamlContent);
    expect(yamlContent).toContain('entityRef: my-context');
  });

  it('prepends the yaml-language-server schema line on containers.yaml', async () => {
    const writer = new ContainerLevelWriter(layout, fileSystem, logger);
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
    expectSchemaDirective(yamlContent);
    expect(yamlContent).toContain('level: container');
  });

  it('prepends the yaml-language-server schema line on component YAML files', async () => {
    const writer = new ComponentLevelWriter(layout, fileSystem, logger);
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
      expectSchemaDirective(yamlContent);
    }
  });
});
