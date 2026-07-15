import React from 'react';
import { Folder, ChevronRight, Layers, Compass, Code, Network, ChevronDown } from 'lucide-react';
import { Link } from 'wouter';
import { getSchemaEntityRef, type C4Level, type SystemSchema } from '@blueprint/core';
import { useBreadcrumbs } from './useBreadcrumbs';

const LEVEL_CONFIGS: Record<
  C4Level,
  {
    label: string;
    bg: string;
    text: string;
    border: string;
    icon: React.ComponentType<{ className?: string }>;
  }
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

/**
 * Mobile breadcrumb: one-line location chip that opens the full trail,
 * sibling switches, and explore-children actions in a dropdown.
 */
export const BreadcrumbsCompact: React.FC = () => {
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
  } = useBreadcrumbs();

  const menuOpen = openDropdownIdx === -1;
  const workspaceLabel = isWorkspaceOpen ? workspaceName || 'Workspace' : 'Sandbox';
  const lastSegment = segments[segments.length - 1];
  const summary =
    segments.length > 1 && segments[segments.length - 2]
      ? `${segments[segments.length - 2].name} › ${lastSegment?.name ?? ''}`
      : (lastSegment?.name ?? 'Diagram');

  return (
    <div ref={dropdownRef} className="relative min-w-0 w-full">
      <button
        type="button"
        onClick={() => setOpenDropdownIdx(menuOpen ? null : -1)}
        className={`flex items-center gap-2 min-w-0 w-full max-w-full rounded-lg border px-2.5 py-1.5 text-left transition-colors cursor-pointer ${
          menuOpen
            ? 'border-[#00f0ff]/30 bg-cyan-950/25 text-[#00f0ff]'
            : 'border-[#00f0ff]/15 bg-[#040914]/50 text-slate-200 hover:border-[#00f0ff]/25'
        }`}
        aria-expanded={menuOpen}
        aria-controls="breadcrumb-mobile-menu"
        aria-label="Open diagram location menu"
      >
        <Folder className="w-3.5 h-3.5 text-brand-500 shrink-0" />
        <span className="min-w-0 flex-1 truncate text-xs font-medium">{summary}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 shrink-0 transition-transform ${menuOpen ? 'rotate-180 text-[#00f0ff]' : 'text-slate-500'}`}
        />
      </button>

      {menuOpen ? (
        <div
          id="breadcrumb-mobile-menu"
          className="absolute top-full left-0 right-0 mt-2 z-50 rounded-xl border border-slate-900 bg-slate-950/95 py-2 shadow-2xl backdrop-blur-lg max-h-[min(70vh,320px)] overflow-y-auto"
        >
          <div className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-900/60 mb-1">
            {workspaceLabel}
          </div>

          <div className="px-2 space-y-0.5">
            {(
              segments as Array<{
                name: string;
                path: string;
                level: C4Level;
                entityRef: string;
                isZoomPreview: boolean;
                sameLevelSystems?: { path: string; name: string; schema: SystemSchema }[];
              }>
            ).map((seg, idx) => {
              const isLast = idx === segments.length - 1;
              const isClickable = !isLast || seg.isZoomPreview;
              const segConfig = LEVEL_CONFIGS[seg.level];
              const SegIcon = segConfig.icon;
              const sameLevelSystems = seg.sameLevelSystems ?? [];

              return (
                <div key={`${seg.path}-${idx}`} className="py-0.5">
                  <div className="flex items-center gap-1">
                    {idx > 0 ? (
                      <ChevronRight className="w-3 h-3 text-slate-700 shrink-0 ml-1" aria-hidden />
                    ) : null}
                    {isClickable ? (
                      <Link
                        to={`/workspace/${seg.entityRef}`}
                        onClick={() => setOpenDropdownIdx(null)}
                        className={`flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-2 text-left text-xs transition ${
                          seg.isZoomPreview
                            ? 'border border-brand-500/20 bg-brand-950/20 text-brand-300'
                            : isLast
                              ? 'font-semibold text-slate-100'
                              : 'text-slate-400 hover:bg-slate-900/60 hover:text-slate-100'
                        }`}
                      >
                        <SegIcon className={`w-3.5 h-3.5 shrink-0 ${segConfig.text}`} />
                        <span className="truncate">{seg.name}</span>
                      </Link>
                    ) : (
                      <div className="flex min-w-0 flex-1 items-center gap-2 px-2 py-2 text-xs font-semibold text-slate-100">
                        <SegIcon className={`w-3.5 h-3.5 shrink-0 ${segConfig.text}`} />
                        <span className="truncate">{seg.name}</span>
                      </div>
                    )}
                  </div>

                  {sameLevelSystems.length > 0 ? (
                    <div className="ml-6 mt-0.5 space-y-0.5 border-l border-slate-800 pl-2">
                      <p className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-600">
                        Other {segConfig.label}
                      </p>
                      {sameLevelSystems.map(sys => {
                        const sysEntityRef = getSchemaEntityRef(sys.schema, workspaceName);
                        return (
                          <Link
                            key={sys.path}
                            to={`/workspace/${sysEntityRef}`}
                            onClick={() => setOpenDropdownIdx(null)}
                            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-[11px] text-slate-400 transition hover:bg-slate-900/80 hover:text-brand-400"
                          >
                            <SegIcon className="w-3 h-3 shrink-0 text-slate-600" />
                            <span className="truncate">{sys.name}</span>
                          </Link>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>

          {hasNextLevelChildren ? (
            <div className="mt-2 border-t border-slate-900/60 px-2 pt-2">
              <p className="px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-slate-500">
                Explore {getNextLevel(activeLevel)}
              </p>
              {(currentChildren as Array<{ path: string; name: string; entityRef: string }>).map(
                child => (
                  <Link
                    key={child.path}
                    to={`/workspace/${child.entityRef}`}
                    onClick={() => setOpenDropdownIdx(null)}
                    className="flex items-center gap-2 rounded-lg px-2 py-2 text-xs text-slate-400 transition hover:bg-slate-900/80 hover:text-brand-400"
                  >
                    <Network className="w-3.5 h-3.5 shrink-0 text-slate-600" />
                    <span className="truncate">{child.name}</span>
                  </Link>
                )
              )}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};
