import { describe, it, expect } from 'vitest';
import { parsePulumiToSchema, parsePulumiBatchToSchema } from './pulumiImport';

describe('parsePulumiToSchema — YAML', () => {
  it('maps a single lambda resource to a scoped node', () => {
    const yaml = `
name: api-stack
runtime: yaml
resources:
  api:
    type: aws:lambda:Function
    properties:
      functionName: api
      role: \${lambdaRole.arn}
  lambdaRole:
    type: aws:iam:Role
    properties:
      assumeRolePolicy: "{}"
`;
    const result = parsePulumiToSchema(yaml, {
      targetLevel: 'container',
      parentEntityRef: 'acme/platform',
    });

    expect(result.format).toBe('yaml');
    expect(result.schema.level).toBe('container');
    expect(result.schema.entityRef).toBe('acme/platform');
    const node = result.schema.nodes.find(
      n => n.entityRef === 'acme/platform/aws-lambda-function-api'
    );
    expect(node).toMatchObject({
      name: 'api',
      type: 'serverless-function',
      external: false,
      properties: {
        'iac.address': 'aws:lambda:Function.api',
        'iac.provider_type': 'aws_lambda_function',
        'iac.kind': 'resource',
      },
    });
  });

  it('creates an edge from a property reference', () => {
    const yaml = `
name: api-stack
runtime: yaml
resources:
  lambdaRole:
    type: aws:iam:Role
    properties:
      assumeRolePolicy: "{}"
  api:
    type: aws:lambda:Function
    properties:
      functionName: api
      role: \${lambdaRole.arn}
`;
    const result = parsePulumiToSchema(yaml, {
      targetLevel: 'container',
      parentEntityRef: 'acme/platform',
    });

    expect(result.schema.dependencies).toContainEqual(
      expect.objectContaining({
        from: 'acme/platform/aws-lambda-function-api',
        to: 'acme/platform/aws-iam-role-lambdarole',
        type: 'direct-call',
      })
    );
  });

  it('creates an edge from dependsOn in options', () => {
    const yaml = `
name: api-stack
runtime: yaml
resources:
  lambdaRole:
    type: aws:iam:Role
    properties:
      assumeRolePolicy: "{}"
  api:
    type: aws:lambda:Function
    options:
      dependsOn:
        - \${lambdaRole}
    properties:
      functionName: api
`;
    const result = parsePulumiToSchema(yaml, {
      targetLevel: 'container',
      parentEntityRef: 'acme/platform',
    });

    expect(result.schema.dependencies).toContainEqual(
      expect.objectContaining({
        from: 'acme/platform/aws-lambda-function-api',
        to: 'acme/platform/aws-iam-role-lambdarole',
        type: 'direct-call',
      })
    );
  });

  it('marks get resources as external data sources', () => {
    const yaml = `
name: stack
runtime: yaml
resources:
  existingBucket:
    type: aws:s3:Bucket
    get:
      id: my-bucket
`;
    const result = parsePulumiToSchema(yaml, { targetLevel: 'container' });
    const node = result.schema.nodes[0];
    expect(node.external).toBe(true);
    expect(node.properties?.['iac.kind']).toBe('data');
    expect(node.properties?.['iac.address']).toBe('aws:s3:Bucket.existingBucket');
  });

  it('warns and defaults unknown resource types', () => {
    const yaml = `
name: stack
runtime: yaml
resources:
  assets:
    type: aws:s3:Bucket
    properties:
      bucket: assets
`;
    const result = parsePulumiToSchema(yaml, { targetLevel: 'container' });
    expect(result.schema.nodes[0].type).toBe('container');
    expect(result.warnings.some(w => w.includes('unknown-resource-type:aws_s3_bucket'))).toBe(true);
  });

  it('warns on unresolved refs without failing', () => {
    const yaml = `
name: stack
runtime: yaml
resources:
  api:
    type: aws:lambda:Function
    properties:
      role: \${missingRole.arn}
`;
    const result = parsePulumiToSchema(yaml, {
      targetLevel: 'container',
      parentEntityRef: 'acme/platform',
    });
    expect(result.schema.nodes).toHaveLength(1);
    expect(result.schema.dependencies).toHaveLength(0);
    expect(result.warnings.some(w => w.includes('unresolved-ref'))).toBe(true);
  });

  it('returns empty schema for project metadata only', () => {
    const yaml = `
name: empty
runtime: nodejs
description: No resources yet
`;
    const result = parsePulumiToSchema(yaml, { targetLevel: 'container' });
    expect(result.schema.nodes).toHaveLength(0);
    expect(result.schema.dependencies).toHaveLength(0);
  });

  it('throws on invalid YAML', () => {
    expect(() =>
      parsePulumiToSchema('resources:\n  bad: [unclosed', { targetLevel: 'container' })
    ).toThrow();
  });
});

describe('parsePulumiToSchema — TypeScript', () => {
  it('maps new aws resources from TypeScript source', () => {
    const ts = `
import * as aws from "@pulumi/aws";

const lambdaRole = new aws.iam.Role("lambda", {
  assumeRolePolicy: "{}",
});

const api = new aws.lambda.Function("api", {
  functionName: "api",
  role: lambdaRole.arn,
});
`;
    const result = parsePulumiToSchema(ts, {
      targetLevel: 'container',
      parentEntityRef: 'acme/platform',
      sourceFormat: 'typescript',
    });

    expect(result.format).toBe('typescript');
    const lambda = result.schema.nodes.find(
      n => n.properties?.['iac.address'] === 'aws:lambda:Function.api'
    );
    expect(lambda).toMatchObject({
      type: 'serverless-function',
      name: 'api',
    });
    expect(result.schema.dependencies).toContainEqual(
      expect.objectContaining({
        from: 'acme/platform/aws-lambda-function-api',
        to: 'acme/platform/aws-iam-role-lambda',
        type: 'direct-call',
      })
    );
  });
});

describe('parsePulumiBatchToSchema', () => {
  it('merges resources across files and resolves cross-file refs', () => {
    const result = parsePulumiBatchToSchema(
      [
        {
          path: 'network.yaml',
          content: `
name: net
runtime: yaml
resources:
  vpc:
    type: aws:ec2:Vpc
    properties:
      cidrBlock: 10.0.0.0/16
`,
        },
        {
          path: 'compute.yaml',
          content: `
name: compute
runtime: yaml
resources:
  subnet:
    type: aws:ec2:Subnet
    properties:
      vpcId: \${vpc.id}
      cidrBlock: 10.0.1.0/24
`,
        },
      ],
      { targetLevel: 'container', parentEntityRef: 'acme/platform' }
    );

    expect(result.schema.nodes).toHaveLength(2);
    expect(result.schema.dependencies).toContainEqual(
      expect.objectContaining({
        from: 'acme/platform/aws-ec2-subnet-subnet',
        to: 'acme/platform/aws-ec2-vpc-vpc',
        type: 'direct-call',
      })
    );
  });

  it('fails on duplicate addresses across files', () => {
    expect(() =>
      parsePulumiBatchToSchema(
        [
          {
            path: 'a.yaml',
            content: `
name: a
runtime: yaml
resources:
  vpc:
    type: aws:ec2:Vpc
    properties:
      cidrBlock: 10.0.0.0/16
`,
          },
          {
            path: 'b.yaml',
            content: `
name: b
runtime: yaml
resources:
  vpc:
    type: aws:ec2:Vpc
    properties:
      cidrBlock: 10.1.0.0/16
`,
          },
        ],
        { targetLevel: 'container' }
      )
    ).toThrow(/duplicate-address/i);
  });
});
