import { createContext, useContext } from 'react';

/** Entity refs that have a loaded child diagram (zoom target). */
export const SubDiagramRefsContext = createContext<ReadonlySet<string>>(new Set());

/** Count of external nodes on each child diagram keyed by parent node entityRef. */
export const ChildDiagramExternalsCountContext = createContext<ReadonlyMap<string, number>>(
  new Map()
);

export function useHasSubDiagram(entityRef: string | undefined): boolean {
  const refs = useContext(SubDiagramRefsContext);
  return entityRef ? refs.has(entityRef) : false;
}

export function useChildDiagramExternalsCount(entityRef: string | undefined): number {
  const counts = useContext(ChildDiagramExternalsCountContext);
  if (!entityRef) return 0;
  return counts.get(entityRef) ?? 0;
}
