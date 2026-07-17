import { describe, it, expect, beforeEach } from 'vitest';
import { ContainerLevelWriter } from './containerLevelWriter.ts';
import type { SystemNode, SystemDependency } from '@blueprint/core';
import { MockFileSystem, MockLogger } from '../test/fakes.ts';

describe('ContainerLevelWriter', () => {
  let fileSystem: MockFileSystem;
  let logger: MockLogger;
  let writer: ContainerLevelWriter;

  beforeEach(() => {
    fileSystem = new MockFileSystem();
    logger = new MockLogger();
    writer = new ContainerLevelWriter(fileSystem, logger);
  });

  it('should write container schema with correct entityRef', async () => {
    const containerNodesMap = new Map<string, SystemNode>([
      [
        'frontend-ui',
        { entityRef: 'my-context/my-system/frontend-ui', name: 'Frontend UI', type: 'web-app' },
      ],
      [
        'domain-logic',
        {
          entityRef: 'my-context/my-system/domain-logic',
          name: 'Domain Logic',
          type: 'microservice',
        },
      ],
    ]);
    const containerDependencies: SystemDependency[] = [
      {
        from: 'my-context/my-system/frontend-ui',
        to: 'my-context/my-system/domain-logic',
        type: 'direct-call',
      },
    ];

    await writer.write(
      '/workspace/blueprints',
      'my-context',
      'my-system',
      containerNodesMap,
      containerDependencies
    );

    const writtenPaths = Array.from(fileSystem.writtenFiles.keys());
    expect(writtenPaths).toContain('/workspace/blueprints/containers.yaml');

    const yamlContent = fileSystem.writtenFiles.get('/workspace/blueprints/containers.yaml')!;
    expect(yamlContent).toContain('entityRef: my-context/my-system');
    expect(yamlContent).toContain('name: My-system Containers');
    expect(yamlContent).toContain('level: container');
    expect(yamlContent).toContain('entityRef: my-context/my-system/frontend-ui');
    expect(yamlContent).toContain('entityRef: my-context/my-system/domain-logic');
  });

  it('should slugify context name in entityRef', async () => {
    const containerNodesMap = new Map<string, SystemNode>([
      [
        'service-a',
        { entityRef: 'my-context/my-system/service-a', name: 'Service A', type: 'microservice' },
      ],
    ]);
    const containerDependencies: SystemDependency[] = [];

    await writer.write(
      '/workspace/blueprints',
      'My Context Name',
      'my-system',
      containerNodesMap,
      containerDependencies
    );

    const yamlContent = fileSystem.writtenFiles.get('/workspace/blueprints/containers.yaml')!;
    expect(yamlContent).toContain('entityRef: my-context-name/my-system');
    expect(yamlContent).toContain('name: My-system Containers');
  });

  it('writes container nodes without layout positions', async () => {
    const containerNodesMap = new Map<string, SystemNode>([
      [
        'service-a',
        { entityRef: 'my-context/my-system/service-a', name: 'Service A', type: 'microservice' },
      ],
      [
        'service-b',
        { entityRef: 'my-context/my-system/service-b', name: 'Service B', type: 'microservice' },
      ],
    ]);
    const containerDependencies: SystemDependency[] = [];

    await writer.write(
      '/workspace/blueprints',
      'my-context',
      'my-system',
      containerNodesMap,
      containerDependencies
    );

    const yamlContent = fileSystem.writtenFiles.get('/workspace/blueprints/containers.yaml')!;
    expect(yamlContent).not.toMatch(/\bx:\s*\d+/);
    expect(yamlContent).not.toMatch(/\by:\s*\d+/);
  });

  it('should log successful write', async () => {
    const containerNodesMap = new Map<string, SystemNode>();
    const containerDependencies: SystemDependency[] = [];

    await writer.write(
      '/workspace/blueprints',
      'test-context',
      'test-system',
      containerNodesMap,
      containerDependencies
    );

    expect(logger.logs.some(log => log.includes('Saved Container schema'))).toBe(true);
  });
});
