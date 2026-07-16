import { execFile } from 'child_process';
import path from 'path';
import { promisify } from 'util';
import { throwIfAborted } from '../../analysis/domain/cancellation.ts';
import type { ForensicsOptions } from '../domain/options.ts';
import type { GitHistoryPort } from '../domain/ports.ts';
import type { GitCommit } from '../domain/types.ts';

const execFileAsync = promisify(execFile);

/** Record separator keeps path lists unambiguous across commits. */
const RECORD_SEP = '\x1e';

export type ExecFileFn = (
  file: string,
  args: readonly string[],
  options: { cwd: string; maxBuffer: number; encoding: 'utf8' }
) => Promise<{ stdout: string; stderr: string }>;

export function parseGitLogOutput(stdout: string): GitCommit[] {
  const commits: GitCommit[] = [];
  const records = stdout.split(RECORD_SEP).filter(r => r.length > 0);

  for (const record of records) {
    const lines = record.replace(/^\n+/, '').split('\n');
    if (lines.length < 4) continue;
    const hash = lines[0]!.trim();
    const authorEmail = lines[1]!.trim();
    const authorName = lines[2]!.trim();
    const authorDateRaw = lines[3]!.trim();
    if (!hash || !authorEmail || !authorDateRaw) continue;

    const paths: string[] = [];
    for (let i = 4; i < lines.length; i++) {
      const line = lines[i]!.trim().replace(/\\/g, '/');
      if (!line) continue;
      paths.push(line);
    }

    commits.push({
      hash,
      authorEmail,
      authorName,
      authorDate: new Date(authorDateRaw),
      paths,
    });
  }

  return commits;
}

/** Map git-root-relative paths onto the analysis rootPath. Drops paths outside the scan root. */
export function relativizeCommitPaths(
  commits: readonly GitCommit[],
  gitRoot: string,
  rootPath: string
): GitCommit[] {
  return commits.map(commit => {
    const paths: string[] = [];
    for (const gitRel of commit.paths) {
      const absolute = path.resolve(gitRoot, gitRel);
      const rel = path.relative(rootPath, absolute).replace(/\\/g, '/');
      if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) continue;
      paths.push(rel);
    }
    return { ...commit, paths };
  });
}

export class GitLogHistoryAdapter implements GitHistoryPort {
  constructor(private readonly execFileFn: ExecFileFn = execFileAsync as ExecFileFn) {}

  async loadHistory(
    rootPath: string,
    options: Pick<ForensicsOptions, 'sinceDays'>,
    signal?: AbortSignal
  ): Promise<GitCommit[]> {
    throwIfAborted(signal);

    try {
      const { stdout: toplevel } = await this.execFileFn('git', ['rev-parse', '--show-toplevel'], {
        cwd: rootPath,
        maxBuffer: 1024 * 1024,
        encoding: 'utf8',
      });
      const gitRoot = toplevel.trim();

      const args = [
        'log',
        '--no-merges',
        `--since=${options.sinceDays}.days`,
        `--pretty=format:${RECORD_SEP}%H%n%ae%n%an%n%aI`,
        '--name-only',
      ];

      const { stdout } = await this.execFileFn('git', args, {
        cwd: gitRoot,
        maxBuffer: 64 * 1024 * 1024,
        encoding: 'utf8',
      });
      throwIfAborted(signal);
      return relativizeCommitPaths(parseGitLogOutput(stdout), gitRoot, rootPath);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to read git history at ${rootPath}: ${message}`);
    }
  }
}
