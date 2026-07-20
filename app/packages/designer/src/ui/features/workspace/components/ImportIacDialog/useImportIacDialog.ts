import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ConflictResolution, IacSourceFile, IacSourceKind } from '@blueprint/core';
import { useBlueprintStore } from '../../../../../application/store/store';

const KIND_OPTIONS: Array<{ value: IacSourceKind; label: string }> = [
  { value: 'auto', label: 'Auto-detect' },
  { value: 'terraform-hcl', label: 'Terraform HCL' },
  { value: 'terraform-json', label: 'Terraform JSON' },
  { value: 'pulumi-yaml', label: 'Pulumi YAML' },
  { value: 'pulumi-typescript', label: 'Pulumi TypeScript' },
];

const VIRTUAL_PATH: Record<Exclude<IacSourceKind, 'auto'>, string> = {
  'terraform-hcl': 'main.tf',
  'terraform-json': 'main.tf.json',
  'pulumi-yaml': 'Pulumi.yaml',
  'pulumi-typescript': 'index.ts',
};

function defaultPathForKind(kind: IacSourceKind): string {
  if (kind === 'auto') return 'main.tf';
  return VIRTUAL_PATH[kind];
}

export function useImportIacDialog(isOpen: boolean, onClose: () => void) {
  const {
    previewIacImport,
    importIac,
    lastError,
    clearError,
    setNotification,
    setLayoutEngine,
    applyClientLayout,
  } = useBlueprintStore();

  const [sourceText, setSourceText] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<IacSourceFile[]>([]);
  const [sourceKind, setSourceKind] = useState<IacSourceKind>('auto');
  const [parseError, setParseError] = useState<string | null>(null);
  const [resolutions, setResolutions] = useState<Record<string, ConflictResolution>>({});
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setSourceText('');
      setUploadedFiles([]);
      setSourceKind('auto');
      setParseError(null);
      setResolutions({});
      clearError();
    }
  }, [isOpen, clearError]);

  const sourceFiles = useMemo<IacSourceFile[]>(() => {
    if (uploadedFiles.length > 0) return uploadedFiles;
    if (!sourceText.trim()) return [];
    return [{ path: defaultPathForKind(sourceKind), content: sourceText }];
  }, [uploadedFiles, sourceText, sourceKind]);

  const preview = useMemo(() => {
    if (sourceFiles.length === 0) return null;
    try {
      const result = previewIacImport(sourceFiles, sourceKind);
      setParseError(null);
      return result;
    } catch (e: unknown) {
      setParseError(e instanceof Error ? e.message : 'Failed to parse infrastructure source');
      return null;
    }
  }, [sourceFiles, sourceKind, previewIacImport]);

  const handleFileUpload = useCallback(async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const files = await Promise.all(
      Array.from(fileList).map(async file => ({
        path: file.name,
        content: await file.text(),
      }))
    );
    setUploadedFiles(files);
    setSourceText('');
  }, []);

  const setConflictResolution = useCallback((entityRef: string, resolution: ConflictResolution) => {
    setResolutions(prev => ({ ...prev, [entityRef]: resolution }));
  }, []);

  const handleApply = useCallback(async () => {
    if (sourceFiles.length === 0) return;
    setApplying(true);
    try {
      const conflictResolutions = { ...resolutions };
      if (preview?.mergePlan.conflicts) {
        for (const c of preview.mergePlan.conflicts) {
          if (!conflictResolutions[c.entityRef]) {
            conflictResolutions[c.entityRef] = 'skip';
          }
        }
      }
      const success = importIac(sourceFiles, conflictResolutions, sourceKind);
      if (success) {
        setLayoutEngine('elk');
        await applyClientLayout();
        setNotification({
          type: 'success',
          title: 'Import complete',
          message: 'Infrastructure merged and laid out with ELK. Commit via Pending Changes.',
        });
        onClose();
      }
    } finally {
      setApplying(false);
    }
  }, [
    sourceFiles,
    preview,
    resolutions,
    importIac,
    sourceKind,
    setLayoutEngine,
    applyClientLayout,
    setNotification,
    onClose,
  ]);

  const formatLabel = preview
    ? `${preview.parseResult.vendor} · ${preview.parseResult.format}`
    : null;

  const canApply = Boolean(preview && !parseError && sourceFiles.length > 0);

  return {
    sourceText,
    setSourceText,
    uploadedFiles,
    clearUploadedFiles: () => setUploadedFiles([]),
    sourceKind,
    setSourceKind,
    parseError: parseError || lastError,
    preview,
    formatLabel,
    resolutions,
    setConflictResolution,
    handleFileUpload,
    handleApply,
    applying,
    canApply,
    sourceFiles,
  };
}

export { KIND_OPTIONS };
