import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps, Node } from '@xyflow/react';
import { Database, Globe, Zap, Cpu, Layers, Share2, Trash2 } from 'lucide-react';
import type { NodeType } from '../domain/schema';
import { useBlueprintStore } from './store';

type CustomNode = Node<
  {
    id: string;
    type: NodeType;
    name: string;
    properties: Record<string, string | number | boolean>;
  },
  'blueprintNode'
>;

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
  'relational-database': {
    label: 'Relational DB',
    icon: Database,
    color: '#06b6d4', // cyan-500
    bg: 'rgba(6, 182, 212, 0.08)',
    border: 'rgba(6, 182, 212, 0.3)',
  },
  'event-broker': {
    label: 'Event Broker',
    icon: Share2,
    color: '#a855f7', // purple-500
    bg: 'rgba(168, 85, 247, 0.08)',
    border: 'rgba(168, 85, 247, 0.3)',
  },
  'grpc-service': {
    label: 'gRPC Service',
    icon: Cpu,
    color: '#3b82f6', // blue-500
    bg: 'rgba(59, 130, 246, 0.08)',
    border: 'rgba(59, 130, 246, 0.3)',
  },
  'serverless-function': {
    label: 'Serverless Fn',
    icon: Zap,
    color: '#eab308', // yellow-500
    bg: 'rgba(234, 179, 8, 0.08)',
    border: 'rgba(234, 179, 8, 0.3)',
  },
  'rest-api': {
    label: 'REST API',
    icon: Globe,
    color: '#10b981', // emerald-500
    bg: 'rgba(16, 185, 129, 0.08)',
    border: 'rgba(16, 185, 129, 0.3)',
  },
  'cache-store': {
    label: 'Cache Store',
    icon: Layers,
    color: '#f97316', // orange-500
    bg: 'rgba(249, 115, 22, 0.08)',
    border: 'rgba(249, 115, 22, 0.3)',
  },
  'gateway-api': {
    label: 'Gateway API',
    icon: Globe,
    color: '#14b8a6', // teal-500
    bg: 'rgba(20, 184, 166, 0.08)',
    border: 'rgba(20, 184, 166, 0.3)',
  },
  'background-worker': {
    label: 'Background Worker',
    icon: Cpu,
    color: '#6366f1', // indigo-500
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

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    selectNode(id);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteNode(id);
  };

  return (
    <div
      onClick={handleClick}
      className={`relative w-64 rounded-xl border p-4 transition-all duration-200 cursor-pointer ${
        selected
          ? 'border-brand-500 shadow-[0_0_15px_rgba(139,92,246,0.3)] bg-slate-900/90 scale-102'
          : 'border-slate-800 bg-slate-950/80 hover:border-slate-700'
      }`}
      style={{
        boxShadow: selected ? undefined : '0 4px 12px rgba(0, 0, 0, 0.25)',
        backdropFilter: 'blur(8px)',
      }}
    >
      {/* Handles */}
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

      <div className="flex items-start justify-between">
        {/* Header Icon + Label */}
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

        {/* Delete button (only visible when selected) */}
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

      {/* Body Content */}
      <div className="mt-3">
        <h4 className="font-semibold text-slate-100 truncate text-base leading-tight">{name}</h4>
        <p className="text-xs text-slate-400 font-mono mt-1 select-all" title="Component ID">
          {id}
        </p>
      </div>

      {/* Bottom Type Tag */}
      <div className="mt-4 flex items-center justify-between border-t border-slate-900 pt-2 text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
        <span>{config.label}</span>
      </div>
    </div>
  );
});

BlueprintNode.displayName = 'BlueprintNode';
