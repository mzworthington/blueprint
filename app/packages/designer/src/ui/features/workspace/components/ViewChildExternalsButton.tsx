import React from 'react';
import { Link2 } from 'lucide-react';
import { useBlueprintStore } from '../../../../application/store/store';

interface ViewChildExternalsButtonProps {
  parentEntityRef: string;
  externalsCount: number;
  className?: string;
  label?: string;
  testId?: string;
}

export const ViewChildExternalsButton: React.FC<ViewChildExternalsButtonProps> = ({
  parentEntityRef,
  externalsCount,
  className,
  label,
  testId = 'view-child-externals-button',
}) => {
  const openChildLevelExternals = useBlueprintStore(state => state.openChildLevelExternals);

  if (externalsCount <= 0) return null;

  const buttonLabel = label ?? `Externals (${externalsCount})`;

  return (
    <button
      type="button"
      data-testid={testId}
      onMouseDown={e => e.stopPropagation()}
      onClick={e => {
        e.stopPropagation();
        e.preventDefault();
        openChildLevelExternals(parentEntityRef);
      }}
      className={
        className ??
        'flex items-center gap-1 bg-cyan-500/10 border border-cyan-500/30 hover:bg-cyan-500/20 active:bg-cyan-500/30 text-cyan-300 px-1.5 py-0.5 rounded text-[8px] font-bold tracking-wider uppercase transition cursor-pointer z-10'
      }
      title={`View ${externalsCount} external${externalsCount === 1 ? '' : 's'} from the next level`}
      aria-label={buttonLabel}
    >
      <Link2 className="w-2.5 h-2.5" />
      <span>{buttonLabel}</span>
    </button>
  );
};
