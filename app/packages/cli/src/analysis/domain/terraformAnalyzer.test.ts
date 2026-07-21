import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { parseSchemaFromYaml } from '@blueprint/core';
import { TerraformAnalyzer } from './terraformAnalyzer.ts';
import { MockFileSystem } from '../../test/fakes.ts';

class SilentLogger {
  infos: string[] = [];
  warns: string[] = [];
  info(message: string) {
    this.infos.push(message);
  }
  warn(message: string) {
    this.warns.push(message);
  }
  error() {}
}

describe('TerraformAnalyzer', () => {
  it('parses a terraform root and writes containers.yaml + context node', async () => {
    const fs = new MockFileSystem();
    const scan = path.resolve('/repo');
    const infra = path.resolve('/repo/infra');
    const out = path.resolve('/repo/blueprints');

    fs.existingFiles.add(scan);
    fs.directories.set(scan, ['infra']);
    fs.directories.set(infra, ['main.tf']);
    fs.textFiles.set(
      path.resolve('/repo/infra/main.tf'),
      `
resource "aws_lambda_function" "api" {
  function_name = "api"
  role          = aws_iam_role.lambda.arn
}
resource "aws_iam_role" "lambda" {
  name = "lambda"
}
`
    );
    fs.existingFiles.add(path.resolve('/repo/infra/main.tf'));

    const analyzer = new TerraformAnalyzer({
      fileSystem: fs,
      logger: new SilentLogger(),
    });

    const result = await analyzer.run('Acme', out, { scanRoot: scan });
    expect(result.rootsAnalyzed).toBe(1);

    const containersPath = path.resolve('/repo/blueprints/infra/containers.yaml');
    expect(fs.writtenFiles.has(containersPath)).toBe(true);
    const schema = parseSchemaFromYaml(fs.writtenFiles.get(containersPath)!);
    expect(schema.level).toBe('container');
    expect(schema.entityRef).toBe('acme/infra');
    expect(
      schema.nodes.some(n => n.properties?.['iac.provider_type'] === 'aws_lambda_function')
    ).toBe(true);
    expect(schema.dependencies.length).toBeGreaterThanOrEqual(1);

    const contextPath = path.resolve('/repo/blueprints/context.yaml');
    expect(fs.writtenFiles.has(contextPath)).toBe(true);
    const context = parseSchemaFromYaml(fs.writtenFiles.get(contextPath)!);

    const hub = context.nodes.find(n => n.entityRef === 'acme/infrastructure');
    expect(hub).toMatchObject({
      type: 'group',
      name: 'Infrastructure System',
      properties: expect.objectContaining({
        productId: 'infrastructure',
      }),
    });
    expect(hub?.x).toBeUndefined();
    expect(hub?.y).toBeUndefined();

    const spoke = context.nodes.find(n => n.entityRef === 'acme/infra');
    expect(spoke).toMatchObject({
      parentEntityRef: 'acme/infrastructure',
      properties: expect.objectContaining({
        productId: 'infrastructure',
      }),
    });

    expect(
      context.dependencies.some(d => d.from === 'acme/infrastructure' && d.to === 'acme/infra')
    ).toBe(false);
  });

  it('links multiple terraform roots under one Infrastructure hub', async () => {
    const fs = new MockFileSystem();
    const scan = path.resolve('/repo');
    const a = path.resolve('/repo/stack-a');
    const b = path.resolve('/repo/stack-b');
    const out = path.resolve('/repo/blueprints');

    fs.existingFiles.add(scan);
    fs.directories.set(scan, ['stack-a', 'stack-b']);
    fs.directories.set(a, ['main.tf']);
    fs.directories.set(b, ['main.tf']);
    fs.textFiles.set(path.resolve('/repo/stack-a/main.tf'), `resource "aws_s3_bucket" "a" {}`);
    fs.textFiles.set(path.resolve('/repo/stack-b/main.tf'), `resource "aws_s3_bucket" "b" {}`);
    fs.existingFiles.add(path.resolve('/repo/stack-a/main.tf'));
    fs.existingFiles.add(path.resolve('/repo/stack-b/main.tf'));

    const analyzer = new TerraformAnalyzer({
      fileSystem: fs,
      logger: new SilentLogger(),
    });

    const result = await analyzer.run('Acme', out, { scanRoot: scan });
    expect(result.rootsAnalyzed).toBe(2);

    const context = parseSchemaFromYaml(
      fs.writtenFiles.get(path.resolve('/repo/blueprints/context.yaml'))!
    );
    expect(context.nodes.filter(n => n.properties?.productId === 'infrastructure')).toHaveLength(3);
    expect(context.nodes.filter(n => n.parentEntityRef === 'acme/infrastructure')).toHaveLength(2);
  });

  it('no-ops when no terraform roots exist', async () => {
    const fs = new MockFileSystem();
    const scan = path.resolve('/repo');
    fs.existingFiles.add(scan);
    fs.directories.set(scan, ['src']);
    fs.directories.set(path.resolve('/repo/src'), []);

    const logger = new SilentLogger();
    const analyzer = new TerraformAnalyzer({
      fileSystem: fs,
      logger,
    });

    const result = await analyzer.run('Acme', path.resolve('/repo/blueprints'), {
      scanRoot: scan,
    });
    expect(result.rootsAnalyzed).toBe(0);
    expect(fs.writtenFiles.size).toBe(0);
  });
});
