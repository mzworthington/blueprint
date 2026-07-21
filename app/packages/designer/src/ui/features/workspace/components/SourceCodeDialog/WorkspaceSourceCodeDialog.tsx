import React, { useCallback, useMemo } from 'react';
import { useBlueprintStore } from '../../../../../application/store/store';
import { SourceCodeDialog } from './SourceCodeDialog';

export const WorkspaceSourceCodeDialog: React.FC = () => {
  const {
    isSourceCodeOpen,
    sourceCodeFilepath,
    closeSourceCodeDialog,
    schema,
    loadedSystems,
    currentFilePath,
    isWorkspaceOpen,
    workspacePort,
  } = useBlueprintStore();

  const sourceProvenance = useMemo(() => {
    if (schema.source) return schema.source;
    return loadedSystems.find(s => s.path === currentFilePath)?.schema.source;
  }, [schema.source, loadedSystems, currentFilePath]);

  const readLocalFile = useCallback(
    (relativePath: string) => workspacePort.readFile(relativePath),
    [workspacePort]
  );

  return (
    <SourceCodeDialog
      isOpen={isSourceCodeOpen}
      onClose={closeSourceCodeDialog}
      filepath={sourceCodeFilepath ?? undefined}
      source={sourceProvenance}
      isWorkspaceOpen={isWorkspaceOpen}
      readLocalFile={readLocalFile}
    />
  );
};
