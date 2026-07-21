import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps, Node } from '@xyflow/react';
import { Layers } from 'lucide-react';
import type { ComponentNodeData } from '../../../../../application/store/store';

type GroupNode = Node<ComponentNodeData, 'blueprintGroup'>;

const handleClass = '!w-2.5 !h-2.5 !bg-brand-500 !border-slate-950';

export const BlueprintGroupNode = memo(({ data, selected }: NodeProps<GroupNode>) => {
  return (
    <div
      className={`w-full h-full rounded-2xl border-2 border-dashed transition-colors ${
        selected ? 'border-brand-400/60 bg-brand-500/5' : 'border-slate-700/80 bg-slate-950/30'
      }`}
    >
      <Handle type="target" position={Position.Left} id="left-target" className={handleClass} />
      <Handle type="source" position={Position.Right} id="right-source" className={handleClass} />
      <Handle type="target" position={Position.Top} id="top-target" className={handleClass} />
      <Handle type="source" position={Position.Top} id="top-source" className={handleClass} />
      <Handle type="target" position={Position.Bottom} id="bottom-target" className={handleClass} />
      <Handle type="source" position={Position.Bottom} id="bottom-source" className={handleClass} />
      <Handle type="source" position={Position.Left} id="left-source" className={handleClass} />
      <Handle type="target" position={Position.Right} id="right-target" className={handleClass} />

      <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-800/80 pointer-events-none">
        <Layers className="w-4 h-4 text-slate-400 shrink-0" />
        <span className="text-xs font-semibold text-slate-300 truncate">{data.name}</span>
      </div>
    </div>
  );
});

BlueprintGroupNode.displayName = 'BlueprintGroupNode';
