import { describe, it, expect } from 'vitest';
import {
  validateGraph,
  parseSchemaFromYaml,
  serializeSchemaToYaml,
  serializeSchemaToMermaid,
  toSystemSchemaJsonSchema,
} from './graph';
import type { SystemSchema } from '../models/schema';

describe('toSystemSchemaJsonSchema', () => {
  it('exports Draft-07 JSON Schema as a v3 object document with metaData', () => {
    const schema = toSystemSchemaJsonSchema();
    expect(schema.$schema).toBe('http://json-schema.org/draft-07/schema#');
    expect(schema.$id).toBe(
      'https://blueprint.mzworthington.co.uk/schemas/v3/blueprint.schema.json'
    );
    expect(schema.title).toBe('Blueprint System Schema');
    expect(schema.type).toBe('object');
    expect(schema.required).toEqual(
      expect.arrayContaining(['version', 'level', 'metaData', 'nodes'])
    );
    const props = schema.properties as Record<
      string,
      { properties?: Record<string, unknown>; enum?: string[] }
    >;
    expect(props.level.enum).toEqual(['context', 'container', 'component', 'code']);
    expect(props.metaData.properties).toEqual(
      expect.objectContaining({
        entityRef: expect.any(Object),
        name: expect.any(Object),
      })
    );
  });
});

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

  it('should serialize SystemSchema model to a v3 object with metaData', () => {
    const schema: SystemSchema = {
      entityRef: 'demo',
      name: 'Demo System',
      version: '1.0.0',
      level: 'container',
      nodes: [{ entityRef: 'UserApi', type: 'grpc-service', name: 'User API', x: 10, y: 20 }],
      dependencies: [],
    };

    const yamlContent = serializeSchemaToYaml(schema);
    expect(yamlContent).toMatch(
      /^version: https:\/\/blueprint\.mzworthington\.co\.uk\/schemas\/v3\/blueprint\.schema\.json\n/
    );
    expect(yamlContent).toContain('metaData:');
    expect(yamlContent).toContain('  entityRef: demo');
    expect(yamlContent).toContain('  name: Demo System');
    expect(yamlContent).toContain('level: container');
    expect(yamlContent).toContain('- entityRef: UserApi');
    expect(yamlContent).toContain('type: grpc-service');
    expect(yamlContent).toContain('y: 20');
    expect(yamlContent).not.toContain("'y':");
    expect(yamlContent).not.toMatch(/^- entityRef:/m);
    expect(yamlContent).not.toContain('yaml-language-server');
  });

  it('should parse v3 YAML with metaData into SystemSchema', () => {
    const yamlContent = `
version: https://blueprint.mzworthington.co.uk/schemas/v3/blueprint.schema.json
level: component
metaData:
  entityRef: blueprint/app/cli
  name: Cli Service Components
nodes:
  - entityRef: blueprint/app/cli/api
    type: rest-api
    name: API
dependencies: []
`;
    const schema = parseSchemaFromYaml(yamlContent);
    expect(schema.entityRef).toBe('blueprint/app/cli');
    expect(schema.name).toBe('Cli Service Components');
    expect(schema.level).toBe('component');
    expect(schema.version).toBe(
      'https://blueprint.mzworthington.co.uk/schemas/v3/blueprint.schema.json'
    );
    expect(schema.nodes).toHaveLength(1);
    expect(schema.nodes[0].entityRef).toBe('blueprint/app/cli/api');
  });

  it('should parse both legacy object-root and sequence-root YAML', () => {
    const legacy = `
entityRef: demo
name: Demo System
version: 1.0.0
level: container
nodes:
  - entityRef: UserApi
    type: grpc-service
    name: User API
`;
    const modern = `
- entityRef: demo
  name: Demo System
  version: 1.0.0
  level: container
  nodes:
    - entityRef: UserApi
      type: grpc-service
      name: User API
`;
    expect(parseSchemaFromYaml(legacy).entityRef).toBe('demo');
    expect(parseSchemaFromYaml(modern).entityRef).toBe('demo');
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

  it('should accept container node type from CLI-generated schemas', () => {
    const yamlContent = `
name: Generated System
version: 1.0.0
level: container
nodes:
  - entityRef: core
    type: container
    name: Core Service
`;
    const schema = parseSchemaFromYaml(yamlContent);
    expect(schema.nodes[0].type).toBe('container');
  });

  describe('C4 Model Validation & Serialization Extensions', () => {
    it('should parse C4 properties from valid YAML schema', () => {
      const yamlContent = `
name: High-Level System Context
version: 1.0.0
level: context
entityRef: billing
nodes:
  - entityRef: billing/billing-service
    type: microservice
    name: Billing Service
  - entityRef: billing/payment-gateway
    type: software-system
    name: External Payment Processor
    external: true
dependencies:
  - from: billing/billing-service
    to: billing/payment-gateway
    type: direct-call
    description: Authorize Credit Card
`;
      const schema = parseSchemaFromYaml(yamlContent);
      expect(schema.level).toBe('context');
      expect(schema.entityRef).toBe('billing');
      expect(schema.nodes).toHaveLength(2);
      expect(schema.nodes[0].entityRef).toBe('billing/billing-service');
      expect(schema.nodes[0].type).toBe('microservice');
      expect(schema.nodes[1].external).toBe(true);
      expect(schema.dependencies[0].description).toBe('Authorize Credit Card');
    });

    it('should accept legacy schema id alias when it is a valid entityRef', () => {
      const yamlContent = `
name: Legacy Alias
version: 1.0.0
level: container
id: billing/web-app
nodes: []
`;
      const schema = parseSchemaFromYaml(yamlContent);
      expect(schema.entityRef).toBe('billing/web-app');
    });

    it('should reject path-style schema identity', () => {
      const invalidYaml = `
name: Bad Path Id
version: 1.0.0
level: context
entityRef: ../root-workspace.yaml
nodes: []
`;
      expect(() => parseSchemaFromYaml(invalidYaml)).toThrow(/entityRef/);
    });

    it('should serialize C4 properties to valid YAML and Mermaid', () => {
      const schema: SystemSchema = {
        name: 'Workspace Level',
        version: '1.2.0',
        level: 'container',
        entityRef: 'billing/web-portal',
        nodes: [
          {
            entityRef: 'billing/web-portal/webapp',
            type: 'web-app',
            name: 'Web Portal',
          },
          {
            entityRef: 'billing/web-portal/external_svc',
            type: 'software-system',
            name: 'API Service',
            external: true,
          },
        ],
        dependencies: [
          {
            from: 'billing/web-portal/webapp',
            to: 'billing/web-portal/external_svc',
            type: 'direct-call',
            description: 'Hits Endpoint',
          },
        ],
      };

      const yamlContent = serializeSchemaToYaml(schema);
      expect(yamlContent).toContain('level: container');
      expect(yamlContent).toContain('entityRef: billing/web-portal');
      expect(yamlContent).toContain('external: true');

      const mermaid = serializeSchemaToMermaid(schema);
      expect(mermaid).toContain('node_billing_web_portal_webapp["Web Portal"]');
      expect(mermaid).toContain('node_billing_web_portal_external_svc["API Service (External)"]');
    });

    it('should parse and round-trip node forensics', () => {
      const yamlContent = `
name: Forensic Component Graph
version: 1.0.0
level: component
entityRef: blueprint/cli/forensics
nodes:
  - entityRef: blueprint/cli/forensics/analyzer
    type: component
    name: Analyzer
    properties:
      filepath: src/analyzer.ts
    forensics:
      complexity: 20
      loc: 100
      sloc: 80
      churn: 12
      authorCount: 2
      topAuthorPercent: 0.75
      hotspotScore: 0.9
      sinceDays: 90
      classifications:
        - hotspot
      coupledFiles:
        - path: src/other.ts
          score: 0.8
          sharedCommits: 6
      fileCount: 1
      hotspotCount: 1
      knowledgeSiloCount: 0
`;
      const schema = parseSchemaFromYaml(yamlContent);
      expect(schema.nodes[0].forensics).toMatchObject({
        complexity: 20,
        churn: 12,
        hotspotScore: 0.9,
        sinceDays: 90,
        classifications: ['hotspot'],
        coupledFiles: [{ path: 'src/other.ts', score: 0.8, sharedCommits: 6 }],
      });

      const roundTrip = parseSchemaFromYaml(serializeSchemaToYaml(schema));
      expect(roundTrip.nodes[0].forensics).toEqual(schema.nodes[0].forensics);
    });

    it('should reject invalid forensics classifications', () => {
      const invalidYaml = `
name: Bad Forensics
version: 1.0.0
level: component
nodes:
  - entityRef: a/b/c
    type: component
    name: Bad
    forensics:
      classifications:
        - not-a-class
`;
      expect(() => parseSchemaFromYaml(invalidYaml)).toThrow();
    });
  });
});
