import { describe, it, expect } from 'vitest';
import {
  normalizeGitRemoteUrl,
  resolveRepoRelativeFilePath,
  buildSourceFileUrl,
} from './sourceProvenance';
import type { SourceProvenance } from '../models/schema';

describe('normalizeGitRemoteUrl', () => {
  it('converts SCP-style git@ URLs to HTTPS', () => {
    expect(normalizeGitRemoteUrl('git@github.com:org/repo.git')).toBe(
      'https://github.com/org/repo'
    );
  });

  it('strips .git suffix from HTTPS remotes', () => {
    expect(normalizeGitRemoteUrl('https://github.com/org/repo.git')).toBe(
      'https://github.com/org/repo'
    );
  });

  it('returns undefined for empty input', () => {
    expect(normalizeGitRemoteUrl('')).toBeUndefined();
    expect(normalizeGitRemoteUrl('   ')).toBeUndefined();
  });
});

describe('resolveRepoRelativeFilePath', () => {
  it('joins scanRoot with node filepath when scan root is a subdirectory', () => {
    const source: SourceProvenance = { scanRoot: 'app' };
    expect(resolveRepoRelativeFilePath(source, 'packages/cli/foo.ts')).toBe(
      'app/packages/cli/foo.ts'
    );
  });

  it('returns filepath unchanged when scanRoot is root', () => {
    const source: SourceProvenance = { scanRoot: '.' };
    expect(resolveRepoRelativeFilePath(source, 'src/index.ts')).toBe('src/index.ts');
  });
});

describe('buildSourceFileUrl', () => {
  const githubSource: SourceProvenance = {
    remoteUrl: 'https://github.com/org/repo',
    scannedAtCommit: 'abc123def',
    scanRoot: '.',
  };

  it('builds a GitHub blob URL pinned to scannedAtCommit', () => {
    expect(buildSourceFileUrl(githubSource, 'src/index.ts')).toBe(
      'https://github.com/org/repo/blob/abc123def/src/index.ts'
    );
  });

  it('builds a GitLab blob URL', () => {
    const gitlab: SourceProvenance = {
      remoteUrl: 'https://gitlab.com/org/repo',
      defaultBranch: 'main',
      scanRoot: '.',
    };
    expect(buildSourceFileUrl(gitlab, 'src/index.ts')).toBe(
      'https://gitlab.com/org/repo/-/blob/main/src/index.ts'
    );
  });

  it('returns undefined when remoteUrl is missing', () => {
    expect(buildSourceFileUrl({ scannedAtCommit: 'abc' }, 'src/a.ts')).toBeUndefined();
  });
});
