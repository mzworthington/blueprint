import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ConflictResolution } from '@blueprint/core';
import { extractMermaidFromMarkdown } from '@blueprint/core';
import { useBlueprintStore } from '../../../../../application/store/store';

const FORMAT_LABELS: Record<string, string> = {
  flowchart: 'Flowchart',
  'c4-context': 'C4 Context',
  'c4-container': 'C4 Container',
  'c4-component': 'C4 Component',
  unknown: 'Unknown',
};

export function useImportMermaidDialog(isOpen: boolean, onClose: () => void) {
  const { previewMermaidImport, importMermaid, lastError, clearError, setNotification } =
    useBlueprintStore();

  const [mermaidText, setMermaidText] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);
  const [resolutions, setResolutions] = useState<Record<string, ConflictResolution>>({});
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setMermaidText('');
      setParseError(null);
      setResolutions({});
      clearError();
    }
  }, [isOpen, clearError]);

  const preview = useMemo(() => {
    if (!mermaidText.trim()) return null;
    try {
      const source = extractMermaidFromMarkdown(mermaidText);
      const result = previewMermaidImport(source);
      setParseError(null);
      return result;
    } catch (e: unknown) {
      setParseError(e instanceof Error ? e.message : 'Failed to parse Mermaid');
      return null;
    }
  }, [mermaidText, previewMermaidImport]);

  const handleFileUpload = useCallback(async (file: File) => {
    const content = await file.text();
    setMermaidText(content);
  }, []);

  const setConflictResolution = useCallback((entityRef: string, resolution: ConflictResolution) => {
    setResolutions(prev => ({ ...prev, [entityRef]: resolution }));
  }, []);

  const handleApply = useCallback(() => {
    if (!mermaidText.trim()) return;
    setApplying(true);
    try {
      const source = extractMermaidFromMarkdown(mermaidText);
      const conflictResolutions = { ...resolutions };
      if (preview?.mergePlan.conflicts) {
        for (const c of preview.mergePlan.conflicts) {
          if (!conflictResolutions[c.entityRef]) {
            conflictResolutions[c.entityRef] = 'skip';
          }
        }
      }
      const success = importMermaid(source, conflictResolutions);
      if (success) {
        setNotification({
          type: 'success',
          title: 'Import complete',
          message: 'Mermaid diagram merged into the active schema. Commit via Pending Changes.',
        });
        onClose();
      }
    } finally {
      setApplying(false);
    }
  }, [mermaidText, preview, resolutions, importMermaid, setNotification, onClose]);

  const formatLabel = preview ? (FORMAT_LABELS[preview.parseResult.format] ?? 'Unknown') : null;

  const canApply = Boolean(preview && !parseError && mermaidText.trim());

  return {
    mermaidText,
    setMermaidText,
    parseError: parseError || lastError,
    preview,
    formatLabel,
    resolutions,
    setConflictResolution,
    handleFileUpload,
    handleApply,
    applying,
    canApply,
  };
}
