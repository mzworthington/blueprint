import type { SourceProvenance } from '../models/schema';

/** Normalize `git remote` values to an HTTPS repo base URL (no `.git` suffix). */
export function normalizeGitRemoteUrl(raw: string): string | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;

  const scpMatch = /^git@([^:]+):(.+)$/.exec(trimmed);
  if (scpMatch) {
    const host = scpMatch[1];
    const repoPath = scpMatch[2]!.replace(/\.git$/, '').replace(/\/$/, '');
    return `https://${host}/${repoPath}`;
  }

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed.replace(/\.git$/, '').replace(/\/$/, '');
  }

  return undefined;
}

/** Combine scan-root-relative node filepath with optional scanRoot offset from git root. */
export function resolveRepoRelativeFilePath(
  source: SourceProvenance,
  nodeFilepath: string
): string {
  const normalized = nodeFilepath.replace(/\\/g, '/').replace(/^\.\//, '');
  const scanRoot = (source.scanRoot ?? '.')
    .replace(/\\/g, '/')
    .replace(/^\.\//, '')
    .replace(/\/$/, '');
  if (!scanRoot || scanRoot === '.') return normalized;
  return `${scanRoot}/${normalized}`;
}

function resolveRef(source: SourceProvenance, ref?: string): string | undefined {
  return ref ?? source.scannedAtCommit ?? source.defaultBranch;
}

/** Build a host-specific source browser URL for a node filepath. */
export function buildSourceFileUrl(
  source: SourceProvenance,
  filepath: string,
  ref?: string
): string | undefined {
  const remoteUrl = source.remoteUrl;
  if (!remoteUrl) return undefined;

  const commit = resolveRef(source, ref);
  if (!commit) return undefined;

  const repoPath = resolveRepoRelativeFilePath(source, filepath);
  const base = remoteUrl.replace(/\.git$/, '').replace(/\/$/, '');

  let hostname: string;
  try {
    hostname = new URL(base).hostname;
  } catch {
    return `${base}/blob/${commit}/${repoPath}`;
  }

  if (hostname === 'github.com') {
    return `${base}/blob/${commit}/${repoPath}`;
  }

  if (hostname.includes('gitlab')) {
    return `${base}/-/blob/${commit}/${repoPath}`;
  }

  return `${base}/blob/${commit}/${repoPath}`;
}

/** Build a host-specific raw content URL for fetching file text (GitHub raw, GitLab raw, etc.). */
export function buildSourceFileRawUrl(
  source: SourceProvenance,
  filepath: string,
  ref?: string
): string | undefined {
  const remoteUrl = source.remoteUrl;
  if (!remoteUrl) return undefined;

  const commit = resolveRef(source, ref);
  if (!commit) return undefined;

  const repoPath = resolveRepoRelativeFilePath(source, filepath);
  const base = remoteUrl.replace(/\.git$/, '').replace(/\/$/, '');

  let hostname: string;
  let pathname: string;
  try {
    const parsed = new URL(base);
    hostname = parsed.hostname;
    pathname = parsed.pathname.replace(/^\//, '').replace(/\/$/, '');
  } catch {
    return `${base}/raw/${commit}/${repoPath}`;
  }

  if (hostname === 'github.com') {
    return `https://raw.githubusercontent.com/${pathname}/${commit}/${repoPath}`;
  }

  if (hostname.includes('gitlab')) {
    return `${base}/-/raw/${commit}/${repoPath}`;
  }

  if (hostname === 'bitbucket.org') {
    return `${base}/raw/${commit}/${repoPath}`;
  }

  return `${base}/raw/${commit}/${repoPath}`;
}
