import React, { memo, useEffect } from 'react';
import { Handle, Position, useUpdateNodeInternals } from '@xyflow/react';
import { useLocation } from 'wouter';
import type { NodeProps, Node } from '@xyflow/react';
import {
  Database,
  Globe,
  Zap,
  Cpu,
  Layers,
  Share2,
  User,
  Network,
  Monitor,
  Smartphone,
  Code,
  ZoomIn,
} from 'lucide-react';
import type { NodeType } from '@blueprint/core';
import { useBlueprintStore } from '../../../../../application/store/store';
import { guessBundledPathForEntityRef } from '../../../../../application/store/states/diagramState/bundledBlueprintLoader';
import type { ComponentNodeData } from '../../../../../application/store/store';
import { evaluateForensicsConcern } from '../../../../../application/forensics/concern';
import { useHasSubDiagram, useChildDiagramExternalsCount } from './SubDiagramRefsContext';
import { GoToEntityButton } from '../GoToEntityButton';
import { ViewChildExternalsButton } from '../ViewChildExternalsButton';

type CustomNode = Node<ComponentNodeData, 'blueprintNode'>;

const nodeTypeConfigs: Record<
  NodeType,
  {
    label: string;
    icon: React.ComponentType<any>;
    color: string;
    bg: string;
    border: string;
  }
> = {
  person: {
    label: 'Person (Actor)',
    icon: User,
    color: '#ec4899',
    bg: 'rgba(236, 72, 153, 0.08)',
    border: 'rgba(236, 72, 153, 0.3)',
  },
  'software-system': {
    label: 'Software System',
    icon: Network,
    color: '#3b82f6',
    bg: 'rgba(59, 130, 246, 0.08)',
    border: 'rgba(59, 130, 246, 0.3)',
  },
  group: {
    label: 'Group',
    icon: Layers,
    color: '#64748b',
    bg: 'rgba(100, 116, 139, 0.08)',
    border: 'rgba(100, 116, 139, 0.3)',
  },
  'web-app': {
    label: 'Web App',
    icon: Monitor,
    color: '#06b6d4',
    bg: 'rgba(6, 182, 212, 0.08)',
    border: 'rgba(6, 182, 212, 0.3)',
  },
  'mobile-app': {
    label: 'Mobile App',
    icon: Smartphone,
    color: '#10b981',
    bg: 'rgba(16, 185, 129, 0.08)',
    border: 'rgba(16, 185, 129, 0.3)',
  },
  'single-page-app': {
    label: 'Single Page App',
    icon: Monitor,
    color: '#14b8a6',
    bg: 'rgba(20, 184, 166, 0.08)',
    border: 'rgba(20, 184, 166, 0.3)',
  },
  microservice: {
    label: 'Microservice',
    icon: Cpu,
    color: '#8b5cf6',
    bg: 'rgba(139, 92, 246, 0.08)',
    border: 'rgba(139, 92, 246, 0.3)',
  },
  database: {
    label: 'Database',
    icon: Database,
    color: '#f43f5e',
    bg: 'rgba(244, 63, 94, 0.08)',
    border: 'rgba(244, 63, 94, 0.3)',
  },
  'cache-store': {
    label: 'Cache Store',
    icon: Layers,
    color: '#f97316',
    bg: 'rgba(249, 115, 22, 0.08)',
    border: 'rgba(249, 115, 22, 0.3)',
  },
  'event-broker': {
    label: 'Event Broker',
    icon: Share2,
    color: '#a855f7',
    bg: 'rgba(168, 85, 247, 0.08)',
    border: 'rgba(168, 85, 247, 0.3)',
  },
  'serverless-app': {
    label: 'Serverless App',
    icon: Zap,
    color: '#eab308',
    bg: 'rgba(234, 179, 8, 0.08)',
    border: 'rgba(234, 179, 8, 0.3)',
  },
  component: {
    label: 'Component',
    icon: Layers,
    color: '#6366f1',
    bg: 'rgba(99, 102, 241, 0.08)',
    border: 'rgba(99, 102, 241, 0.3)',
  },
  'code-module': {
    label: 'Code Module',
    icon: Code,
    color: '#cbd5e1',
    bg: 'rgba(203, 213, 225, 0.08)',
    border: 'rgba(203, 213, 225, 0.3)',
  },

  'relational-database': {
    label: 'Relational DB',
    icon: Database,
    color: '#06b6d4',
    bg: 'rgba(6, 182, 212, 0.08)',
    border: 'rgba(6, 182, 212, 0.3)',
  },
  'grpc-service': {
    label: 'gRPC Service',
    icon: Cpu,
    color: '#3b82f6',
    bg: 'rgba(59, 130, 246, 0.08)',
    border: 'rgba(59, 130, 246, 0.3)',
  },
  'serverless-function': {
    label: 'Serverless Fn',
    icon: Zap,
    color: '#eab308',
    bg: 'rgba(234, 179, 8, 0.08)',
    border: 'rgba(234, 179, 8, 0.3)',
  },
  'rest-api': {
    label: 'REST API',
    icon: Globe,
    color: '#10b981',
    bg: 'rgba(16, 185, 129, 0.08)',
    border: 'rgba(16, 185, 129, 0.3)',
  },
  'gateway-api': {
    label: 'Gateway API',
    icon: Globe,
    color: '#14b8a6',
    bg: 'rgba(20, 184, 166, 0.08)',
    border: 'rgba(20, 184, 166, 0.3)',
  },
  'background-worker': {
    label: 'Background Worker',
    icon: Cpu,
    color: '#6366f1',
    bg: 'rgba(99, 102, 241, 0.08)',
    border: 'rgba(99, 102, 241, 0.3)',
  },
  container: {
    label: 'Container',
    icon: Layers,
    color: '#8b5cf6',
    bg: 'rgba(139, 92, 246, 0.08)',
    border: 'rgba(139, 92, 246, 0.3)',
  },
};

