import { describe, it, expect, beforeEach } from 'vitest';
import {
  ContextLevelWriter,
  productHubDependenciesForSystems,
  personDependenciesForSystems,
  PRODUCT_EDGE_DESCRIPTION,
  PERSON_EDGE_DESCRIPTION,
} from './contextLevelWriter.ts';
import { MockFileSystem, MockLogger } from '../test/fakes.ts';
import { parseSchemaFromYaml } from '@blueprint/core';

describe('productHubDependenciesForSystems', () => {
  it('fans spokes into the product hub and ignores other products', () => {
    const deps = productHubDependenciesForSystems([
      {
        entityRef: 'ctx/backstage',
        type: 'software-system',
        name: 'Backstage',
        properties: { productId: 'backstage', role: 'product-hub' },
      },
      {
        entityRef: 'ctx/packages',
        type: 'software-system',
        name: 'Packages',
        properties: { productId: 'backstage', role: 'subsystem' },
      },
      {
        entityRef: 'ctx/plugins',
        type: 'software-system',
        name: 'Plugins',
        properties: { productId: 'backstage', role: 'subsystem' },
      },
      {
        entityRef: 'ctx/microsite',
        type: 'software-system',
        name: 'Microsite',
        properties: { productId: 'backstage', role: 'subsystem' },
      },
      {
        entityRef: 'ctx/blueprint',
        type: 'software-system',
        name: 'Blueprint',
        properties: { productId: 'blueprint', role: 'product-hub' },
      },
    ]);

    expect(deps).toHaveLength(3);
    expect(deps.every(d => d.from === 'ctx/backstage')).toBe(true);
    expect(deps.every(d => d.description === PRODUCT_EDGE_DESCRIPTION)).toBe(true);
    expect(deps.some(d => d.to === 'ctx/blueprint' || d.from === 'ctx/blueprint')).toBe(false);
  });
});

describe('personDependenciesForSystems', () => {
  it('links the person to product hubs only', () => {
    const deps = personDependenciesForSystems('ctx/user', [
      {
        entityRef: 'ctx/backstage',
        type: 'software-system',
        name: 'Backstage',
        properties: { productId: 'backstage', role: 'product-hub' },
      },
      {
        entityRef: 'ctx/packages',
        type: 'software-system',
        name: 'Packages',
        properties: { productId: 'backstage', role: 'subsystem' },
      },
      {
        entityRef: 'ctx/blueprint',
        type: 'software-system',
        name: 'Blueprint',
        properties: { productId: 'blueprint', role: 'product-hub' },
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

  it('joins subsystems to the product hub and leaves other products disconnected', async () => {
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
    expect(yamlContent).toContain(PRODUCT_EDGE_DESCRIPTION);
    expect(yamlContent).toContain('from: ctx/backstage');
    expect(yamlContent).toContain('to: ctx/packages');
    expect(yamlContent).toContain('to: ctx/plugins');
    expect(yamlContent).toContain('to: ctx/microsite');
    // Blueprint remains on the canvas but is not linked into the Backstage product
    expect(yamlContent).toContain('entityRef: ctx/blueprint');
    expect(yamlContent).not.toMatch(/from: ctx\/blueprint[\s\S]*to: ctx\/(packages|backstage)/);
    expect(yamlContent).not.toContain('Sibling systems in the same directory');

    const schema = parseSchemaFromYaml(yamlContent);
    const person = schema.nodes.find(n => n.type === 'person');
    expect(person?.entityRef).toBe('ctx/user');
    const personEdges = schema.dependencies.filter(d => d.from === 'ctx/user');
    expect(personEdges.map(d => d.to).sort()).toEqual(['ctx/backstage', 'ctx/blueprint']);
    expect(personEdges.every(d => d.description === PERSON_EDGE_DESCRIPTION)).toBe(true);
    // Person does not link directly to subsystems
    expect(personEdges.some(d => d.to === 'ctx/packages')).toBe(false);
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
