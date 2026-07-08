import { describe, it, expect } from 'vitest';
import {
  validateGraph,
  parseSchemaFromYaml,
  serializeSchemaToYaml,
  serializeSchemaToMermaid,
} from './graph';
import type { SystemSchema } from './schema';

describe('Graph Validation & Cycle Detection', () => {
  it('should validate a clean, acyclic graph', () => {
    const schema: SystemSchema = {
      name: 'Acyclic System',
      version: '1.0.0',
      nodes: [
        { id: 'Gateway', type: 'rest-api', name: 'Gateway' },
        { id: 'AuthService', type: 'grpc-service', name: 'AuthService' },
        { id: 'SessionDB', type: 'relational-database', name: 'SessionDB' },
      ],
      dependencies: [
        { from: 'Gateway', to: 'AuthService', type: 'direct-call' },
        { from: 'AuthService', to: 'SessionDB', type: 'read-write' },
      ],
    };

    const result = validateGraph(schema);
    expect(result.isValid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('should detect a direct cycle (A -> A)', () => {
    const schema: SystemSchema = {
      name: 'Self Loop',
      version: '1.0.0',
      nodes: [{ id: 'Worker', type: 'serverless-function', name: 'Worker' }],
      dependencies: [{ from: 'Worker', to: 'Worker', type: 'direct-call' }],
    };

    const result = validateGraph(schema);
    expect(result.isValid).toBe(false);
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].type).toBe('cycle');
    expect(result.issues[0].path).toEqual(['Worker', 'Worker']);
  });

  it('should detect a multi-node cycle (A -> B -> C -> A)', () => {
    const schema: SystemSchema = {
      name: 'Circular Services',
      version: '1.0.0',
      nodes: [
        { id: 'ServiceA', type: 'grpc-service', name: 'Service A' },
        { id: 'ServiceB', type: 'grpc-service', name: 'Service B' },
        { id: 'ServiceC', type: 'grpc-service', name: 'Service C' },
      ],
      dependencies: [
        { from: 'ServiceA', to: 'ServiceB', type: 'direct-call' },
        { from: 'ServiceB', to: 'ServiceC', type: 'direct-call' },
        { from: 'ServiceC', to: 'ServiceA', type: 'direct-call' },
      ],
    };

    const result = validateGraph(schema);
    expect(result.isValid).toBe(false);
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].type).toBe('cycle');
    // The cycle path should contain the cycle nodes
    const path = result.issues[0].path;
    expect(path).toContain('ServiceA');
    expect(path).toContain('ServiceB');
    expect(path).toContain('ServiceC');
    expect(path![0]).toBe(path![path!.length - 1]); // starts and ends at the same node
  });

  it('should detect cycles in disconnected subgraphs', () => {
    const schema: SystemSchema = {
      name: 'Disconnected Cycles',
      version: '1.0.0',
      nodes: [
        { id: 'A', type: 'rest-api', name: 'A' },
        { id: 'B', type: 'grpc-service', name: 'B' },
        { id: 'C', type: 'event-broker', name: 'C' },
        { id: 'D', type: 'event-broker', name: 'D' },
      ],
      dependencies: [
        { from: 'A', to: 'B', type: 'direct-call' },
        { from: 'C', to: 'D', type: 'publish-subscribe' },
        { from: 'D', to: 'C', type: 'publish-subscribe' },
      ],
    };

    const result = validateGraph(schema);
    expect(result.isValid).toBe(false);
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].type).toBe('cycle');
    expect(result.issues[0].path).toContain('C');
    expect(result.issues[0].path).toContain('D');
  });
});

describe('YAML Schema Parsing and Serialization', () => {
  it('should parse valid YAML into SystemSchema model', () => {
    const yamlContent = `
name: Demo System
version: 1.0.0
nodes:
  - id: UserApi
    type: grpc-service
    name: User API
  - id: UserCache
    type: cache-store
    name: Redis Cache
dependencies:
  - from: UserApi
    to: UserCache
    type: read-write
`;
    const schema = parseSchemaFromYaml(yamlContent);
    expect(schema.name).toBe('Demo System');
    expect(schema.nodes).toHaveLength(2);
    expect(schema.nodes[0].id).toBe('UserApi');
    expect(schema.nodes[1].type).toBe('cache-store');
    expect(schema.dependencies).toHaveLength(1);
    expect(schema.dependencies[0].from).toBe('UserApi');
  });

  it('should throw validation errors for YAML with invalid node types', () => {
    const invalidYaml = `
name: Malicious System
version: 1.0.0
nodes:
  - id: HackNode
    type: invalid-type-hacker
    name: Hacker
`;
    expect(() => parseSchemaFromYaml(invalidYaml)).toThrow();
  });

  it('should throw validation errors for YAML with malformed node IDs', () => {
    const invalidYaml = `
name: Malicious System
version: 1.0.0
nodes:
  - id: "invalid id with spaces"
    type: rest-api
    name: Rest API
`;
    expect(() => parseSchemaFromYaml(invalidYaml)).toThrow();
  });

  it('should serialize SystemSchema model to valid YAML', () => {
    const schema: SystemSchema = {
      name: 'Demo System',
      version: '1.0.0',
      nodes: [{ id: 'UserApi', type: 'grpc-service', name: 'User API' }],
      dependencies: [],
    };

    const yamlContent = serializeSchemaToYaml(schema);
    expect(yamlContent).toContain('name: Demo System');
    expect(yamlContent).toContain('id: UserApi');
    expect(yamlContent).toContain('type: grpc-service');
  });

  it('should serialize SystemSchema model to valid Mermaid code', () => {
    const schema: SystemSchema = {
      name: 'Demo System',
      version: '1.0.0',
      nodes: [
        { id: 'Gateway', type: 'rest-api', name: 'Gateway Node' },
        { id: 'DB', type: 'relational-database', name: 'DB Node' },
      ],
      dependencies: [{ from: 'Gateway', to: 'DB', type: 'direct-call', description: 'Query' }],
    };

    const mermaidContent = serializeSchemaToMermaid(schema);
    expect(mermaidContent).toContain('graph TD');
    expect(mermaidContent).toContain('Gateway["Gateway Node"]');
    expect(mermaidContent).toContain('DB[("DB Node")]');
    expect(mermaidContent).toContain('Gateway --> |"Query"| DB');
  });
});
