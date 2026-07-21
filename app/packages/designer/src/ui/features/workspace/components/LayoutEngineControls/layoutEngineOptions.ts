import { useCallback } from 'react';
import { useBlueprintStore } from '../../../../../application/store/store';
import type { LayoutEngineId } from '../../../../../core';

export const LAYOUT_ENGINE_OPTIONS: Array<{
  id: LayoutEngineId;
  label: string;
  shortLabel: string;
}> = [
  { id: 'dagre', label: 'Dagre', shortLabel: 'DAG' },
  { id: 'elk', label: 'ELK', shortLabel: 'ELK' },
  { id: 'd3-hierarchy', label: 'd3-hierarchy', shortLabel: 'D3' },
];

export function useLayoutEnginePicker() {
  const layoutEngine = useBlueprintStore(s => s.layoutEngine);
  const setLayoutEngine = useBlueprintStore(s => s.setLayoutEngine);
  const applyClientLayout = useBlueprintStore(s => s.applyClientLayout);

  const pickLayoutEngine = useCallback(
    (engine: LayoutEngineId) => {
      setLayoutEngine(engine);
      void applyClientLayout({ persistToSchema: true });
    },
    [setLayoutEngine, applyClientLayout]
  );

  return { layoutEngine, pickLayoutEngine };
}
