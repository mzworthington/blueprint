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

  const activeLevel = schema.level || 'container';
  const levelConfig = LEVEL_CONFIGS[activeLevel];
  const LevelIcon = levelConfig.icon;

  const handleBreadcrumbClick = async (targetIndex: number) => {
    const popCount = navigationStack.length - targetIndex;
    for (let i = 0; i < popCount; i++) {
      await zoomOut();
    }
  };

  const getFileName = (p: string) => p.split('/').pop() || p;

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
