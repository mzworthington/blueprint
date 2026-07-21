import { useCallback, useEffect, useState } from 'react';
import type { SourceProvenance } from '@blueprint/core';
import {
  fetchSourceFileContent,
  type SourceFileLoadResult,
} from '../../../../../application/source/fetchSourceFileContent';

export type UseSourceCodeDialogArgs = {
  isOpen: boolean;
  filepath?: string;
  source?: SourceProvenance;
  isWorkspaceOpen: boolean;
  readLocalFile?: (relativePath: string) => Promise<string>;
};

export function useSourceCodeDialog({
  isOpen,
  filepath,
  source,
  isWorkspaceOpen,
  readLocalFile,
}: UseSourceCodeDialogArgs) {
  const [result, setResult] = useState<SourceFileLoadResult | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!filepath) {
      setResult({ ok: false, error: 'This node has no filepath.' });
      return;
    }

    setLoading(true);
    try {
      const next = await fetchSourceFileContent(source, filepath, {
        readLocalFile: isWorkspaceOpen ? readLocalFile : undefined,
      });
      setResult(next);
    } finally {
      setLoading(false);
    }
  }, [filepath, source, isWorkspaceOpen, readLocalFile]);

  useEffect(() => {
    if (!isOpen) {
      setResult(null);
      setLoading(false);
      return;
    }
    void load();
  }, [isOpen, load]);

  return {
    result,
    loading,
    reload: load,
  };
}
