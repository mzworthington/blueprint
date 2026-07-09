import React from 'react';
import { useBlueprintStore } from './store';
import { Folder, ChevronRight, Layers, Compass, Code, Network } from 'lucide-react';
import type { C4Level } from '../domain/schema';

const LEVEL_CONFIGS: Record<
  C4Level,
  { label: string; bg: string; text: string; border: string; icon: any }
> = {
  context: {
    label: 'Context',
    bg: 'bg-emerald-950/45',
    text: 'text-emerald-400',
    border: 'border-emerald-500/20',
    icon: Compass,
  },
  container: {
    label: 'Container',
    bg: 'bg-blue-950/45',
    text: 'text-blue-400',
    border: 'border-blue-500/20',
    icon: Layers,
  },
  component: {
    label: 'Component',
    bg: 'bg-purple-950/45',
    text: 'text-purple-400',
    border: 'border-purple-500/20',
    icon: Network,
  },
  code: {
    label: 'Code',
    bg: 'bg-amber-950/45',
    text: 'text-amber-400',
    border: 'border-amber-500/20',
    icon: Code,
  },
};

export const Breadcrumbs: React.FC = () => {
  const { navigationStack, currentFilePath, schema, isWorkspaceOpen, workspaceName, zoomOut } =
    useBlueprintStore();

  const activeLevel = schema.level || 'container';
  const levelConfig = LEVEL_CONFIGS[activeLevel];
  const LevelIcon = levelConfig.icon;

  const handleBreadcrumbClick = async (targetIndex: number) => {
    const popCount = navigationStack.length - targetIndex;
    for (let i = 0; i < popCount; i++) {
      await zoomOut();
    }
  };

  const segments = [
    ...navigationStack.map((hist, idx) => ({
      name: hist.schema.name,
      path: hist.path,
      level: hist.schema.level || 'container',
      onClick: () => handleBreadcrumbClick(idx),
    })),
    {
      name: schema.name,
      path: currentFilePath,
      level: activeLevel,
      onClick: () => {},
    },
  ];

  return (
    <div className="flex items-center gap-2.5 bg-slate-950/90 border border-slate-900 px-4 py-2.5 rounded-xl shadow-lg shadow-black/40 backdrop-blur-md text-xs select-none">
      <div className="flex items-center gap-1.5 text-slate-400 font-medium">
        <Folder className="w-4 h-4 text-brand-500" />
        <span className="max-w-[120px] truncate" title={workspaceName || 'Sandbox'}>
          {isWorkspaceOpen ? workspaceName : 'Sandbox Workspace'}
        </span>
      </div>

      <ChevronRight className="w-3.5 h-3.5 text-slate-700 shrink-0" />

      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth">
        {segments.map((seg, idx) => {
          const isLast = idx === segments.length - 1;
          const segConfig = LEVEL_CONFIGS[seg.level];
          const SegIcon = segConfig.icon;

          return (
            <React.Fragment key={`${seg.path}-${idx}`}>
              {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-800 shrink-0" />}

              <button
                disabled={isLast}
                onClick={seg.onClick}
                className={`flex items-center gap-1.5 transition text-left focus:outline-none shrink-0 ${
                  isLast
                    ? 'text-slate-100 font-semibold cursor-default'
                    : 'text-slate-500 hover:text-slate-200 cursor-pointer'
                }`}
              >
                <SegIcon
                  className={`w-3.5 h-3.5 shrink-0 ${isLast ? segConfig.text : 'text-slate-600'}`}
                />
                <span className="truncate max-w-[150px]">{seg.name}</span>
              </button>
            </React.Fragment>
          );
        })}
      </div>

      <div className="w-px h-4 bg-slate-800/80 self-center mx-1 shrink-0" />

      <div
        className={`flex items-center gap-1 px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider shrink-0 ${levelConfig.bg} ${levelConfig.text} ${levelConfig.border}`}
      >
        <LevelIcon className="w-3 h-3" />
        <span>Level: {levelConfig.label}</span>
      </div>
    </div>
  );
};
