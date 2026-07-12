import { describe, it, expect } from 'vitest';
import * as pb from '../generated/blueprint/v1/schema';
import { toPbSystemSchema, fromPbSystemSchema, type SystemSchema } from '../models/schema';

describe('Protobuf Binary Serialization Bridge', () => {
  it('should serialize and deserialize a SystemSchema losslessly via Protobuf binary', () => {
    const original: SystemSchema = {
      name: 'Test Monorepo',
      version: '1.2.3',
      level: 'component',
      parentRef: 'parent-system/container-node',
      nodes: [
        {
          id: 'api-service',
          type: 'microservice',
          name: 'API Service',
          external: false,
          isTest: false,
          x: 150,
          y: 200,
          entityRef: 'test-monorepo/api-service',
          properties: {
            technology: 'Rust',
            port: 8080,
            active: true,
          },
        },
        {
          id: 'db-node',
          type: 'relational-database',
          name: 'PostgreSQL DB',
          external: true,
          properties: {
            engine: 'Postgres',
            version: 15,
          },
        },
      ],
      dependencies: [
        {
          from: 'api-service',
          to: 'db-node',
          type: 'read-write',
          description: 'Reads and writes client entities',
        },
      ],
    };

    // Convert to protobuf representation
    const pbSchema = toPbSystemSchema(original);

    // Serialize to binary bytes
    const bytes = pb.SystemSchema.encode(pbSchema).finish();
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBeGreaterThan(0);

    // Deserialize from binary bytes
    const decodedPb = pb.SystemSchema.decode(bytes);

    // Convert back to domain interface
    const restored = fromPbSystemSchema(decodedPb);

    // Assert exact equality
    expect(restored.name).toBe(original.name);
    expect(restored.version).toBe(original.version);
    expect(restored.level).toBe(original.level);
    expect(restored.parentRef).toBe(original.parentRef);
    expect(restored.nodes).toHaveLength(2);

    const apiNode = restored.nodes.find(n => n.id === 'api-service')!;
    expect(apiNode).toBeDefined();
    expect(apiNode.type).toBe('microservice');
    expect(apiNode.name).toBe('API Service');
    expect(apiNode.external).toBe(false);
    expect(apiNode.isTest).toBe(false);
    expect(apiNode.x).toBe(150);
    expect(apiNode.y).toBe(200);
    expect(apiNode.entityRef).toBe('test-monorepo/api-service');
    expect(apiNode.properties).toEqual({
      technology: 'Rust',
      port: 8080,
      active: true,
    });

    const dbNode = restored.nodes.find(n => n.id === 'db-node')!;
    expect(dbNode).toBeDefined();
    expect(dbNode.type).toBe('relational-database');
    expect(dbNode.external).toBe(true);
    expect(dbNode.properties).toEqual({
      engine: 'Postgres',
      version: 15,
    });

    expect(restored.dependencies).toHaveLength(1);
    expect(restored.dependencies[0]).toEqual({
      from: 'api-service',
      to: 'db-node',
      type: 'read-write',
      description: 'Reads and writes client entities',
    });
  });
});
