import React from 'react';
import { Folder, ChevronRight, Layers, Compass, Code, Network, ChevronDown } from 'lucide-react';
import type { C4Level } from '@blueprint/core';
import { useBreadcrumbs } from './useBreadcrumbs';

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
  const {
    openDropdownIdx,
    setOpenDropdownIdx,
    dropdownRef,
    activeLevel,
    segments,
    hasNextLevelChildren,
    currentChildren,
    getNextLevel,
    isWorkspaceOpen,
    workspaceName,
    selectSystem,
  } = useBreadcrumbs();

  return (
    <div
      ref={dropdownRef}
      className="flex flex-wrap items-center gap-y-1.5 gap-x-2.5 text-xs select-none w-full"
    >
      <div className="flex items-center gap-1.5 text-slate-400 font-medium">
        <Folder className="w-3.5 h-3.5 text-brand-500" />
        <span
          className="max-w-[100px] sm:max-w-[150px] truncate"
          title={workspaceName || 'Sandbox'}
        >
          {isWorkspaceOpen ? workspaceName : 'Sandbox Workspace'}
        </span>
      </div>

      <ChevronRight className="w-3.5 h-3.5 text-slate-700 shrink-0" />

      <div className="flex flex-wrap items-center gap-1.5">
        {(segments as any[]).map((seg, idx) => {
          const isLast = idx === segments.length - 1;
          const isClickable = !isLast || seg.isZoomPreview;
          const segConfig = LEVEL_CONFIGS[seg.level as C4Level];
          const SegIcon = segConfig.icon;
          const sameLevelSystems: { path: string; name: string; schema: { level: C4Level } }[] =
            seg.sameLevelSystems ?? [];

          return (
            <React.Fragment key={`${seg.path}-${idx}`}>
              {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-800 shrink-0" />}

              <div className="relative flex items-center gap-0.5">
                <button
                  disabled={!isClickable}
                  onClick={seg.onClick}
                  className={`flex items-center gap-1.5 transition text-left focus:outline-none shrink-0 ${
                    !isClickable
                      ? 'text-slate-100 font-semibold cursor-default'
                      : seg.isZoomPreview
                        ? 'text-brand-400 hover:text-brand-300 font-medium cursor-pointer border border-brand-500/20 px-2 py-0.5 rounded bg-brand-950/20 hover:bg-brand-950/45'
                        : 'text-slate-500 hover:text-slate-200 cursor-pointer'
                  }`}
                >
                  <SegIcon
                    className={`w-3.5 h-3.5 shrink-0 ${isLast && !seg.isZoomPreview ? segConfig.text : 'text-slate-600'}`}
                  />
                  <span className="truncate max-w-[80px] sm:max-w-[150px]">{seg.name}</span>
                </button>

                {sameLevelSystems.length > 0 && (
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      setOpenDropdownIdx(openDropdownIdx === idx ? null : idx);
                    }}
                    className={`p-0.5 rounded hover:bg-slate-900 transition focus:outline-none cursor-pointer shrink-0 ${
                      openDropdownIdx === idx
                        ? 'text-brand-400 bg-slate-900/50'
                        : 'text-slate-600 hover:text-slate-300'
                    }`}
                    title={`Other ${segConfig.label} systems`}
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                )}

                {openDropdownIdx === idx && (
                  <div className="absolute top-full left-0 mt-1.5 bg-slate-950 border border-slate-900 rounded-xl shadow-2xl py-1.5 z-50 min-w-[200px] max-h-[250px] overflow-y-auto backdrop-blur-lg animate-in fade-in slide-in-from-top-1 duration-150 text-[11px]">
                    <div className="px-2.5 py-1 text-[9px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-900/60 mb-1">
                      Other {segConfig.label} Levels
                    </div>
                    {sameLevelSystems.map(sys => (
                      <button
                        key={sys.path}
                        onClick={() => {
                          selectSystem(sys.path);
                          setOpenDropdownIdx(null);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-slate-900/80 hover:text-brand-400 text-slate-400 transition flex items-center gap-2"
                      >
                        <SegIcon className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                        <span className="truncate">{sys.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {hasNextLevelChildren && (
        <>
          <div className="w-px h-4 bg-slate-800/80 self-center mx-1 shrink-0" />

          <div className="relative">
            <button
              onClick={() => setOpenDropdownIdx(openDropdownIdx === 999 ? null : 999)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[10px] font-bold uppercase tracking-wider shrink-0 transition focus:outline-none cursor-pointer ${
                openDropdownIdx === 999
                  ? 'bg-brand-950/50 border-brand-500/30 text-brand-400'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
              title="Explore child components"
            >
              <span>Explore {getNextLevel(activeLevel)} Level</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {openDropdownIdx === 999 && (
              <div className="absolute top-full right-0 mt-1.5 bg-slate-950 border border-slate-900 rounded-xl shadow-2xl py-1.5 z-50 min-w-[200px] max-h-[250px] overflow-y-auto backdrop-blur-lg animate-in fade-in slide-in-from-top-1 duration-150 text-[11px]">
                <div className="px-2.5 py-1 text-[9px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-900/60 mb-1">
                  Jump to {getNextLevel(activeLevel)}
                </div>
                {currentChildren.map(child => (
                  <button
                    key={child.path}
                    onClick={() => {
                      selectSystem(child.path);
                      setOpenDropdownIdx(null);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-slate-900/80 hover:text-brand-400 text-slate-400 transition flex items-center gap-2"
                  >
                    <Network className="w-3 h-3 text-slate-600 shrink-0" />
                    <span className="truncate">{child.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
