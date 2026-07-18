import { describe, it, expect, beforeEach } from 'vitest';
import { parseSchemaFromYaml, serializeSchemaToYaml, type SystemSchema } from '@blueprint/core';
import type { LayoutPort } from '../analysis/domain/ports.ts';
import type { SystemNode, SystemDependency } from '@blueprint/core';
import { MockFileSystem, MockLogger } from '../test/fakes.ts';
import { applyLayoutPass } from './layoutPass.ts';

class SpyLayout implements LayoutPort {
  calls: Array<{ nodes: SystemNode[]; dependencies: SystemDependency[] }> = [];

  async computeLayout(
    nodes: SystemNode[],
    dependencies: SystemDependency[]
  ): Promise<SystemNode[]> {
    this.calls.push({ nodes: [...nodes], dependencies: [...dependencies] });
    return nodes.map((n, idx) => ({
      ...n,
      x: (idx + 1) * 100,
      y: (idx + 1) * 200,
    }));
  }
}

function schemaWith(
  nodes: SystemSchema['nodes'],
  dependencies: SystemSchema['dependencies'] = []
): SystemSchema {
  return {
    entityRef: 'blueprint/cli/writers',
    name: 'Writers Components',
    version: '1.0.0',
    level: 'component',
    nodes,
    dependencies,
  };
}

