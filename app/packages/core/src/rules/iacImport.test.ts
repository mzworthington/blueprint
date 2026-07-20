import { describe, it, expect } from 'vitest';
import {
  detectIacSourceKind,
  parseIacBatchToSchema,
  parseIacToSchema,
  vendorForKind,
} from './iacImport';

describe('detectIacSourceKind', () => {
  it('detects terraform hcl from path and content', () => {
    expect(detectIacSourceKind('main.tf', 'resource "aws_s3_bucket" "x" {}')).toBe('terraform-hcl');
  });

  it('detects pulumi yaml from project file name', () => {
    expect(detectIacSourceKind('Pulumi.yaml', 'name: stack\nruntime: yaml')).toBe('pulumi-yaml');
  });

  it('detects pulumi typescript from imports', () => {
    expect(
      detectIacSourceKind(
        'index.ts',
        'import * as aws from "@pulumi/aws";\nnew aws.lambda.Function("api", {});'
      )
    ).toBe('pulumi-typescript');
  });
});

describe('parseIacToSchema', () => {
  it('parses terraform hcl through the unified entrypoint', () => {
    const hcl = `
resource "aws_lambda_function" "api" {
  function_name = "api"
}
`;
    const result = parseIacToSchema(hcl, 'main.tf', {
      targetLevel: 'container',
      parentEntityRef: 'infra/prod',
    });

    expect(result.vendor).toBe('terraform');
    expect(result.format).toBe('hcl');
    expect(result.schema.nodes.some(n => n.type === 'serverless-function')).toBe(true);
  });

  it('parses pulumi yaml through the unified entrypoint', () => {
    const yaml = `
name: api-stack
runtime: yaml
resources:
  api:
    type: aws:lambda:Function
    properties:
      functionName: api
`;
    const result = parseIacToSchema(yaml, 'Pulumi.yaml', {
      targetLevel: 'container',
      parentEntityRef: 'infra/prod',
    });

    expect(result.vendor).toBe('pulumi');
    expect(result.format).toBe('yaml');
    expect(result.schema.nodes.some(n => n.type === 'serverless-function')).toBe(true);
  });
});

describe('parseIacBatchToSchema', () => {
  it('merges multiple terraform files', () => {
    const result = parseIacBatchToSchema(
      [
        {
          path: 'main.tf',
          content: 'resource "aws_lambda_function" "api" { function_name = "api" }',
        },
        {
          path: 'iam.tf',
          content: 'resource "aws_iam_role" "lambda" { name = "lambda" }',
        },
      ],
      { targetLevel: 'container', parentEntityRef: 'infra/prod' }
    );

    expect(result.vendor).toBe('terraform');
    expect(result.schema.nodes.length).toBe(2);
  });

  it('rejects mixed terraform and pulumi vendors', () => {
    expect(() =>
      parseIacBatchToSchema(
        [
          { path: 'main.tf', content: 'resource "aws_s3_bucket" "x" {}' },
          {
            path: 'Pulumi.yaml',
            content:
              'name: s\nruntime: yaml\nresources:\n  api:\n    type: aws:lambda:Function\n    properties: {}',
          },
        ],
        { targetLevel: 'container' }
      )
    ).toThrow(/mixed-vendor/);
  });
});

describe('vendorForKind', () => {
  it('maps kinds to vendors', () => {
    expect(vendorForKind('terraform-hcl')).toBe('terraform');
    expect(vendorForKind('pulumi-yaml')).toBe('pulumi');
  });
});
