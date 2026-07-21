import { describe, it, expect, vi } from 'vitest';
import { fetchSourceFileContent } from './fetchSourceFileContent';
import type { SourceProvenance } from '@blueprint/core';

const source: SourceProvenance = {
  remoteUrl: 'https://github.com/org/repo',
  scannedAtCommit: 'abc123',
  scanRoot: 'app',
};

describe('fetchSourceFileContent', () => {
  it('prefers local workspace content when available', async () => {
    const readLocalFile = vi.fn().mockResolvedValue('local code');
    const fetchText = vi.fn();

    const result = await fetchSourceFileContent(source, 'packages/cli/foo.ts', {
      readLocalFile,
      fetchText,
    });

    expect(result).toEqual({
      ok: true,
      content: 'local code',
      origin: 'local',
      filepath: 'app/packages/cli/foo.ts',
      viewerUrl: 'https://github.com/org/repo/blob/abc123/app/packages/cli/foo.ts',
      rawUrl: 'https://raw.githubusercontent.com/org/repo/abc123/app/packages/cli/foo.ts',
    });
    expect(fetchText).not.toHaveBeenCalled();
  });

  it('falls back to raw URL when local read fails', async () => {
    const readLocalFile = vi.fn().mockRejectedValue(new Error('missing'));
    const fetchText = vi.fn().mockResolvedValue('remote code');

    const result = await fetchSourceFileContent(source, 'packages/cli/foo.ts', {
      readLocalFile,
      fetchText,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.origin).toBe('remote');
      expect(result.content).toBe('remote code');
    }
    expect(fetchText).toHaveBeenCalledWith(
      'https://raw.githubusercontent.com/org/repo/abc123/app/packages/cli/foo.ts'
    );
  });

  it('returns a helpful error when no source metadata exists', async () => {
    const result = await fetchSourceFileContent(undefined, 'src/a.ts');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/No git source metadata/i);
    }
  });
});
