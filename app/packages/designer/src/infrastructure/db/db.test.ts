import { describe, it, expect, beforeEach } from 'vitest';
import {
  db,
  saveBaselineSchema,
  saveWorkingSchema,
  computeSchemaDiff,
  revertWorkingSchema,
} from './db';
import type { SystemSchema } from '../../core';

describe('db.ts - IndexedDB Client Operations', () => {
  beforeEach(async () => {
    // Clear all collections before each test to ensure isolation
    await db.originalNodes.clear();
    await db.workingNodes.clear();
    await db.originalDependencies.clear();
    await db.workingDependencies.clear();
  });

  const sampleSchema: SystemSchema = {
    name: 'Sample System',
    version: '1.0.0',
    level: 'component',
    nodes: [
      {
        id: 'service-a',
        type: 'microservice',
        name: 'Service A',
        properties: { technology: 'Go' },
      },
      { id: 'db-a', type: 'relational-database', name: 'Database A' },
    ],
    dependencies: [{ from: 'service-a', to: 'db-a', type: 'read-write' }],
  };

  const sampleNodeRefMap = {
    'service-a': 'backstage/catalog/service-a',
    'db-a': 'backstage/catalog/db-a',
  };

  it('should successfully save baseline schemas and dependencies', async () => {
    await saveBaselineSchema('blueprints/sys.yaml', sampleSchema, 'backstage', sampleNodeRefMap);

    const nodes = await db.originalNodes.toArray();
    expect(nodes).toHaveLength(2);

    const serviceNode = nodes.find(n => n.id === 'service-a');
    expect(serviceNode).toEqual({
      entityRef: 'backstage/catalog/service-a',
      id: 'service-a',
      systemId: 'backstage',
      containerId: 'catalog',
      type: 'microservice',
      name: 'Service A',
      properties: { technology: 'Go' },
      filePath: 'blueprints/sys.yaml',
      x: undefined,
      y: undefined,
    });

    const deps = await db.originalDependencies.toArray();
    expect(deps).toHaveLength(1);
    expect(deps[0].id).toBe('backstage/catalog/service-a->backstage/catalog/db-a');
  });

  it('should compute an empty diff when baseline and working schemas match', async () => {
    await saveBaselineSchema('blueprints/sys.yaml', sampleSchema, 'backstage', sampleNodeRefMap);
    await saveWorkingSchema('blueprints/sys.yaml', sampleSchema, 'backstage', sampleNodeRefMap);

    const diff = await computeSchemaDiff('blueprints/sys.yaml');
    expect(diff.nodes.added).toHaveLength(0);
    expect(diff.nodes.modified).toHaveLength(0);
    expect(diff.nodes.deleted).toHaveLength(0);
    expect(diff.dependencies.added).toHaveLength(0);
    expect(diff.dependencies.deleted).toHaveLength(0);
  });

  it('should detect added components and connections in working schema', async () => {
    const updatedSchema: SystemSchema = {
      ...sampleSchema,
      nodes: [...sampleSchema.nodes, { id: 'cache-a', type: 'cache-store', name: 'Cache Store A' }],
      dependencies: [
        ...sampleSchema.dependencies,
        { from: 'service-a', to: 'cache-a', type: 'read-write' },
      ],
    };

    const updatedNodeRefMap = {
      ...sampleNodeRefMap,
      'cache-a': 'backstage/catalog/cache-a',
    };

    await saveBaselineSchema('blueprints/sys.yaml', sampleSchema, 'backstage', sampleNodeRefMap);
    await saveWorkingSchema('blueprints/sys.yaml', updatedSchema, 'backstage', updatedNodeRefMap);

    const diff = await computeSchemaDiff('blueprints/sys.yaml');
    expect(diff.nodes.added).toHaveLength(1);
    expect(diff.nodes.added[0].id).toBe('cache-a');
    expect(diff.dependencies.added).toHaveLength(1);
    expect(diff.dependencies.added[0].id).toBe(
      'backstage/catalog/service-a->backstage/catalog/cache-a'
    );
  });

  it('should detect deleted components and connections in working schema', async () => {
    const reducedSchema: SystemSchema = {
      ...sampleSchema,
      nodes: [
        {
          id: 'service-a',
          type: 'microservice',
          name: 'Service A',
          properties: { technology: 'Go' },
        },
      ],
      dependencies: [],
    };

    await saveBaselineSchema('blueprints/sys.yaml', sampleSchema, 'backstage', sampleNodeRefMap);
    await saveWorkingSchema('blueprints/sys.yaml', reducedSchema, 'backstage', sampleNodeRefMap);

    const diff = await computeSchemaDiff('blueprints/sys.yaml');
    expect(diff.nodes.deleted).toHaveLength(1);
    expect(diff.nodes.deleted[0].id).toBe('db-a');
    expect(diff.dependencies.deleted).toHaveLength(1);
    expect(diff.dependencies.deleted[0].id).toBe(
      'backstage/catalog/service-a->backstage/catalog/db-a'
    );
  });

  it('should detect modified properties, name or type of components', async () => {
    const modifiedSchema: SystemSchema = {
      ...sampleSchema,
      nodes: [
        {
          id: 'service-a',
          type: 'microservice',
          name: 'Service A Updated Name',
          properties: { technology: 'Go', version: '2.0' },
        },
        { id: 'db-a', type: 'relational-database', name: 'Database A' },
      ],
    };

    await saveBaselineSchema('blueprints/sys.yaml', sampleSchema, 'backstage', sampleNodeRefMap);
    await saveWorkingSchema('blueprints/sys.yaml', modifiedSchema, 'backstage', sampleNodeRefMap);

    const diff = await computeSchemaDiff('blueprints/sys.yaml');
    expect(diff.nodes.modified).toHaveLength(1);
    expect(diff.nodes.modified[0].current.name).toBe('Service A Updated Name');
    expect(diff.nodes.modified[0].original.name).toBe('Service A');
  });

  it('should detect position changes of components', async () => {
    const positionSchema: SystemSchema = {
      ...sampleSchema,
      nodes: [
        { id: 'service-a', type: 'microservice', name: 'Service A', x: 150, y: 250 },
        { id: 'db-a', type: 'relational-database', name: 'Database A' },
      ],
    };

    await saveBaselineSchema('blueprints/sys.yaml', sampleSchema, 'backstage', sampleNodeRefMap);
    await saveWorkingSchema('blueprints/sys.yaml', positionSchema, 'backstage', sampleNodeRefMap);

    const diff = await computeSchemaDiff('blueprints/sys.yaml');
    expect(diff.nodes.modified).toHaveLength(1);
    expect(diff.nodes.modified[0].current.x).toBe(150);
    expect(diff.nodes.modified[0].current.y).toBe(250);
  });

  it('should revert draft changes back to baseline', async () => {
    await saveBaselineSchema('blueprints/sys.yaml', sampleSchema, 'backstage', sampleNodeRefMap);

    const updatedSchema: SystemSchema = {
      ...sampleSchema,
      nodes: [
        {
          id: 'service-a',
          type: 'microservice',
          name: 'Service A Modified',
          properties: { technology: 'TS' },
        },
      ],
      dependencies: [],
    };
    await saveWorkingSchema('blueprints/sys.yaml', updatedSchema, 'backstage', sampleNodeRefMap);

    // Verify draft has been modified first
    const diffBefore = await computeSchemaDiff('blueprints/sys.yaml');
    expect(diffBefore.nodes.modified).toHaveLength(1);

    // Execute revert
    const restored = await revertWorkingSchema(
      'blueprints/sys.yaml',
      'Sample System',
      '1.0.0',
      'component'
    );

    // Verify returned schema matches original
    expect(restored.name).toBe('Sample System');
    expect(restored.nodes).toHaveLength(2);
    const restoredService = restored.nodes.find(n => n.id === 'service-a');
    expect(restoredService?.name).toBe('Service A');
    expect(restored.dependencies).toHaveLength(1);

    // Verify DB working state is reset
    const diffAfter = await computeSchemaDiff('blueprints/sys.yaml');
    expect(diffAfter.nodes.added).toHaveLength(0);
    expect(diffAfter.nodes.modified).toHaveLength(0);
    expect(diffAfter.nodes.deleted).toHaveLength(0);
  });
});
