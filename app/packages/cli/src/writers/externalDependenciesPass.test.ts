import { describe, it, expect, beforeEach } from 'vitest';
import { parseSchemaFromYaml, serializeSchemaToYaml, type SystemSchema } from '@blueprint/core';
import { MockFileSystem, MockLogger } from '../test/fakes.ts';
import { applyExternalDependenciesPass } from './externalDependenciesPass.ts';

const containers: SystemSchema = {
  entityRef: 'blueprint/cli',
  name: 'Cli Containers',
  version: '1.0.0',
  level: 'container',
  nodes: [
    { entityRef: 'blueprint/cli/vhs', type: 'container', name: 'Vhs Service', x: 10, y: 10 },
    {
      entityRef: 'blueprint/cli/writers',
      type: 'container',
      name: 'Writers Service',
      x: 20,
      y: 20,
    },
    {
      entityRef: 'blueprint/cli/analysis',
      type: 'container',
      name: 'Analysis Service',
      x: 30,
      y: 30,
    },
  ],
  dependencies: [
    { from: 'blueprint/cli/vhs', to: 'blueprint/cli/analysis', type: 'inter-container' },
    { from: 'blueprint/cli/writers', to: 'blueprint/cli/vhs', type: 'inter-container' },
  ],
};

const vhsComponents: SystemSchema = {
  entityRef: 'blueprint/cli/vhs',
  name: 'Vhs Components',
  version: '1.0.0',
  level: 'component',
  nodes: [
    {
      entityRef: 'blueprint/cli/vhs/cli-demo-test',
      type: 'background-worker',
      name: 'cli-demo.test Service',
      x: 40,
      y: 40,
    },
  ],
  dependencies: [],
};

const writersComponents: SystemSchema = {
  entityRef: 'blueprint/cli/writers',
  name: 'Writers Components',
  version: '1.0.0',
  level: 'component',
  nodes: [
    {
      entityRef: 'blueprint/cli/writers/context-level-writer',
      type: 'background-worker',
      name: 'Context Level Writer',
      x: 50,
      y: 50,
    },
  ],
  dependencies: [
    {
      from: 'blueprint/cli/writers/context-level-writer',
      to: 'blueprint/cli/vhs/cli-demo-test',
      type: 'direct-call',
    },
  ],
};

describe('applyExternalDependenciesPass', () => {
  let fileSystem: MockFileSystem;
  let logger: MockLogger;
  const rootDir = '/workspace/blueprints';

  beforeEach(() => {
    fileSystem = new MockFileSystem();
    logger = new MockLogger();

    const cliDir = `${rootDir}/cli`;
    fileSystem.directories.set(rootDir, ['cli']);
    fileSystem.directories.set(cliDir, [
      'containers.yaml',
      'vhs-components.yaml',
      'writers-components.yaml',
    ]);

    const files: Array<[string, SystemSchema]> = [
      [`${cliDir}/containers.yaml`, containers],
      [`${cliDir}/vhs-components.yaml`, vhsComponents],
      [`${cliDir}/writers-components.yaml`, writersComponents],
    ];
    for (const [path, schema] of files) {
      fileSystem.writtenFiles.set(path, serializeSchemaToYaml(schema));
      fileSystem.existingFiles.add(path);
    }
  });

  it('rewrites component schemas with unresolved external proxy nodes only', async () => {
    const result = await applyExternalDependenciesPass(rootDir, fileSystem, logger);

    expect(result.schemasUpdated).toBeGreaterThan(0);

    const vhs = parseSchemaFromYaml(
      await fileSystem.readSchema(`${rootDir}/cli/vhs-components.yaml`)
    );
    // No dangling deps on vhs → no externals (neighbor containers are not auto-added)
    expect(vhs.nodes.filter(n => n.external)).toHaveLength(0);

    const writers = parseSchemaFromYaml(
      await fileSystem.readSchema(`${rootDir}/cli/writers-components.yaml`)
    );
    expect(
      writers.nodes.find(n => n.entityRef === 'blueprint/cli/vhs/cli-demo-test')
    ).toMatchObject({
      external: true,
    });
    // Suggested neighbor containers are not included in CLI unresolved mode
    expect(writers.nodes.some(n => n.entityRef === 'blueprint/cli/analysis' && n.external)).toBe(
      false
    );
  });

  it('does not add component noise onto context.yaml', async () => {
    const contextPath = `${rootDir}/context.yaml`;
    fileSystem.directories.set(rootDir, ['cli', 'context.yaml']);
    fileSystem.writtenFiles.set(
      contextPath,
      serializeSchemaToYaml({
        entityRef: 'blueprint',
        name: 'Blueprint Context',
        version: '1.0.0',
        level: 'context',
        nodes: [{ entityRef: 'blueprint/cli', type: 'software-system', name: 'Cli System' }],
        dependencies: [
          {
            from: 'blueprint/cli',
            to: 'blueprint/cli/vhs/cli-demo-test',
            type: 'direct-call',
          },
        ],
      })
    );
    fileSystem.existingFiles.add(contextPath);

    await applyExternalDependenciesPass(rootDir, fileSystem, logger);

    const context = parseSchemaFromYaml(await fileSystem.readSchema(contextPath));
    expect(context.nodes.filter(n => n.external)).toHaveLength(0);
    expect(context.nodes.map(n => n.entityRef)).not.toContain('blueprint/cli/vhs/cli-demo-test');
  });

  it('is a no-op when the blueprints tree is empty', async () => {
    const emptyFs = new MockFileSystem();
    emptyFs.directories.set(rootDir, []);
    const result = await applyExternalDependenciesPass(rootDir, emptyFs, logger);
    expect(result.schemasUpdated).toBe(0);
    expect(result.schemasScanned).toBe(0);
  });
});
