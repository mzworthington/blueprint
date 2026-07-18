import { describe, expect, it } from 'vitest';
import { discoverTerraformRoots } from './terraformDiscovery.ts';
import { MockFileSystem } from '../../test/fakes.ts';
import path from 'node:path';

describe('discoverTerraformRoots', () => {
  it('finds a root with .tf files and skips nested module dirs', () => {
    const fs = new MockFileSystem();
    const scan = path.resolve('/repo');
    const infra = path.resolve('/repo/infra');
    const modules = path.resolve('/repo/infra/modules/network');

    fs.existingFiles.add(scan);
    fs.directories.set(scan, ['infra', 'src']);
    fs.directories.set(path.resolve('/repo/src'), ['app.ts']);
    fs.directories.set(infra, ['main.tf', 'vars.tf', 'modules']);
    fs.directories.set(path.resolve('/repo/infra/modules'), ['network']);
    fs.directories.set(modules, ['main.tf']);
    fs.existingFiles.add(path.resolve('/repo/infra/main.tf'));
    fs.existingFiles.add(path.resolve('/repo/infra/vars.tf'));
    fs.existingFiles.add(path.resolve('/repo/infra/modules/network/main.tf'));

    const roots = discoverTerraformRoots(scan, fs);
    expect(roots).toHaveLength(1);
    expect(roots[0]?.systemId).toBe('infra');
    expect(roots[0]?.filePaths).toEqual(
      expect.arrayContaining([
        path.resolve('/repo/infra/main.tf'),
        path.resolve('/repo/infra/vars.tf'),
      ])
    );
    expect(roots[0]?.filePaths).not.toContain(path.resolve('/repo/infra/modules/network/main.tf'));
  });

  it('uses infrastructure systemId when scan root itself has .tf files', () => {
    const fs = new MockFileSystem();
    const scan = path.resolve('/tfroot');
    fs.existingFiles.add(scan);
    fs.directories.set(scan, ['main.tf']);
    fs.existingFiles.add(path.resolve('/tfroot/main.tf'));

    const roots = discoverTerraformRoots(scan, fs);
    expect(roots).toHaveLength(1);
    expect(roots[0]?.systemId).toBe('infrastructure');
  });

  it('returns empty when no terraform files exist', () => {
    const fs = new MockFileSystem();
    const scan = path.resolve('/repo');
    fs.existingFiles.add(scan);
    fs.directories.set(scan, ['src']);
    fs.directories.set(path.resolve('/repo/src'), ['app.ts']);

    expect(discoverTerraformRoots(scan, fs)).toEqual([]);
  });
});
