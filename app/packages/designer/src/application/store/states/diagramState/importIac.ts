import {
  parseIacBatchToSchema,
  type IacParseResult,
  type IacSourceFile,
  type IacSourceKind,
} from '@blueprint/core';
import type { ConflictResolutions } from '@blueprint/core';
import {
  buildDiagramImportContext,
  executeDiagramImport,
  parentEntityRefForImport,
  previewDiagramImport,
  type DiagramImportContext,
  type DiagramImportPreview,
} from './diagramImportShared';

export type IacImportContext = DiagramImportContext;
export type IacImportPreview = DiagramImportPreview<IacParseResult>;

export function previewIacImport(
  files: IacSourceFile[],
  context: DiagramImportContext,
  kind: IacSourceKind = 'auto'
): IacImportPreview {
  const parseResult = parseIacBatchToSchema(files, {
    targetLevel: context.baseSchema.level,
    parentEntityRef: parentEntityRefForImport(context),
    kind,
  });

  return previewDiagramImport(context, parseResult);
}

export function executeIacImport(
  set: (partial: Record<string, unknown>) => void,
  get: () => {
    schema: import('@blueprint/core').SystemSchema;
    nodes: import('../../layoutUtils').BlueprintRFNode[];
    currentFilePath: string;
    loadedSystems: Array<{
      path: string;
      name: string;
      schema: import('@blueprint/core').SystemSchema;
    }>;
    workspaceName: string;
    isWorkspaceOpen: boolean;
    recordHistory: () => void;
    checkPendingChanges: () => Promise<void>;
    logger: { error: (message: string, err: unknown) => void };
  },
  files: IacSourceFile[],
  resolutions: ConflictResolutions,
  kind: IacSourceKind = 'auto'
): boolean {
  const context = buildDiagramImportContext(get);
  const { scopedImported } = previewIacImport(files, context, kind);
  return executeDiagramImport(
    set,
    get,
    context,
    scopedImported,
    resolutions,
    'Failed to import infrastructure diagram'
  );
}
