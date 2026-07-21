import { describe, it, expect, beforeEach } from 'vitest';
import {
  ContextLevelWriter,
  personDependenciesForSystems,
  PERSON_EDGE_DESCRIPTION,
  topLevelSystemNodes,
} from './contextLevelWriter.ts';
import { MockFileSystem, MockLogger } from '../test/fakes.ts';
import { parseSchemaFromYaml } from '@blueprint/core';

describe('topLevelSystemNodes', () => {
  it('returns nodes without a visual parent, excluding the person', () => {
    const nodes = topLevelSystemNodes([
      {
        entityRef: 'ctx/backstage',
        type: 'group',
        name: 'Backstage',
        properties: { productId: 'backstage' },
      },
      {
        entityRef: 'ctx/packages',
        type: 'software-system',
        name: 'Packages',
        parentEntityRef: 'ctx/backstage',
      },
      { entityRef: 'ctx/user', type: 'person', name: 'User' },
    ]);
    expect(nodes.map(n => n.entityRef)).toEqual(['ctx/backstage']);
  });
});

describe('personDependenciesForSystems', () => {
  it('links the person to top-level groups only', () => {
    const deps = personDependenciesForSystems('ctx/user', [
      {
        entityRef: 'ctx/backstage',
        type: 'group',
        name: 'Backstage',
        properties: { productId: 'backstage' },
      },
      {
        entityRef: 'ctx/packages',
        type: 'software-system',
        name: 'Packages',
        parentEntityRef: 'ctx/backstage',
      },
      {
        entityRef: 'ctx/blueprint',
        type: 'software-system',
        name: 'Blueprint',
        properties: { productId: 'blueprint' },
      },
    ]);

    expect(deps).toHaveLength(2);
    expect(deps.every(d => d.from === 'ctx/user')).toBe(true);
    expect(deps.every(d => d.description === PERSON_EDGE_DESCRIPTION)).toBe(true);
    expect(deps.map(d => d.to).sort()).toEqual(['ctx/backstage', 'ctx/blueprint']);
  });
});

describe('ContextLevelWriter', () => {
  let fileSystem: MockFileSystem;
  let logger: MockLogger;
  let writer: ContextLevelWriter;

  beforeEach(() => {
    fileSystem = new MockFileSystem();
    logger = new MockLogger();
    writer = new ContextLevelWriter(fileSystem, logger);
  });

  it('should write context schema with correct entityRef', async () => {
    await writer.write('/workspace/blueprints', 'my-context', 'my-system');

    const yamlContent = fileSystem.writtenFiles.get('/workspace/blueprints/context.yaml')!;
    expect(yamlContent).toContain('entityRef: my-context');
    expect(yamlContent).toContain('entityRef: my-context/my-system');
    expect(yamlContent).toContain('type: software-system');
    expect(yamlContent).toContain('entityRef: my-context/user');
    expect(yamlContent).toContain('type: person');
    expect(yamlContent).toContain(PERSON_EDGE_DESCRIPTION);
    expect(yamlContent).toContain('from: my-context/user');
    expect(yamlContent).toContain('to: my-context/my-system');
  });

  it('should use an explicit display name when provided', async () => {
    await writer.write('/workspace/blueprints', 'blueprint', 'packages', 'Packages');

    const yamlContent = fileSystem.writtenFiles.get('/workspace/blueprints/context.yaml')!;
    expect(yamlContent).toContain('name: Packages System');
    expect(yamlContent).toContain('entityRef: blueprint/packages');
  });

  it('should slugify context name in entityRef', async () => {
    await writer.write('/workspace/blueprints', 'My Context Name', 'my-system');

    const yamlContent = fileSystem.writtenFiles.get('/workspace/blueprints/context.yaml')!;
    expect(yamlContent).toContain('entityRef: my-context-name');
  });

  it('should merge a second software-system into an existing context diagram', async () => {
    await writer.write('/workspace/blueprints', 'blueprint', 'blueprint');
    await writer.write('/workspace/blueprints', 'blueprint', 'backstage');

    const yamlContent = fileSystem.writtenFiles.get('/workspace/blueprints/context.yaml')!;
    expect(yamlContent).toContain('entityRef: blueprint/blueprint');
    expect(yamlContent).toContain('entityRef: blueprint/backstage');
  });

  it('nests subsystems under the product group and leaves other products disconnected', async () => {
    await writer.writeSystems('/workspace/blueprints', 'ctx', [
      {
        entityRef: 'blueprint',
        displayName: 'Blueprint',
        rootPath: '',
        productId: 'blueprint',
        isProductHub: true,
      },
    ]);

    await writer.writeSystems('/workspace/blueprints', 'ctx', [
      {
        entityRef: 'backstage',
        displayName: 'Backstage',
        rootPath: '',
        productId: 'backstage',
        isProductHub: true,
      },
      {
        entityRef: 'packages',
        displayName: 'Packages',
        rootPath: 'packages',
        productId: 'backstage',
      },
      {
        entityRef: 'plugins',
        displayName: 'Plugins',
        rootPath: 'plugins',
        productId: 'backstage',
      },
      {
        entityRef: 'microsite',
        displayName: 'Microsite',
        rootPath: 'microsite',
        productId: 'backstage',
      },
    ]);

    const yamlContent = fileSystem.writtenFiles.get('/workspace/blueprints/context.yaml')!;
    expect(yamlContent).toContain('type: group');
    expect(yamlContent).toContain('entityRef: ctx/backstage');
    expect(yamlContent).toContain('children:');
    expect(yamlContent).toContain('entityRef: ctx/packages');
    expect(yamlContent).not.toContain('Part of product system');
    expect(yamlContent).toContain('entityRef: ctx/blueprint');
    expect(yamlContent).not.toMatch(/from: ctx\/blueprint[\s\S]*to: ctx\/(packages|backstage)/);

    const schema = parseSchemaFromYaml(yamlContent);
    const person = schema.nodes.find(n => n.type === 'person');
    expect(person?.entityRef).toBe('ctx/user');
    const personEdges = schema.dependencies.filter(d => d.from === 'ctx/user');
    expect(personEdges.map(d => d.to).sort()).toEqual(['ctx/backstage', 'ctx/blueprint']);
    expect(personEdges.every(d => d.description === PERSON_EDGE_DESCRIPTION)).toBe(true);
    expect(personEdges.some(d => d.to === 'ctx/packages')).toBe(false);

    const packages = schema.nodes.find(n => n.entityRef === 'ctx/packages');
    expect(packages?.parentEntityRef).toBe('ctx/backstage');
  });

  it('should upsert rather than duplicate when rewriting the same system', async () => {
    await writer.write('/workspace/blueprints', 'blueprint', 'backstage');
    await writer.write('/workspace/blueprints', 'blueprint', 'backstage');

    const yamlContent = fileSystem.writtenFiles.get('/workspace/blueprints/context.yaml')!;
    const matches = yamlContent.match(/entityRef: blueprint\/backstage/g) || [];
    expect(matches).toHaveLength(1);
  });

  it('should log successful write', async () => {
    await writer.write('/workspace/blueprints', 'test-context', 'test-system');
    expect(logger.logs.some(log => log.includes('Saved Context schema'))).toBe(true);
  });
});
