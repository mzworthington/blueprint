import { createContext, useContext } from 'react';

/** Entity refs that have a loaded child diagram (zoom target). */
export const SubDiagramRefsContext = createContext<ReadonlySet<string>>(new Set());

export function useHasSubDiagram(entityRef: string | undefined): boolean {
  const refs = useContext(SubDiagramRefsContext);
  return entityRef ? refs.has(entityRef) : false;
}
