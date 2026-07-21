import { describe, it, expect } from 'vitest';
import { collectGitProvenance, type GitExecFn } from './gitProvenance.ts';

function createExecMock(responses: Record<string, string>): GitExecFn {
  return async (_file, args) => {
    const key = args.join(' ');
    const stdout = responses[key];
    if (stdout === undefined) {
      throw new Error(`unexpected git ${key}`);
    }
    return { stdout, stderr: '' };
  };
}

describe('collectGitProvenance', () => {
  it('collects remote, branch, commit, and scanRoot offset', async () => {
    const exec = createExecMock({
      'rev-parse --show-toplevel': '/repo\n',
      'remote get-url origin': 'git@github.com:org/repo.git\n',
      'branch --show-current': 'main\n',
      'rev-parse HEAD': 'abc123def456\n',
    });
    const withGit: GitExecFn = async (_file, args) => {
      const key = args.join(' ');
      if (key === 'symbolic-ref --short refs/remotes/origin/HEAD') {
        throw new Error('no origin HEAD');
      }
      return exec(_file, args);
    };

    const result = await collectGitProvenance('/repo/app', withGit);

    expect(result).toEqual({
      remoteUrl: 'https://github.com/org/repo',
      defaultBranch: 'main',
      scannedAtCommit: 'abc123def456',
      scanRoot: 'app',
    });
  });

  it('returns undefined when not inside a git repository', async () => {
    const exec: GitExecFn = async () => {
      throw new Error('not a git repository');
    };

    expect(await collectGitProvenance('/tmp/project', exec)).toBeUndefined();
  });

  it('omits remoteUrl when origin is not configured', async () => {
    const exec = createExecMock({
      'rev-parse --show-toplevel': '/repo\n',
      'rev-parse HEAD': 'deadbeef\n',
    });
    const failingOrigin: GitExecFn = async (_file, args) => {
      const key = args.join(' ');
      if (key === 'remote get-url origin') throw new Error('No such remote');
      if (key === 'symbolic-ref --short refs/remotes/origin/HEAD') {
        throw new Error('no origin HEAD');
      }
      return exec(_file, args);
    };

    const result = await collectGitProvenance('/repo', failingOrigin);

    expect(result).toEqual({
      scannedAtCommit: 'deadbeef',
      scanRoot: '.',
    });
  });
});
