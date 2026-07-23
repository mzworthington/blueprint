import React, { useMemo } from 'react';
import { ExternalLink } from 'lucide-react';
import { useLocation } from 'wouter';
import { resolveEntityHome } from '@blueprint/core';
import { useBlueprintStore } from '../../../../application/store/store';
import { navigateToWorkspaceEntity } from '../../../../application/navigation/navigateToWorkspaceEntity';

interface GoToEntityButtonProps {
  entityRef: string;
  className?: string;
  label?: string;
  testId?: string;
}

export const GoToEntityButton: React.FC<GoToEntityButtonProps> = ({
  entityRef,
  className,
  label = 'Entity',
  testId = 'go-to-entity-button',
}) => {
  const [, setLocation] = useLocation();
  const workspaceCatalog = useBlueprintStore(state => state.workspaceCatalog);
  const currentFilePath = useBlueprintStore(state => state.currentFilePath);
  const selectSystem = useBlueprintStore(state => state.selectSystem);
  const selectNode = useBlueprintStore(state => state.selectNode);

  const home = useMemo(
    () => resolveEntityHome(workspaceCatalog, entityRef),
    [workspaceCatalog, entityRef]
  );

  if (!home) return null;

  return (
    <button
      type="button"
      data-testid={testId}
      onClick={e => {
        e.stopPropagation();
        void navigateToWorkspaceEntity(entityRef, {
          workspaceCatalog,
          currentFilePath,
          setLocation,
          selectSystem,
          selectNode,
        });
      }}
      className={
        className ??
        'flex items-center gap-1 bg-cyan-500/10 border border-cyan-500/30 hover:bg-cyan-500/20 active:bg-cyan-500/30 text-cyan-300 px-1.5 py-0.5 rounded text-[8px] font-bold tracking-wider uppercase transition cursor-pointer z-10'
      }
      title={`Go to entity on ${home.name}`}
      aria-label="Go to entity in workspace"
    >
      <ExternalLink className="w-2.5 h-2.5" />
      <span>{label}</span>
    </button>
  );
};
