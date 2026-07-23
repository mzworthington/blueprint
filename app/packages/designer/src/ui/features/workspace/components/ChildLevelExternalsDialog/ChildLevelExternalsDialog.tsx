import React, { useEffect, useMemo } from 'react';
import { Link2, X } from 'lucide-react';
import { listChildDiagramExternals, resolveChildDiagramEntry } from '@blueprint/core';
import { useBlueprintStore } from '../../../../../application/store/store';
import { ChildLevelExternalsList } from '../ChildLevelExternalsList';

export const ChildLevelExternalsDialog: React.FC = () => {
  const childExternalsParentRef = useBlueprintStore(state => state.childExternalsParentRef);
  const closeChildLevelExternals = useBlueprintStore(state => state.closeChildLevelExternals);
  const workspaceCatalog = useBlueprintStore(state => state.workspaceCatalog);
  const loadedSystems = useBlueprintStore(state => state.loadedSystems);
  const schema = useBlueprintStore(state => state.schema);

  const parentNodeName = useMemo(() => {
    if (!childExternalsParentRef) return '';
    const node = schema.nodes.find(
      n =>
        n.entityRef === childExternalsParentRef ||
        n.entityRef?.endsWith('/' + childExternalsParentRef)
    );
    return node?.name ?? childExternalsParentRef;
  }, [schema.nodes, childExternalsParentRef]);

  const childDiagramEntry = useMemo(() => {
    if (!childExternalsParentRef) return undefined;
    return resolveChildDiagramEntry(workspaceCatalog, childExternalsParentRef);
  }, [workspaceCatalog, childExternalsParentRef]);

  const externals = useMemo(() => {
    if (!childExternalsParentRef) return [];
    return listChildDiagramExternals(workspaceCatalog, loadedSystems, childExternalsParentRef);
  }, [workspaceCatalog, loadedSystems, childExternalsParentRef]);

  useEffect(() => {
    if (!childExternalsParentRef) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeChildLevelExternals();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [childExternalsParentRef, closeChildLevelExternals]);

  if (!childExternalsParentRef || !childDiagramEntry || externals.length === 0) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[100]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="child-level-externals-title"
      data-testid="child-level-externals-dialog"
    >
      <div
        className="fixed inset-0 bg-[#020617]/80 backdrop-blur-sm cursor-pointer"
        onClick={closeChildLevelExternals}
      />

      <div className="fixed inset-0 flex items-center justify-center p-4 pointer-events-none">
        <div className="pointer-events-auto w-full max-w-md bg-slate-950/95 glass-panel border border-slate-800 rounded-xl shadow-2xl">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Link2 className="w-4 h-4 text-[#00f0ff] shrink-0" />
              <h2
                id="child-level-externals-title"
                className="text-base font-bold text-white truncate"
              >
                Externals on {parentNodeName}
              </h2>
            </div>
            <button
              type="button"
              onClick={closeChildLevelExternals}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition cursor-pointer"
              aria-label="Close child level externals"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 max-h-[min(70vh,520px)] overflow-y-auto">
            <ChildLevelExternalsList
              externals={externals}
              childDiagramLevel={childDiagramEntry.level}
              parentNodeName={parentNodeName}
              onNavigateToExternal={closeChildLevelExternals}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
