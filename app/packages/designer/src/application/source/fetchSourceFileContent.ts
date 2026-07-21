import type { SourceProvenance } from '@blueprint/core';
import {
  buildSourceFileRawUrl,
  buildSourceFileUrl,
  resolveRepoRelativeFilePath,
} from '@blueprint/core';

export type SourceFileOrigin = 'local' | 'remote';

export type SourceFileLoadSuccess = {
  ok: true;
  content: string;
  origin: SourceFileOrigin;
  filepath: string;
  viewerUrl?: string;
  rawUrl?: string;
};

export type SourceFileLoadFailure = {
  ok: false;
  error: string;
  viewerUrl?: string;
  rawUrl?: string;
};

export type SourceFileLoadResult = SourceFileLoadSuccess | SourceFileLoadFailure;

export type FetchSourceFileContentDeps = {
  readLocalFile?: (repoRelativePath: string) => Promise<string>;
  fetchText?: (url: string) => Promise<string>;
};

const defaultFetchText = async (url: string): Promise<string> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.text();
};

/**
 * Load source text for a node filepath: prefer local workspace file, then git raw URL.
 */
export async function fetchSourceFileContent(
  source: SourceProvenance | undefined,
  filepath: string,
  deps: FetchSourceFileContentDeps = {}
): Promise<SourceFileLoadResult> {
  const normalizedPath = filepath.replace(/\\/g, '/').replace(/^\.\//, '');
  if (!normalizedPath) {
    return { ok: false, error: 'No filepath provided.' };
  }

  const viewerUrl = source ? buildSourceFileUrl(source, normalizedPath) : undefined;
  const rawUrl = source ? buildSourceFileRawUrl(source, normalizedPath) : undefined;
  const repoRelativePath = source
    ? resolveRepoRelativeFilePath(source, normalizedPath)
    : normalizedPath;

  if (deps.readLocalFile) {
    try {
      const content = await deps.readLocalFile(repoRelativePath);
      return {
        ok: true,
        content,
        origin: 'local',
        filepath: repoRelativePath,
        viewerUrl,
        rawUrl,
      };
    } catch {
      // Fall through to remote fetch when workspace file is missing.
    }
  }

  if (!rawUrl) {
    return {
      ok: false,
      error: source?.remoteUrl
        ? 'Could not build a raw URL for this host.'
        : 'No git source metadata on this diagram. Re-run the CLI scan or open a workspace folder.',
      viewerUrl,
      rawUrl,
    };
  }

  const fetchText = deps.fetchText ?? defaultFetchText;
  try {
    const content = await fetchText(rawUrl);
    return {
      ok: true,
      content,
      origin: 'remote',
      filepath: repoRelativePath,
      viewerUrl,
      rawUrl,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      error: `Failed to fetch source (${message}). Try opening the file in your browser.`,
      viewerUrl,
      rawUrl,
    };
  }
}
