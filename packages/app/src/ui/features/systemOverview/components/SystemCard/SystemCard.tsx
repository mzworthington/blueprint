import React, { useMemo } from 'react';
import { ReactFlow, Background, BackgroundVariant, type Node, type Edge } from '@xyflow/react';
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
  ArrowRight,
} from 'lucide-react';
import type { NodeType, SystemSchema } from '@blueprint/core';

// ─── Node type icon/colour config (mirrors BlueprintNode, but lightweight) ───

const NODE_CONFIG: Record<
  NodeType,
  { label: string; icon: React.ComponentType<any>; color: string; bg: string; border: string }
> = {
  person: {
    label: 'Person',
    icon: User,
    color: '#ec4899',
    bg: 'rgba(236,72,153,0.12)',
    border: 'rgba(236,72,153,0.35)',
  },
  'software-system': {
    label: 'Software System',
    icon: Network,
    color: '#3b82f6',
    bg: 'rgba(59,130,246,0.12)',
    border: 'rgba(59,130,246,0.35)',
  },
  'web-app': {
    label: 'Web App',
    icon: Monitor,
    color: '#06b6d4',
    bg: 'rgba(6,182,212,0.12)',
    border: 'rgba(6,182,212,0.35)',
  },
  'mobile-app': {
    label: 'Mobile App',
    icon: Smartphone,
    color: '#10b981',
    bg: 'rgba(16,185,129,0.12)',
    border: 'rgba(16,185,129,0.35)',
  },
  'single-page-app': {
    label: 'SPA',
    icon: Monitor,
    color: '#14b8a6',
    bg: 'rgba(20,184,166,0.12)',
    border: 'rgba(20,184,166,0.35)',
  },
  microservice: {
    label: 'Microservice',
    icon: Cpu,
    color: '#8b5cf6',
    bg: 'rgba(139,92,246,0.12)',
    border: 'rgba(139,92,246,0.35)',
  },
  database: {
    label: 'Database',
    icon: Database,
    color: '#f43f5e',
    bg: 'rgba(244,63,94,0.12)',
    border: 'rgba(244,63,94,0.35)',
  },
  'cache-store': {
    label: 'Cache',
    icon: Layers,
    color: '#f97316',
    bg: 'rgba(249,115,22,0.12)',
    border: 'rgba(249,115,22,0.35)',
  },
  'event-broker': {
    label: 'Event Broker',
    icon: Share2,
    color: '#a855f7',
    bg: 'rgba(168,85,247,0.12)',
    border: 'rgba(168,85,247,0.35)',
  },
  'serverless-app': {
    label: 'Serverless',
    icon: Zap,
    color: '#eab308',
    bg: 'rgba(234,179,8,0.12)',
    border: 'rgba(234,179,8,0.35)',
  },
  component: {
    label: 'Component',
    icon: Layers,
    color: '#6366f1',
    bg: 'rgba(99,102,241,0.12)',
    border: 'rgba(99,102,241,0.35)',
  },
  'code-module': {
    label: 'Code Module',
    icon: Code,
    color: '#cbd5e1',
    bg: 'rgba(203,213,225,0.12)',
    border: 'rgba(203,213,225,0.35)',
  },
  'relational-database': {
    label: 'Relational DB',
    icon: Database,
    color: '#06b6d4',
    bg: 'rgba(6,182,212,0.12)',
    border: 'rgba(6,182,212,0.35)',
  },
  'grpc-service': {
    label: 'gRPC',
    icon: Cpu,
    color: '#3b82f6',
    bg: 'rgba(59,130,246,0.12)',
    border: 'rgba(59,130,246,0.35)',
  },
  'serverless-function': {
    label: 'Fn',
    icon: Zap,
    color: '#eab308',
    bg: 'rgba(234,179,8,0.12)',
    border: 'rgba(234,179,8,0.35)',
  },
  'rest-api': {
    label: 'REST API',
    icon: Globe,
    color: '#10b981',
    bg: 'rgba(16,185,129,0.12)',
    border: 'rgba(16,185,129,0.35)',
  },
  'gateway-api': {
    label: 'Gateway',
    icon: Globe,
    color: '#14b8a6',
    bg: 'rgba(20,184,166,0.12)',
    border: 'rgba(20,184,166,0.35)',
  },
  'background-worker': {
    label: 'Worker',
    icon: Cpu,
    color: '#6366f1',
    bg: 'rgba(99,102,241,0.12)',
    border: 'rgba(99,102,241,0.35)',
  },
};

