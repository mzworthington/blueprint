import { execFile } from 'child_process';
import path from 'path';
import { promisify } from 'util';
import type { SourceProvenance } from '@blueprint/core';
import { normalizeGitRemoteUrl } from '@blueprint/core';

const execFileAsync = promisify(execFile);

export type GitExecFn = (
  file: string,
  args: readonly string[],
  options: { cwd: string; maxBuffer: number; encoding: 'utf8' }
) => Promise<{ stdout: string; stderr: string }>;

async function runGit(execFile: GitExecFn, args: readonly string[], cwd: string): Promise<string> {
  const { stdout } = await execFile('git', args, {
    cwd,
    maxBuffer: 1024 * 1024,
    encoding: 'utf8',
  });
  return stdout.trim();
}

/**
 * Capture git remote, branch, commit, and scan-root offset for YAML `metaData.source`.
 * Returns undefined when `cwd` is not inside a git work tree.
 */
export async function collectGitProvenance(
  cwd: string,
  execFileFn: GitExecFn = execFileAsync as GitExecFn
): Promise<SourceProvenance | undefined> {
  const execFile = execFileFn;

  const resolvedCwd = path.resolve(cwd);

  try {
    const gitRoot = await runGit(execFile, ['rev-parse', '--show-toplevel'], resolvedCwd);
    const scanRootRel = path.relative(gitRoot, resolvedCwd).replace(/\\/g, '/');
    const scanRoot = !scanRootRel || scanRootRel === '' ? '.' : scanRootRel;

    let remoteUrl: string | undefined;
    try {
      const rawRemote = await runGit(execFile, ['remote', 'get-url', 'origin'], gitRoot);
      remoteUrl = normalizeGitRemoteUrl(rawRemote);
    } catch {
      // origin may be unset
    }

    let defaultBranch: string | undefined;
    try {
      const originHead = await runGit(
        execFile,
        ['symbolic-ref', '--short', 'refs/remotes/origin/HEAD'],
        gitRoot
      );
      defaultBranch = originHead.replace(/^origin\//, '');
    } catch {
      try {
        defaultBranch = await runGit(execFile, ['branch', '--show-current'], gitRoot);
      } catch {
        // detached HEAD or empty repo
      }
    }

    const scannedAtCommit = await runGit(execFile, ['rev-parse', 'HEAD'], gitRoot);

    const provenance: SourceProvenance = {
      scannedAtCommit,
      scanRoot,
    };
    if (remoteUrl) provenance.remoteUrl = remoteUrl;
    if (defaultBranch) provenance.defaultBranch = defaultBranch;

    return provenance;
  } catch {
    return undefined;
  }
}
