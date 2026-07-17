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
      x: 0,
      y: 0,
    },
    {
      entityRef: 'blueprint/cli/vhs/cli-demo-test',
      type: 'background-worker',
      name: 'cli-demo.test Service (External)',
      external: true,
      x: 999,
      y: 999,
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

describe('applyLayoutPass', () => {
  let fileSystem: MockFileSystem;
  let logger: MockLogger;
  let layout: SpyLayout;
  const rootDir = '/workspace/blueprints';

  beforeEach(() => {
    fileSystem = new MockFileSystem();
    logger = new MockLogger();
    layout = new SpyLayout();

    const cliDir = `${rootDir}/cli`;
    fileSystem.directories.set(rootDir, ['cli']);
    fileSystem.directories.set(cliDir, ['writers-components.yaml']);

    const path = `${cliDir}/writers-components.yaml`;
    fileSystem.writtenFiles.set(path, serializeSchemaToYaml(writersComponents));
    fileSystem.existingFiles.add(path);
  });

  it('layouts each schema including external proxy nodes', async () => {
    const result = await applyLayoutPass(rootDir, layout, fileSystem, logger);

    expect(result.schemasScanned).toBe(1);
    expect(result.schemasUpdated).toBe(1);
    expect(layout.calls).toHaveLength(1);
    expect(layout.calls[0]!.nodes.map(n => n.entityRef)).toEqual([
      'blueprint/cli/writers/context-level-writer',
      'blueprint/cli/vhs/cli-demo-test',
    ]);
    expect(layout.calls[0]!.dependencies).toHaveLength(1);

    const rewritten = parseSchemaFromYaml(
      await fileSystem.readSchema(`${rootDir}/cli/writers-components.yaml`)
    );
    expect(
      rewritten.nodes.find(n => n.entityRef === 'blueprint/cli/writers/context-level-writer')
    ).toMatchObject({
      x: 100,
      y: 200,
    });
    expect(
      rewritten.nodes.find(n => n.entityRef === 'blueprint/cli/vhs/cli-demo-test')
    ).toMatchObject({
      x: 200,
      y: 400,
      external: true,
    });
  });

  it('is a no-op when the blueprints tree is empty', async () => {
    const emptyFs = new MockFileSystem();
    emptyFs.directories.set(rootDir, []);
    const result = await applyLayoutPass(rootDir, layout, emptyFs, logger);
    expect(result.schemasUpdated).toBe(0);
    expect(result.schemasScanned).toBe(0);
    expect(layout.calls).toHaveLength(0);
  });
});