// ─── Mini node renderer ───────────────────────────────────────────────────────

interface MiniNodeProps {
  data: { label: string; type: NodeType };
}

const MiniNode: React.FC<MiniNodeProps> = ({ data }) => {
  const cfg = NODE_CONFIG[data.type] ?? NODE_CONFIG['rest-api'];
  const Icon = cfg.icon;
  return (
    <div
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[10px] font-semibold font-mono select-none"
      style={{ color: cfg.color, backgroundColor: cfg.bg, borderColor: cfg.border, minWidth: 120 }}
    >
      <Icon style={{ width: 10, height: 10, flexShrink: 0 }} />
      <span className="truncate max-w-[100px]">{data.label}</span>
    </div>
  );
};

const nodeTypes = { mini: MiniNode };

// ─── SystemCard ───────────────────────────────────────────────────────────────

const COLS = 2;
const NODE_W = 144;
const NODE_H = 38;
const GAP_X = 24;
const GAP_Y = 16;
const PAD = 16;

interface SystemCardProps {
  schema: SystemSchema;
  name: string;
  /** Whether this card has at least one outgoing cross-system dependency. */
  hasCrossSystemDeps?: boolean;
  onClick: () => void;
}

export const SystemCard: React.FC<SystemCardProps> = ({
  schema,
  name,
  hasCrossSystemDeps,
  onClick,
}) => {
  const nodes: Node[] = useMemo(() => {
    return schema.nodes
      .filter(n => !n.isTest)
      .map((n, i) => {
        const col = i % COLS;
        const row = Math.floor(i / COLS);
        return {
          id: n.id,
          type: 'mini',
          position: {
            x: PAD + col * (NODE_W + GAP_X),
            y: PAD + row * (NODE_H + GAP_Y),
          },
          data: { label: n.name, type: n.type },
          draggable: false,
          selectable: false,
          connectable: false,
        } satisfies Node;
      });
  }, [schema.nodes]);

  const edges: Edge[] = useMemo(() => {
    return schema.dependencies.map(dep => ({
      id: `${dep.from}-${dep.to}`,
      source: dep.from,
      target: dep.to,
      animated: dep.type === 'publish-subscribe',
      style: { stroke: 'rgba(99,102,241,0.5)', strokeWidth: 1.5 },
      type: 'default',
    }));
  }, [schema.dependencies]);

  const rows = Math.ceil(schema.nodes.filter(n => !n.isTest).length / COLS);
  const canvasH = Math.max(rows * (NODE_H + GAP_Y) + PAD * 2, 100);

  return (
    <div
      data-testid={`system-card-${name}`}
      onClick={onClick}
      className="group relative flex flex-col rounded-2xl border border-slate-800 bg-slate-950/70 hover:border-brand-500/50 hover:bg-slate-900/80 transition-all duration-200 cursor-pointer overflow-hidden shadow-lg hover:shadow-brand-500/10"
      style={{ backdropFilter: 'blur(12px)' }}
    >
      {/* Card header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2 shrink-0">
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-slate-100 truncate">{name}</h3>
          <p className="text-[10px] text-slate-500 font-mono mt-0.5 uppercase tracking-wider">
            {schema.level} · {schema.nodes.filter(n => !n.isTest).length} components
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {hasCrossSystemDeps && (
            <span
              title="Has cross-system dependencies"
              className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-brand-950/40 border border-brand-500/20 text-brand-400 text-[9px] font-bold uppercase tracking-wider"
            >
              <ArrowRight style={{ width: 9, height: 9 }} />
              <span>Linked</span>
            </span>
          )}
          <span className="text-[10px] text-slate-500 group-hover:text-brand-400 font-mono transition-colors">
            Open →
          </span>
        </div>
      </div>

      {/* Mini ReactFlow canvas — read-only */}
      <div style={{ height: canvasH }} className="w-full pointer-events-none">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          panOnDrag={false}
          zoomOnScroll={false}
          zoomOnPinch={false}
          zoomOnDoubleClick={false}
          preventScrolling={false}
          proOptions={{ hideAttribution: true }}
        >
          <Background
            color="rgba(99,102,241,0.04)"
            variant={BackgroundVariant.Dots}
            gap={16}
            size={1}
          />
        </ReactFlow>
      </div>
    </div>
  );
};
