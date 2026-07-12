import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps, Node } from '@xyflow/react';
import {
  Database,
  Globe,
  Zap,
  Cpu,
  Layers,
  Share2,
  Trash2,
  User,
  Network,
  Monitor,
  Smartphone,
  Code,
  ZoomIn,
} from 'lucide-react';
import type { NodeType } from '../../../../../core';
import { useBlueprintStore } from '../../../../../application/store/store';
import type { ComponentNodeData } from '../../../../../application/store/store';

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
};

export const BlueprintNode = memo(({ data, selected }: NodeProps<CustomNode>) => {
  const { id, type, name } = data;
  const config = nodeTypeConfigs[type as NodeType] || nodeTypeConfigs['rest-api'];
  const Icon = config.icon;

  const selectNode = useBlueprintStore(state => state.selectNode);
  const deleteNode = useBlueprintStore(state => state.deleteNode);
  const zoomIntoNode = useBlueprintStore(state => state.zoomIntoNode);
  const loadedSystems = useBlueprintStore(state => state.loadedSystems);

  const hasSubDiagram = React.useMemo(() => {
    if (data.c4Ref) return true;
    if (!data.entityRef) return false;
    return loadedSystems.some(
      s => s.schema.level === 'component' && s.schema.parentRef === data.entityRef
    );
  }, [data.c4Ref, data.entityRef, loadedSystems]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    selectNode(id);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteNode(id);
  };

  const borderClass = data.external
    ? 'border-dashed border-slate-700 bg-slate-950/45 opacity-70 shadow-none hover:border-slate-500'
    : selected
      ? 'border-brand-500 shadow-[0_0_15px_rgba(139,92,246,0.3)] bg-slate-900/90 scale-102'
      : 'border-slate-800 bg-slate-950/80 hover:border-slate-700';

  return (
    <div
      onClick={handleClick}
      className={`relative w-64 rounded-xl border p-4 transition-all duration-200 cursor-pointer ${borderClass}`}
      style={{
        boxShadow: selected || data.external ? undefined : '0 4px 12px rgba(0, 0, 0, 0.25)',
        backdropFilter: 'blur(8px)',
      }}
    >
      {/* Top handles */}
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

      {/* Bottom handles */}
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

      {/* Left handles */}
      <Handle
        type="target"
        position={Position.Left}
        id="left-target"
        className="!w-2.5 !h-2.5 !bg-brand-500 !border-slate-950"
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left-source"
        className="!w-2.5 !h-2.5 !bg-brand-500 !border-slate-950"
      />

      {/* Right handles */}
      <Handle
        type="target"
        position={Position.Right}
        id="right-target"
        className="!w-2.5 !h-2.5 !bg-brand-500 !border-slate-950"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right-source"
        className="!w-2.5 !h-2.5 !bg-brand-500 !border-slate-950"
      />

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

        {hasSubDiagram && (
          <button
            onClick={e => {
              e.stopPropagation();
              zoomIntoNode(id);
            }}
            className="flex items-center gap-1 bg-brand-500/10 border border-brand-500/30 hover:bg-brand-500/20 active:bg-brand-500/30 text-brand-400 px-1.5 py-0.5 rounded text-[8px] font-bold tracking-wider uppercase transition cursor-pointer z-10"
            title="Click to zoom inside"
          >
            <ZoomIn className="w-2.5 h-2.5" />
            <span>Zoom</span>
          </button>
        )}

        {selected && (
          <button
            onClick={handleDelete}
            className="p-1 rounded-md text-slate-400 hover:text-red-400 hover:bg-slate-800 transition"
            title="Delete component"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="mt-3">
        <h4 className="font-semibold text-slate-100 truncate text-base leading-tight">
          {name}
          {data.external && (
            <span className="text-[10px] text-slate-500 font-normal ml-1.5">(External)</span>
          )}
        </h4>
        <p className="text-xs text-slate-400 font-mono mt-1 select-all" title="Component ID">
          {id}
        </p>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-slate-900 pt-2 text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
        <span>{config.label}</span>
        {data.isTest && (
          <span className="bg-red-500/10 text-red-400 px-1.5 py-0.5 rounded text-[9px] font-bold border border-red-500/20 tracking-normal normal-case">
            TEST
          </span>
        )}
      </div>
    </div>
  );
});

BlueprintNode.displayName = 'BlueprintNode';
