import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { discoverPulumiRoots } from './pulumiDiscovery.ts';
import { MockFileSystem } from '../../test/fakes.ts';

describe('discoverPulumiRoots', () => {
  it('finds a project with Pulumi.yaml and yaml resources', () => {
    const fs = new MockFileSystem();
    const scan = path.resolve('/repo');
    const infra = path.resolve('/repo/infra');
    fs.existingFiles.add(scan);
    fs.directories.set(scan, ['infra']);
    fs.directories.set(infra, ['Pulumi.yaml']);
    fs.textFiles.set(
      path.resolve('/repo/infra/Pulumi.yaml'),
      `
name: infra
runtime: yaml
resources:
  bucket:
    type: aws:s3:Bucket
`
    );
    fs.existingFiles.add(path.resolve('/repo/infra/Pulumi.yaml'));

    const roots = discoverPulumiRoots(scan, fs);
    expect(roots).toHaveLength(1);
    expect(roots[0]).toMatchObject({
      rootPath: infra,
      systemId: 'infra',
      runtime: 'yaml',
    });
    expect(roots[0].filePaths).toContain(path.resolve('/repo/infra/Pulumi.yaml'));
  });

  it('collects TypeScript sources for nodejs runtime', () => {
    const fs = new MockFileSystem();
    const scan = path.resolve('/repo');
    const project = path.resolve('/repo/iac');
    fs.existingFiles.add(scan);
    fs.directories.set(scan, ['iac']);
    fs.directories.set(project, ['Pulumi.yaml', 'index.ts', 'Pulumi.dev.yaml']);
    fs.textFiles.set(
      path.resolve('/repo/iac/Pulumi.yaml'),
      `
name: iac
runtime: nodejs
`
    );
    fs.existingFiles.add(path.resolve('/repo/iac/Pulumi.yaml'));
    fs.existingFiles.add(path.resolve('/repo/iac/index.ts'));

    const roots = discoverPulumiRoots(scan, fs);
    expect(roots).toHaveLength(1);
    expect(roots[0].runtime).toBe('nodejs');
    expect(roots[0].filePaths).toContain(path.resolve('/repo/iac/index.ts'));
    expect(roots[0].filePaths).not.toContain(path.resolve('/repo/iac/Pulumi.dev.yaml'));
  });

  it('skips nested projects under an outer root', () => {
    const fs = new MockFileSystem();
    const scan = path.resolve('/repo');
    const outer = path.resolve('/repo/platform');
    const inner = path.resolve('/repo/platform/modules/net');
    fs.existingFiles.add(scan);
    fs.directories.set(scan, ['platform']);
    fs.directories.set(outer, ['Pulumi.yaml', 'modules']);
    fs.directories.set(path.resolve('/repo/platform/modules'), ['net']);
    fs.directories.set(inner, ['Pulumi.yaml']);
    fs.textFiles.set(path.resolve('/repo/platform/Pulumi.yaml'), 'name: platform\nruntime: yaml\n');
    fs.textFiles.set(
      path.resolve('/repo/platform/modules/net/Pulumi.yaml'),
      'name: net\nruntime: yaml\n'
    );
    fs.existingFiles.add(path.resolve('/repo/platform/Pulumi.yaml'));
    fs.existingFiles.add(path.resolve('/repo/platform/modules/net/Pulumi.yaml'));

    const roots = discoverPulumiRoots(scan, fs);
    expect(roots).toHaveLength(1);
    expect(roots[0].rootPath).toBe(outer);
  });

  it('returns empty when no Pulumi projects exist', () => {
    const fs = new MockFileSystem();
    const scan = path.resolve('/repo');
    fs.existingFiles.add(scan);
    fs.directories.set(scan, ['src']);
    fs.directories.set(path.resolve('/repo/src'), []);

    expect(discoverPulumiRoots(scan, fs)).toEqual([]);
  });
});
