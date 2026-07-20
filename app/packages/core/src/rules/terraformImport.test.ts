import { describe, it, expect } from 'vitest';
import {
  parseTerraformToSchema,
  parseTerraformBatchToSchema,
  extractTerraformFromMarkdown,
} from './terraformImport';

describe('parseTerraformToSchema — HCL resources', () => {
  it('maps a single lambda resource to a scoped node', () => {
    const hcl = `
resource "aws_lambda_function" "api" {
  function_name = "api"
  handler       = "index.handler"
  runtime       = "nodejs20.x"
  role          = aws_iam_role.lambda.arn
}
`;
    const result = parseTerraformToSchema(hcl, {
      targetLevel: 'container',
      parentEntityRef: 'acme/platform',
    });

    expect(result.format).toBe('hcl');
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
        'iac.address': 'aws_lambda_function.api',
        'iac.provider_type': 'aws_lambda_function',
        'iac.kind': 'resource',
      },
    });
  });

  it('creates an edge from depends_on', () => {
    const hcl = `
resource "aws_iam_role" "lambda" {
  name = "lambda"
}

resource "aws_lambda_function" "api" {
  function_name = "api"
  role          = "arn:aws:iam::123:role/lambda"
  depends_on    = [aws_iam_role.lambda]
}
`;
    const result = parseTerraformToSchema(hcl, {
      targetLevel: 'container',
      parentEntityRef: 'acme/platform',
    });

    expect(result.schema.dependencies).toContainEqual(
      expect.objectContaining({
        from: 'acme/platform/aws-lambda-function-api',
        to: 'acme/platform/aws-iam-role-lambda',
        type: 'direct-call',
      })
    );
  });

  it('creates an edge from an attribute reference', () => {
    const hcl = `
resource "aws_iam_role" "lambda" {
  name = "lambda"
}

resource "aws_lambda_function" "api" {
  function_name = "api"
  role          = aws_iam_role.lambda.arn
}
`;
    const result = parseTerraformToSchema(hcl, {
      targetLevel: 'container',
      parentEntityRef: 'acme/platform',
    });

    expect(result.schema.dependencies).toContainEqual(
      expect.objectContaining({
        from: 'acme/platform/aws-lambda-function-api',
        to: 'acme/platform/aws-iam-role-lambda',
        type: 'direct-call',
      })
    );
  });

  it('marks data sources as external', () => {
    const hcl = `
data "aws_ami" "ubuntu" {
  most_recent = true
}
`;
    const result = parseTerraformToSchema(hcl, { targetLevel: 'container' });
    const node = result.schema.nodes[0];
    expect(node.external).toBe(true);
    expect(node.properties?.['iac.kind']).toBe('data');
    expect(node.properties?.['iac.address']).toBe('data.aws_ami.ubuntu');
  });

  it('marks remote modules as external', () => {
    const hcl = `
module "vpc" {
  source = "terraform-aws-modules/vpc/aws"
}
`;
    const result = parseTerraformToSchema(hcl, { targetLevel: 'container' });
    expect(result.schema.nodes[0]).toMatchObject({
      external: true,
      type: 'container',
      properties: {
        'iac.kind': 'module',
        'iac.address': 'module.vpc',
        'iac.source': 'terraform-aws-modules/vpc/aws',
      },
    });
  });

  it('marks local modules as non-external', () => {
    const hcl = `
module "network" {
  source = "./modules/network"
}
`;
    const result = parseTerraformToSchema(hcl, { targetLevel: 'container' });
    expect(result.schema.nodes[0].external).toBe(false);
    expect(result.schema.nodes[0].properties?.['iac.kind']).toBe('module');
  });

  it('warns and defaults unknown resource types', () => {
    const hcl = `
resource "aws_s3_bucket" "assets" {
  bucket = "assets"
}
`;
    const result = parseTerraformToSchema(hcl, { targetLevel: 'container' });
    expect(result.schema.nodes[0].type).toBe('container');
    expect(result.warnings.some(w => w.includes('unknown-resource-type:aws_s3_bucket'))).toBe(true);
  });

  it('warns on unresolved refs without failing', () => {
    const hcl = `
resource "aws_lambda_function" "api" {
  function_name = "api"
  role          = aws_iam_role.missing.arn
}
`;
    const result = parseTerraformToSchema(hcl, {
      targetLevel: 'container',
      parentEntityRef: 'acme/platform',
    });
    expect(result.schema.nodes).toHaveLength(1);
    expect(result.schema.dependencies).toHaveLength(0);
    expect(result.warnings.some(w => w.includes('unresolved-ref'))).toBe(true);
  });

  it('emits one representative node for for_each', () => {
    const hcl = `
resource "aws_subnet" "private" {
  for_each = toset(["a", "b"])
  cidr_block = "10.0.0.0/24"
}
`;
    const result = parseTerraformToSchema(hcl, { targetLevel: 'container' });
    expect(result.schema.nodes).toHaveLength(1);
    expect(result.schema.nodes[0].properties?.['iac.address']).toBe('aws_subnet.private');
    expect(result.warnings.some(w => /for_each|count/i.test(w))).toBe(true);
  });

  it('returns empty schema for provider-only files', () => {
    const hcl = `
terraform {
  required_version = ">= 1.0"
}

provider "aws" {
  region = "eu-west-1"
}
`;
    const result = parseTerraformToSchema(hcl, { targetLevel: 'container' });
    expect(result.schema.nodes).toHaveLength(0);
    expect(result.schema.dependencies).toHaveLength(0);
  });

  it('throws on invalid HCL', () => {
    expect(() =>
      parseTerraformToSchema('resource "aws_vpc" "main" {', { targetLevel: 'container' })
    ).toThrow();
  });
});