export const BlueprintNode = memo(({ id, data, selected }: NodeProps<CustomNode>) => {
  const { type, name } = data;
  const config = nodeTypeConfigs[type as NodeType] || nodeTypeConfigs['rest-api'];
  const Icon = config.icon;

  const [, setLocation] = useLocation();
  const selectNode = useBlueprintStore(state => state.selectNode);
  const selectSystem = useBlueprintStore(state => state.selectSystem);
  const workspaceCatalog = useBlueprintStore(state => state.workspaceCatalog);
  const openSourceCodeDialog = useBlueprintStore(state => state.openSourceCodeDialog);
  const liteCanvas = useBlueprintStore(state => state.liteCanvas);
  const entityRef = data.entityRef;
  const hasSubDiagram = useHasSubDiagram(entityRef);
  const childExternalsCount = useChildDiagramExternalsCount(entityRef);
  const sourceFilepath =
    typeof data.properties?.filepath === 'string' ? data.properties.filepath : undefined;
  const updateNodeInternals = useUpdateNodeInternals();

  // Keep edge endpoints attached after lite-canvas chrome height changes.
  useEffect(() => {
    updateNodeInternals(id);
  }, [id, liteCanvas, updateNodeInternals]);

  const concern = React.useMemo(() => evaluateForensicsConcern(data.forensics), [data.forensics]);
  const classifications = data.forensics?.classifications ?? [];
  const showHotBadge = classifications.includes('hotspot') || concern.level === 'danger';
  const showSiloBadge =
    classifications.includes('knowledge-silo') ||
    (concern.level === 'warning' && concern.reasons.some(r => /silo/i.test(r)));
  const heat = typeof data.hotspotHeat === 'number' ? data.hotspotHeat : 0;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    selectNode(id);
  };

  const concernBorder =
    concern.level === 'danger'
      ? 'border-red-800/80'
      : concern.level === 'warning'
        ? 'border-amber-800/80'
        : null;

  const solidBg = heat > 0 ? 'bg-transparent' : 'bg-slate-950';
  const borderClass = data.external
    ? 'border-dashed border-cyan-600/70 bg-cyan-950 hover:border-cyan-500/80'
    : selected
      ? 'border-brand-500 bg-slate-900 scale-102'
      : data.couplingHighlight
        ? 'border-amber-500/70 bg-slate-900'
        : data.refactorBoundaryHighlight
          ? 'border-violet-500/70 bg-slate-900'
          : concernBorder
            ? `${concernBorder} ${solidBg} hover:border-slate-700`
            : `${solidBg} border-slate-800 hover:border-slate-700`;

  return (
    <div
      onClick={handleClick}
      data-coupling-highlight={data.couplingHighlight ? 'true' : undefined}
      data-hotspot-heat={heat > 0 ? heat.toFixed(2) : undefined}
      data-testid={
        liteCanvas ? 'blueprint-node-simplified' : heat > 0 ? 'hotspot-heat' : 'blueprint-node'
      }
      className={`relative w-64 rounded-xl border p-4 cursor-pointer ${
        liteCanvas ? '' : 'transition-colors duration-150'
      } ${borderClass}`}
      style={{
        boxShadow:
          selected || data.external || data.couplingHighlight || liteCanvas
            ? undefined
            : '0 4px 12px rgba(0, 0, 0, 0.25)',
        ...(heat > 0
          ? {
              backgroundImage: `linear-gradient(90deg, rgba(239, 68, 68, ${0.12 + heat * 0.45}) 0, rgba(239, 68, 68, ${0.12 + heat * 0.45}) 5px, rgba(239, 68, 68, ${0.04 + heat * 0.18}) 5px, rgba(239, 68, 68, ${0.04 + heat * 0.18}) 100%)`,
            }
          : {}),
      }}
    >
      {/* Always mount every handle — edges keep layout handle ids; unmounting orphans paths. */}
      <Handle
        type="target"
        position={Position.Left}
        id="left-target"
        className="!w-2.5 !h-2.5 !bg-brand-500 !border-slate-950"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right-source"
        className="!w-2.5 !h-2.5 !bg-brand-500 !border-slate-950"
      />
      <Handle
        type="target"
        position={Position.Top}
        id="top-target"
        className="!w-2.5 !h-2.5 !bg-brand-500 !border-slate-950"
      />
      <Handle
        type="source"
        position={Position.Top}
        id="top-source"
        className="!w-2.5 !h-2.5 !bg-brand-500 !border-slate-950"
      />
      <Handle
        type="target"
        position={Position.Bottom}
        id="bottom-target"
        className="!w-2.5 !h-2.5 !bg-brand-500 !border-slate-950"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom-source"
        className="!w-2.5 !h-2.5 !bg-brand-500 !border-slate-950"
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left-source"
        className="!w-2.5 !h-2.5 !bg-brand-500 !border-slate-950"
      />
      <Handle
        type="target"
        position={Position.Right}
        id="right-target"
        className="!w-2.5 !h-2.5 !bg-brand-500 !border-slate-950"
      />

      {!liteCanvas && (
        <div className="flex items-start justify-between">
          <div
            className="flex items-center justify-center p-2 rounded-lg border"
            style={{
              color: config.color,
              backgroundColor: config.bg,
              borderColor: config.border,
            }}
          >
            <Icon className="w-5 h-5" />
          </div>

          <div className="flex items-center gap-1">
            {sourceFilepath ? (
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  openSourceCodeDialog(sourceFilepath);
                }}
                className="flex items-center gap-1 bg-[#00f0ff]/10 border border-[#00f0ff]/30 hover:bg-[#00f0ff]/20 active:bg-[#00f0ff]/30 text-[#00f0ff] px-1.5 py-0.5 rounded text-[8px] font-bold tracking-wider uppercase transition cursor-pointer z-10"
                title="View source code"
                aria-label="View source code"
                data-testid="view-source-button"
              >
                <Code className="w-2.5 h-2.5" />
                <span>Code</span>
              </button>
            ) : null}

            {hasSubDiagram ? (
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  if (!data.entityRef) return;
                  setLocation(`/workspace/${data.entityRef}`);
                  const path =
                    workspaceCatalog.find(entry => entry.entityRef === data.entityRef)?.path ??
                    guessBundledPathForEntityRef(data.entityRef);
                  if (path) void selectSystem(path);
                }}
                className="flex items-center gap-1 bg-brand-500/10 border border-brand-500/30 hover:bg-brand-500/20 active:bg-brand-500/30 text-brand-400 px-1.5 py-0.5 rounded text-[8px] font-bold tracking-wider uppercase transition cursor-pointer z-10"
                title="Click to zoom inside"
              >
                <ZoomIn className="w-2.5 h-2.5" />
                <span>Zoom</span>
              </button>
            ) : null}

            {hasSubDiagram && entityRef && childExternalsCount > 0 ? (
              <ViewChildExternalsButton
                parentEntityRef={entityRef}
                externalsCount={childExternalsCount}
              />
            ) : null}

            {data.external && entityRef ? <GoToEntityButton entityRef={entityRef} /> : null}
          </div>
        </div>
      )}

      <div className={`${liteCanvas ? '' : 'mt-3'} min-w-0 overflow-hidden`}>
        <h4 className="font-semibold text-slate-100 truncate text-base leading-tight">
          {name}
          {data.external && (
            <span className="text-[10px] text-cyan-400/90 font-normal ml-1.5">(External)</span>
          )}
        </h4>
        <p
          className="text-xs text-slate-400 font-mono mt-1 truncate select-all"
          title={data.entityRef || id}
        >
          <span dir="rtl" className="block truncate">
            <bdi>{data.entityRef || id}</bdi>
          </span>
        </p>
      </div>

      {!liteCanvas && (
        <div className="mt-4 flex items-center justify-between border-t border-slate-900 pt-2 text-[10px] text-slate-400 uppercase tracking-wider font-semibold gap-2">
          <span className="truncate">{config.label}</span>
          <div className="flex items-center gap-1 shrink-0">
            {showHotBadge && (
              <span
                data-testid="forensics-badge-hot"
                className="bg-red-950/50 text-red-300 px-1.5 py-0.5 rounded text-[9px] font-bold border border-red-900/40 tracking-normal"
              >
                HOT
              </span>
            )}
            {showSiloBadge && (
              <span
                data-testid="forensics-badge-silo"
                className="bg-amber-950/50 text-amber-300 px-1.5 py-0.5 rounded text-[9px] font-bold border border-amber-900/40 tracking-normal"
              >
                SILO
              </span>
            )}
            {data.couplingHighlight && (
              <span
                data-testid="forensics-badge-coupled"
                className="bg-amber-950/50 text-amber-200 px-1.5 py-0.5 rounded text-[9px] font-bold border border-amber-800/50 tracking-normal"
              >
                COUPLED
              </span>
            )}
            {data.refactorBoundaryHighlight && (
              <span
                data-testid="forensics-badge-boundary"
                className="bg-violet-950/50 text-violet-200 px-1.5 py-0.5 rounded text-[9px] font-bold border border-violet-800/50 tracking-normal"
              >
                BOUNDARY
              </span>
            )}
            {data.isTest && (
              <span className="bg-red-500/10 text-red-400 px-1.5 py-0.5 rounded text-[9px] font-bold border border-red-500/20 tracking-normal normal-case">
                TEST
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

BlueprintNode.displayName = 'BlueprintNode';