describe('applyLayoutPass', () => {
  let fileSystem: MockFileSystem;
  let logger: MockLogger;
  let layout: SpyLayout;
  const rootDir = '/workspace/blueprints';
  const path = `${rootDir}/cli/writers-components.yaml`;

  beforeEach(() => {
    fileSystem = new MockFileSystem();
    logger = new MockLogger();
    layout = new SpyLayout();

    const cliDir = `${rootDir}/cli`;
    fileSystem.directories.set(rootDir, ['cli']);
    fileSystem.directories.set(cliDir, ['writers-components.yaml']);
  });

  it('layouts nodes that are missing positions', async () => {
    const writersComponents = schemaWith(
      [
        {
          entityRef: 'blueprint/cli/writers/context-level-writer',
          type: 'background-worker',
          name: 'Context Level Writer',
        },
        {
          entityRef: 'blueprint/cli/vhs/cli-demo-test',
          type: 'background-worker',
          name: 'cli-demo.test Service (External)',
          external: true,
        },
      ],
      [
        {
          from: 'blueprint/cli/writers/context-level-writer',
          to: 'blueprint/cli/vhs/cli-demo-test',
          type: 'direct-call',
        },
      ]
    );
    fileSystem.writtenFiles.set(path, serializeSchemaToYaml(writersComponents));
    fileSystem.existingFiles.add(path);

    const result = await applyLayoutPass(rootDir, layout, fileSystem, logger);

    expect(result.schemasScanned).toBe(1);
    expect(result.schemasUpdated).toBe(1);
    expect(layout.calls).toHaveLength(1);
    expect(layout.calls[0]!.nodes.map(n => n.entityRef)).toEqual([
      'blueprint/cli/writers/context-level-writer',
      'blueprint/cli/vhs/cli-demo-test',
    ]);

    const rewritten = parseSchemaFromYaml(await fileSystem.readSchema(path));
    expect(
      rewritten.nodes.find(n => n.entityRef === 'blueprint/cli/writers/context-level-writer')
    ).toMatchObject({ x: 100, y: 200 });
    expect(
      rewritten.nodes.find(n => n.entityRef === 'blueprint/cli/vhs/cli-demo-test')
    ).toMatchObject({ x: 200, y: 400, external: true });
  });

  it('preserves existing positions when forceRelayout is false', async () => {
    const writersComponents = schemaWith(
      [
        {
          entityRef: 'blueprint/cli/writers/context-level-writer',
          type: 'background-worker',
          name: 'Context Level Writer',
          x: 50,
          y: 60,
        },
        {
          entityRef: 'blueprint/cli/vhs/cli-demo-test',
          type: 'background-worker',
          name: 'cli-demo.test Service (External)',
          external: true,
        },
      ],
      [
        {
          from: 'blueprint/cli/writers/context-level-writer',
          to: 'blueprint/cli/vhs/cli-demo-test',
          type: 'direct-call',
        },
      ]
    );
    fileSystem.writtenFiles.set(path, serializeSchemaToYaml(writersComponents));
    fileSystem.existingFiles.add(path);

    const result = await applyLayoutPass(rootDir, layout, fileSystem, logger, {
      forceRelayout: false,
    });

    expect(result.schemasUpdated).toBe(1);
    expect(layout.calls).toHaveLength(1);
    expect(layout.calls[0]!.nodes.map(n => n.entityRef)).toEqual([
      'blueprint/cli/vhs/cli-demo-test',
    ]);

    const rewritten = parseSchemaFromYaml(await fileSystem.readSchema(path));
    expect(
      rewritten.nodes.find(n => n.entityRef === 'blueprint/cli/writers/context-level-writer')
    ).toMatchObject({ x: 50, y: 60 });
    expect(
      rewritten.nodes.find(n => n.entityRef === 'blueprint/cli/vhs/cli-demo-test')?.x
    ).toBeGreaterThan(50);
  });

  it('forceRelayout defaults to true and recomputes all positions', async () => {
    const writersComponents = schemaWith([
      {
        entityRef: 'blueprint/cli/writers/context-level-writer',
        type: 'background-worker',
        name: 'Context Level Writer',
        x: 50,
        y: 60,
      },
    ]);
    fileSystem.writtenFiles.set(path, serializeSchemaToYaml(writersComponents));
    fileSystem.existingFiles.add(path);

    const result = await applyLayoutPass(rootDir, layout, fileSystem, logger);

    expect(result.schemasUpdated).toBe(1);
    expect(layout.calls[0]!.nodes).toHaveLength(1);
    const rewritten = parseSchemaFromYaml(await fileSystem.readSchema(path));
    expect(
      rewritten.nodes.find(n => n.entityRef === 'blueprint/cli/writers/context-level-writer')
    ).toMatchObject({ x: 100, y: 200 });
  });

  it('is a no-op when the blueprints tree is empty', async () => {
    const emptyFs = new MockFileSystem();
    emptyFs.directories.set(rootDir, []);
    const result = await applyLayoutPass(rootDir, layout, emptyFs, logger);
    expect(result.schemasUpdated).toBe(0);
    expect(result.schemasScanned).toBe(0);
    expect(layout.calls).toHaveLength(0);
  });

  it('uses contextLayout for context-level schemas and dagre layout for others', async () => {
    const contextLayout = new SpyLayout();
    const contextPath = `${rootDir}/context.yaml`;
    const componentPath = path;

    fileSystem.directories.set(rootDir, ['cli', 'context.yaml']);
    fileSystem.writtenFiles.set(
      contextPath,
      serializeSchemaToYaml({
        entityRef: 'blueprint',
        name: 'Blueprint Context',
        version: '1.0.0',
        level: 'context',
        nodes: [
          { entityRef: 'blueprint/user', type: 'person', name: 'User' },
          { entityRef: 'blueprint/app', type: 'software-system', name: 'App' },
        ],
        dependencies: [{ from: 'blueprint/user', to: 'blueprint/app', type: 'direct-call' }],
      })
    );
    fileSystem.existingFiles.add(contextPath);

    fileSystem.writtenFiles.set(
      componentPath,
      serializeSchemaToYaml(
        schemaWith([{ entityRef: 'blueprint/cli/writers/a', type: 'component', name: 'A' }])
      )
    );
    fileSystem.existingFiles.add(componentPath);

    await applyLayoutPass(rootDir, layout, fileSystem, logger, { contextLayout });

    expect(contextLayout.calls).toHaveLength(1);
    expect(contextLayout.calls[0]!.nodes.map(n => n.entityRef)).toEqual([
      'blueprint/user',
      'blueprint/app',
    ]);
    expect(layout.calls).toHaveLength(1);
    expect(layout.calls[0]!.nodes.map(n => n.entityRef)).toEqual(['blueprint/cli/writers/a']);
  });
});