describe('parseTerraformToSchema — JSON', () => {
  it('maps .tf.json resources like HCL', () => {
    const json = JSON.stringify({
      resource: {
        aws_dynamodb_table: {
          orders: {
            name: 'orders',
            hash_key: 'id',
          },
        },
      },
    });
    const result = parseTerraformToSchema(json, {
      targetLevel: 'container',
      parentEntityRef: 'acme/platform',
      sourceFormat: 'json',
    });
    expect(result.format).toBe('json');
    const node = result.schema.nodes[0];
    expect(node.type).toBe('database');
    expect(node.properties?.['iac.provider_type']).toBe('aws_dynamodb_table');
    expect(node.entityRef).toBe('acme/platform/aws-dynamodb-table-orders');
  });
});

describe('parseTerraformBatchToSchema', () => {
  it('merges resources across files and resolves cross-file refs', () => {
    const result = parseTerraformBatchToSchema(
      [
        {
          path: 'a.tf',
          content: `
resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
}
`,
        },
        {
          path: 'b.tf',
          content: `
resource "aws_subnet" "private" {
  vpc_id     = aws_vpc.main.id
  cidr_block = "10.0.1.0/24"
}
`,
        },
      ],
      { targetLevel: 'container', parentEntityRef: 'acme/platform' }
    );

    expect(result.schema.nodes).toHaveLength(2);
    expect(result.schema.dependencies).toContainEqual(
      expect.objectContaining({
        from: 'acme/platform/aws-subnet-private',
        to: 'acme/platform/aws-vpc-main',
        type: 'direct-call',
      })
    );
  });

  it('fails on duplicate addresses across files', () => {
    expect(() =>
      parseTerraformBatchToSchema(
        [
          {
            path: 'a.tf',
            content: `resource "aws_vpc" "main" { cidr_block = "10.0.0.0/16" }`,
          },
          {
            path: 'b.tf',
            content: `resource "aws_vpc" "main" { cidr_block = "10.1.0.0/16" }`,
          },
        ],
        { targetLevel: 'container' }
      )
    ).toThrow(/duplicate-address/i);
  });
});

describe('extractTerraformFromMarkdown', () => {
  it('extracts the first hcl/tf/terraform fenced block', () => {
    const md = `# Title

Some text.

\`\`\`hcl
resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
}
\`\`\`

More text.`;

    expect(extractTerraformFromMarkdown(md)).toContain('aws_vpc');
    expect(extractTerraformFromMarkdown(md)).toContain('cidr_block');
  });

  it('accepts bare fences and tf/terraform language tags', () => {
    expect(extractTerraformFromMarkdown('```\nfoo = "bar"\n```')).toBe('foo = "bar"');
    expect(extractTerraformFromMarkdown('```tf\nfoo = "bar"\n```')).toBe('foo = "bar"');
    expect(extractTerraformFromMarkdown('```terraform\nfoo = "bar"\n```')).toBe('foo = "bar"');
  });

  it('returns trimmed input when no fence is found', () => {
    expect(extractTerraformFromMarkdown('  resource "aws_vpc" "main" {}\n')).toBe(
      'resource "aws_vpc" "main" {}'
    );
  });
});
