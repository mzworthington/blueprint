import React from 'react';
import { useBlueprintStore } from './store';
import { Folder, ChevronRight, Layers, Compass, Code, Network, ChevronDown } from 'lucide-react';
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
  const {
    navigationStack,
    currentFilePath,
    schema,
    isWorkspaceOpen,
    workspaceName,
    zoomOut,
    selectedNodeId,
    zoomIntoNode,
    selectNode,
    workspaceManifest,
    loadedSystems,
    selectSystem,
  } = useBlueprintStore();

  const [openDropdownIdx, setOpenDropdownIdx] = React.useState<number | null>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdownIdx(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getFileName = (p: string) => p.split('/').pop() || p;

  const getSegmentChildren = React.useCallback(
    (segPath: string) => {
      if (!workspaceManifest || !workspaceManifest.hierarchy) return [];
      const segFileName = getFileName(segPath);
      const match = workspaceManifest.hierarchy.find(h => getFileName(h.parent) === segFileName);
      if (!match) return [];

      return match.children.map(childPath => {
        const childFileName = getFileName(childPath);
        const system = loadedSystems.find(s => getFileName(s.path) === childFileName);
        return {
          path: system?.path || childPath,
          name: system?.name || childFileName.replace('-components.yaml', '').replace('.yaml', ''),
        };
      });
    },
    [workspaceManifest, loadedSystems]
  );

  const activeLevel = schema.level || 'container';

  const handleBreadcrumbClick = async (targetIndex: number) => {
    const popCount = navigationStack.length - targetIndex;
    for (let i = 0; i < popCount; i++) {
      await zoomOut();
    }
  };

  const ancestors = React.useMemo(() => {
    const list: Array<{ path: string; name: string; level: C4Level }> = [];
    if (!workspaceManifest || !workspaceManifest.hierarchy) return list;

    const currentFileName = getFileName(currentFilePath);
    let nextChildName = currentFileName;
    let foundParent = true;

    while (foundParent) {
      foundParent = false;
      for (const h of workspaceManifest.hierarchy) {
        const hasChild = h.children.some(c => getFileName(c) === nextChildName);
        if (hasChild) {
          const parentPath = h.parent;
          const parentFileName = getFileName(parentPath);
          const parentSystem = loadedSystems.find(s => getFileName(s.path) === parentFileName);
          if (parentSystem) {
            list.unshift({
              path: parentSystem.path,
              name: parentSystem.name,
              level: parentSystem.schema.level || 'container',
            });
            nextChildName = parentFileName;
            foundParent = true;
            break;
          }
        }
      }
    }
    return list;
  }, [workspaceManifest, loadedSystems, currentFilePath]);

  const selectedNode = selectedNodeId ? schema.nodes.find(n => n.id === selectedNodeId) : null;
  const hasNextHierarchy = !!(selectedNode && selectedNode.c4Ref);

  const getNextLevel = (current: C4Level): C4Level => {
    switch (current) {
      case 'context':
        return 'container';
      case 'container':
        return 'component';
      case 'component':
        return 'code';
      default:
        return 'code';
    }
  };

  const segments = [
    ...(ancestors.length > 0
      ? ancestors.map(anc => ({
          name: anc.name,
          path: anc.path,
          level: anc.level,
          onClick: () => selectSystem(anc.path),
          isZoomPreview: false,
        }))
      : navigationStack.map((hist, idx) => ({
          name: hist.schema.name,
          path: hist.path,
          level: hist.schema.level || 'container',
          onClick: () => handleBreadcrumbClick(idx),
          isZoomPreview: false,
        }))),
    {
      name: schema.name,
      path: currentFilePath,
      level: activeLevel,
      onClick: () => {
        if (hasNextHierarchy) {
          selectNode(null);
        }
      },
      isZoomPreview: false,
    },
  ];

  if (hasNextHierarchy && selectedNode) {
    segments.push({
      name: selectedNode.name || selectedNode.id,
      path: selectedNode.c4Ref!,
      level: getNextLevel(activeLevel),
      onClick: () => {
        zoomIntoNode(selectedNode.id);
      },
      isZoomPreview: true,
    });
  }

  const currentChildren = getSegmentChildren(currentFilePath);
  const hasNextLevelChildren = currentChildren.length > 0;

  return (
    <div className="flex items-center gap-2.5 bg-slate-950/90 border border-slate-900 px-4 py-2.5 rounded-xl shadow-lg shadow-black/40 backdrop-blur-md text-xs select-none">
      <div className="flex items-center gap-1.5 text-slate-400 font-medium">
        <Folder className="w-4 h-4 text-brand-500" />
        <span className="max-w-[120px] truncate" title={workspaceName || 'Sandbox'}>
          {isWorkspaceOpen ? workspaceName : 'Sandbox Workspace'}
        </span>
      </div>

      <ChevronRight className="w-3.5 h-3.5 text-slate-700 shrink-0" />

      <div className="flex items-center gap-1.5 scroll-smooth">
        {segments.map((seg, idx) => {
          const isLast = idx === segments.length - 1;
          const isClickable = !isLast || seg.isZoomPreview;
          const segConfig = LEVEL_CONFIGS[seg.level];
          const SegIcon = segConfig.icon;

          return (
            <React.Fragment key={`${seg.path}-${idx}`}>
              {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-800 shrink-0" />}

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
                <span className="truncate max-w-[150px]">{seg.name}</span>
              </button>
            </React.Fragment>
          );
        })}
      </div>

      {hasNextLevelChildren && (
        <>
          <div className="w-px h-4 bg-slate-800/80 self-center mx-1 shrink-0" />

          <div className="relative" ref={dropdownRef}>
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
