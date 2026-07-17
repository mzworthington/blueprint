import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentLevelWriter } from './componentLevelWriter.ts';
import type { SystemNode, SystemDependency } from '@blueprint/core';
import { MockFileSystem, MockLogger } from '../test/fakes.ts';

describe('ComponentLevelWriter', () => {
  let fileSystem: MockFileSystem;
  let logger: MockLogger;
  let writer: ComponentLevelWriter;

  beforeEach(() => {
    fileSystem = new MockFileSystem();
    logger = new MockLogger();
    writer = new ComponentLevelWriter(fileSystem, logger);
  });

  it('should write component schemas for each container', async () => {
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
      [
        'component-b',
        {
          entityRef: 'my-context/my-system/domain-logic/component-b',
          name: 'Component B',
          type: 'component',
          properties: { containerId: 'domain-logic' },
        },
      ],
    ]);
    const componentDependencies: SystemDependency[] = [
      {
        from: 'my-context/my-system/frontend-ui/component-a',
        to: 'my-context/my-system/domain-logic/component-b',
        type: 'direct-call',
      },
    ];
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

    await writer.write(
      '/workspace/blueprints/my-context/my-system',
      'my-context',
      'my-system',
      componentNodesMap,
      componentDependencies,
      containerNodesMap
    );

    const writtenPaths = Array.from(fileSystem.writtenFiles.keys());
    expect(writtenPaths).toContain(
      '/workspace/blueprints/my-context/my-system/frontend-ui-components.yaml'
    );
    expect(writtenPaths).toContain(
      '/workspace/blueprints/my-context/my-system/domain-logic-components.yaml'
    );
  });

  it('should use correct entityRef format for component schemas', async () => {
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
    const componentDependencies: SystemDependency[] = [];
    const containerNodesMap = new Map<string, SystemNode>([
      [
        'frontend-ui',
        { entityRef: 'my-context/my-system/frontend-ui', name: 'Frontend UI', type: 'web-app' },
      ],
    ]);

    await writer.write(
      '/workspace/blueprints/my-context/my-system',
      'my-context',
      'my-system',
      componentNodesMap,
      componentDependencies,
      containerNodesMap
    );

    const yamlContent = fileSystem.writtenFiles.get(
      '/workspace/blueprints/my-context/my-system/frontend-ui-components.yaml'
    )!;
    expect(yamlContent).toContain('entityRef: my-context/my-system/frontend-ui');
    expect(yamlContent).toContain('name: Frontend UI Components');
    expect(yamlContent).toContain('level: component');
  });

  it('should slugify context and container names in entityRef', async () => {
    const componentNodesMap = new Map<string, SystemNode>([
      [
        'component-a',
        {
          entityRef: 'my-context/my-system/frontend-ui/component-a',
          name: 'Component A',
          type: 'component',
          properties: { containerId: 'Frontend UI' },
        },
      ],
    ]);
    const componentDependencies: SystemDependency[] = [];
    const containerNodesMap = new Map<string, SystemNode>([
      [
        'Frontend UI',
        { entityRef: 'my-context/my-system/frontend-ui', name: 'Frontend UI', type: 'web-app' },
      ],
    ]);

    await writer.write(
      '/workspace/blueprints/my-context/my-system',
      'My Context',
      'my-system',
      componentNodesMap,
      componentDependencies,
      containerNodesMap
    );

    const yamlContent = fileSystem.writtenFiles.get(
      '/workspace/blueprints/my-context/my-system/frontend-ui-components.yaml'
    )!;
    expect(yamlContent).toContain('entityRef: my-context/my-system/frontend-ui');
  });

  it('should filter components by containerId', async () => {
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
      [
        'component-b',
        {
          entityRef: 'my-context/my-system/domain-logic/component-b',
          name: 'Component B',
          type: 'component',
          properties: { containerId: 'domain-logic' },
        },
      ],
    ]);
    const componentDependencies: SystemDependency[] = [];
    const containerNodesMap = new Map<string, SystemNode>([
      [
        'frontend-ui',
        { entityRef: 'my-context/my-system/frontend-ui', name: 'Frontend UI', type: 'web-app' },
      ],
    ]);

    await writer.write(
      '/workspace/blueprints/my-context/my-system',
      'my-context',
      'my-system',
      componentNodesMap,
      componentDependencies,
      containerNodesMap
    );

    const writtenPaths = Array.from(fileSystem.writtenFiles.keys());
    expect(writtenPaths).toContain(
      '/workspace/blueprints/my-context/my-system/frontend-ui-components.yaml'
    );
    expect(writtenPaths).not.toContain(
      '/workspace/blueprints/my-context/my-system/domain-logic-components.yaml'
    );

    const yamlContent = fileSystem.writtenFiles.get(
      '/workspace/blueprints/my-context/my-system/frontend-ui-components.yaml'
    )!;
    expect(yamlContent).toContain('name: Component A');
    expect(yamlContent).not.toContain('name: Component B');
  });

  it('should filter dependencies by containerId', async () => {
    const componentNodesMap = new Map<string, SystemNode>([
      [
        'my-context/my-system/frontend-ui/component-a',
        {
          entityRef: 'my-context/my-system/frontend-ui/component-a',
          name: 'Component A',
          type: 'component',
          properties: { containerId: 'frontend-ui' },
        },
      ],
      [
        'my-context/my-system/frontend-ui/component-b',
        {
          entityRef: 'my-context/my-system/frontend-ui/component-b',
          name: 'Component B',
          type: 'component',
          properties: { containerId: 'frontend-ui' },
        },
      ],
      [
        'my-context/my-system/domain-logic/component-c',
        {
          entityRef: 'my-context/my-system/domain-logic/component-c',
          name: 'Component C',
          type: 'component',
          properties: { containerId: 'domain-logic' },
        },
      ],
    ]);
    const componentDependencies: SystemDependency[] = [
      {
        from: 'my-context/my-system/frontend-ui/component-a',
        to: 'my-context/my-system/frontend-ui/component-b',
        type: 'direct-call',
      },
      {
        from: 'my-context/my-system/frontend-ui/component-a',
        to: 'my-context/my-system/domain-logic/component-c',
        type: 'direct-call',
      },
    ];
    const containerNodesMap = new Map<string, SystemNode>([
      [
        'frontend-ui',
        { entityRef: 'my-context/my-system/frontend-ui', name: 'Frontend UI', type: 'web-app' },
      ],
    ]);

    await writer.write(
      '/workspace/blueprints/my-context/my-system',
      'my-context',
      'my-system',
      componentNodesMap,
      componentDependencies,
      containerNodesMap
    );

    const yamlContent = fileSystem.writtenFiles.get(
      '/workspace/blueprints/my-context/my-system/frontend-ui-components.yaml'
    )!;
    expect(yamlContent).toContain('from: my-context/my-system/frontend-ui/component-a');
    expect(yamlContent).toContain('to: my-context/my-system/frontend-ui/component-b');
    expect(yamlContent).toContain('to: my-context/my-system/domain-logic/component-c');
  });

  it('writes component nodes without layout positions', async () => {
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
    const componentDependencies: SystemDependency[] = [];
    const containerNodesMap = new Map<string, SystemNode>([
      [
        'frontend-ui',
        { entityRef: 'my-context/my-system/frontend-ui', name: 'Frontend UI', type: 'web-app' },
      ],
    ]);

    await writer.write(
      '/workspace/blueprints/my-context/my-system',
      'my-context',
      'my-system',
      componentNodesMap,
      componentDependencies,
      containerNodesMap
    );

    const yamlContent = fileSystem.writtenFiles.get(
      '/workspace/blueprints/my-context/my-system/frontend-ui-components.yaml'
    )!;
    expect(yamlContent).not.toMatch(/\bx:\s*\d+/);
    expect(yamlContent).not.toMatch(/\by:\s*\d+/);
  });

  it('should log successful write for each container', async () => {
    const componentNodesMap = new Map<string, SystemNode>();
    const componentDependencies: SystemDependency[] = [];
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

    await writer.write(
      '/workspace/blueprints/my-context/my-system',
      'my-context',
      'my-system',
      componentNodesMap,
      componentDependencies,
      containerNodesMap
    );

    const writeLogs = logger.logs.filter(log => log.includes('Saved Component schema'));
    expect(writeLogs).toHaveLength(2);
  });
});
