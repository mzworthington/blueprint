import { describe, it, expect } from 'vitest';
import {
  validateGraph,
  parseSchemaFromYaml,
  serializeSchemaToYaml,
  serializeSchemaToMermaid,
} from './graph';
import type { SystemSchema } from '@blueprint/core';

describe('Graph Validation & Cycle Detection', () => {
  it('should validate a clean, acyclic graph', () => {
    const schema: SystemSchema = {
      name: 'Acyclic System',
      version: '1.0.0',
      level: 'container',
      nodes: [
        { entityRef: 'Gateway', type: 'rest-api', name: 'Gateway' },
        { entityRef: 'AuthService', type: 'grpc-service', name: 'AuthService' },
        { entityRef: 'SessionDB', type: 'relational-database', name: 'SessionDB' },
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
      level: 'container',
      nodes: [{ entityRef: 'Worker', type: 'serverless-function', name: 'Worker' }],
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
      level: 'container',
      nodes: [
        { entityRef: 'ServiceA', type: 'grpc-service', name: 'Service A' },
        { entityRef: 'ServiceB', type: 'grpc-service', name: 'Service B' },
        { entityRef: 'ServiceC', type: 'grpc-service', name: 'Service C' },
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

    const path = result.issues[0].path;
    expect(path).toContain('ServiceA');
    expect(path).toContain('ServiceB');
    expect(path).toContain('ServiceC');
    expect(path![0]).toBe(path![path!.length - 1]);
  });

  it('should detect cycles in disconnected subgraphs', () => {
    const schema: SystemSchema = {
      name: 'Disconnected Cycles',
      version: '1.0.0',
      level: 'container',
      nodes: [
        { entityRef: 'A', type: 'rest-api', name: 'A' },
        { entityRef: 'B', type: 'grpc-service', name: 'B' },
        { entityRef: 'C', type: 'event-broker', name: 'C' },
        { entityRef: 'D', type: 'event-broker', name: 'D' },
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
level: container
nodes:
  - entityRef: UserApi
    type: grpc-service
    name: User API
  - entityRef: UserCache
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
    expect(schema.nodes[0].entityRef).toBe('UserApi');
    expect(schema.nodes[1].type).toBe('cache-store');
    expect(schema.dependencies).toHaveLength(1);
    expect(schema.dependencies[0].from).toBe('UserApi');
  });

  it('should throw validation errors for YAML with invalid node types', () => {
    const invalidYaml = `
name: Malicious System
version: 1.0.0
level: container
nodes:
  - entityRef: HackNode
    type: invalid-type-hacker
    name: Hacker
`;
    expect(() => parseSchemaFromYaml(invalidYaml)).toThrow();
  });

  it('should throw validation errors for YAML with malformed node IDs', () => {
    const invalidYaml = `
name: Malicious System
version: 1.0.0
level: container
nodes:
  - entityRef: "invalid id with spaces"
    type: rest-api
    name: Rest API
`;
    expect(() => parseSchemaFromYaml(invalidYaml)).toThrow();
  });

  it('should serialize SystemSchema model to valid YAML', () => {
    const schema: SystemSchema = {
      name: 'Demo System',
      version: '1.0.0',
      level: 'container',
      nodes: [{ entityRef: 'UserApi', type: 'grpc-service', name: 'User API' }],
      dependencies: [],
    };

    const yamlContent = serializeSchemaToYaml(schema);
    expect(yamlContent).toContain('name: Demo System');
    expect(yamlContent).toContain('entityRef: UserApi');
    expect(yamlContent).toContain('type: grpc-service');
  });

  it('should parse and serialize isTest flag', () => {
    const yamlContent = `
name: Test System
version: 1.0.0
level: container
nodes:
  - entityRef: ServiceTest
    type: grpc-service
    name: Service Test Component
    isTest: true
`;
    const schema = parseSchemaFromYaml(yamlContent);
    expect(schema.nodes[0].isTest).toBe(true);

    const serialized = serializeSchemaToYaml(schema);
    expect(serialized).toContain('isTest: true');
  });

  it('should serialize SystemSchema model to valid Mermaid code and handle keyword conflicts', () => {
    const schema: SystemSchema = {
      name: 'Demo System',
      version: '1.0.0',
      level: 'container',
      nodes: [
        { entityRef: 'Gateway', type: 'rest-api', name: 'Gateway Node' },
        { entityRef: 'DB', type: 'relational-database', name: 'DB Node' },
        { entityRef: 'graph', type: 'background-worker', name: 'graph Service' },
      ],
      dependencies: [{ from: 'Gateway', to: 'DB', type: 'direct-call', description: 'Query' }],
    };

    const mermaidContent = serializeSchemaToMermaid(schema);
    expect(mermaidContent).toContain('graph TD');
    expect(mermaidContent).toContain('node_Gateway["Gateway Node"]');
    expect(mermaidContent).toContain('node_DB[("DB Node")]');
    expect(mermaidContent).toContain('node_graph["graph Service"]');
    expect(mermaidContent).toContain('node_Gateway --> |"Query"| node_DB');
  });

  describe('C4 Model Validation & Serialization Extensions', () => {
    it('should parse C4 properties from valid YAML schema', () => {
      const yamlContent = `
name: High-Level System Context
version: 1.0.0
level: context
id: ../root-workspace.yaml
nodes:
  - entityRef: billing-service
    type: microservice
    name: Billing Service
  - entityRef: payment-gateway
    type: software-system
    name: External Payment Processor
    external: true
dependencies:
  - from: billing-service
    to: payment-gateway
    type: direct-call
    description: Authorize Credit Card
`;
      const schema = parseSchemaFromYaml(yamlContent);
      expect(schema.level).toBe('context');
      expect(schema.id).toBe('../root-workspace.yaml');
      expect(schema.nodes).toHaveLength(2);
      expect(schema.nodes[0].entityRef).toBe('billing-service');
      expect(schema.nodes[0].type).toBe('microservice');
      expect(schema.nodes[1].external).toBe(true);
      expect(schema.dependencies[0].description).toBe('Authorize Credit Card');
    });

    it('should serialize C4 properties to valid YAML and Mermaid', () => {
      const schema: SystemSchema = {
        name: 'Workspace Level',
        version: '1.2.0',
        level: 'container',
        id: '../workspace.yaml',
        nodes: [
          {
            entityRef: 'webapp',
            type: 'web-app',
            name: 'Web Portal',
          },
          {
            entityRef: 'external_svc',
            type: 'software-system',
            name: 'API Service',
            external: true,
          },
        ],
        dependencies: [
          {
            from: 'webapp',
            to: 'external_svc',
            type: 'direct-call',
            description: 'Hits Endpoint',
          },
        ],
      };

      const yamlContent = serializeSchemaToYaml(schema);
      expect(yamlContent).toContain('level: container');
      expect(yamlContent).toContain('id: ../workspace.yaml');
      expect(yamlContent).toContain('external: true');

      const mermaid = serializeSchemaToMermaid(schema);
      expect(mermaid).toContain('node_webapp["Web Portal"]');
      expect(mermaid).toContain('node_external_svc["API Service (External)"]');
    });
  });
});
