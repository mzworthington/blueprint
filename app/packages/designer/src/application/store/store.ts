import { create } from 'zustand';
import { createUiState, type UiState } from './states/uiState';
import { createDiagramState, type DiagramState } from './states/diagramState';
import { createIoState, type IoState } from './states/ioState';

export type {
  BlueprintRFNode,
  BlueprintRFEdge,
  ComponentNodeData,
  ComponentEdgeData,
} from './layoutUtils';

export { resolveRelativePath, getFileName } from '../../core';

export { defaultLoadedSystems, defaultInitialSchema } from './defaultData';

export interface BlueprintState extends UiState, DiagramState, IoState {}

export const useBlueprintStore = create<BlueprintState>((set, get) => ({
  ...createUiState(set),
  ...createDiagramState(set, get),
  ...createIoState(set, get),
}));
