import { create } from 'zustand';
import { createUiSlice, type UiSlice } from './slices/uiSlice';
import { createDiagramSlice, type DiagramSlice } from './slices/diagramSlice';
import { createIoSlice, type IoSlice } from './slices/ioSlice';

export type {
  BlueprintRFNode,
  BlueprintRFEdge,
  ComponentNodeData,
  ComponentEdgeData,
} from './layoutUtils';

export {
  resolveRelativePath,
  getClosestManifest,
  resolveWorkspaceManifestState,
  getFileName,
} from '../domain/path';

export {
  defaultLoadedSystems,
  defaultLoadedManifests,
  defaultWorkspaceManifest,
  defaultWorkspaceManifestYaml,
  defaultInitialSchema,
} from './defaultData';

export interface BlueprintState extends UiSlice, DiagramSlice, IoSlice {}

export const useBlueprintStore = create<BlueprintState>((set, get, store) => ({
  ...createUiSlice(set, get, store),
  ...createDiagramSlice(set, get, store),
  ...createIoSlice(set, get, store),
}));
