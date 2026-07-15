import React from 'react';
import type { SystemNode, SystemSchema, C4Level } from '@blueprint/core';
import { NODE_TYPES } from './nodeTypes';
import { CopyableField } from './CopyableField';

interface IdentitySectionProps {
  isNode: boolean;
  schema: SystemSchema;
  selectedNode: SystemNode | null;
  nameValue: string;
  nameInputId: string;
  entityRefValue: string;
  entityRefInputId: string;
  selectId: string;
  onNameChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onTypeOrLevelChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onExternalChange: (checked: boolean) => void;
}

export const IdentitySection: React.FC<IdentitySectionProps> = ({
  isNode,
  schema,
  selectedNode,
  nameValue,
  nameInputId,
  entityRefValue,
  entityRefInputId,
  selectId,
  onNameChange,
  onTypeOrLevelChange,
  onExternalChange,
}) => (
  <div className="space-y-4">
    <div>
      <label
        htmlFor={nameInputId}
        className="block text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider mb-1.5"
      >
        Name
      </label>
      <input
        id={nameInputId}
        type="text"
        value={nameValue}
        onChange={onNameChange}
        className="w-full bg-slate-950/60 border border-slate-800 focus:border-brand-500 focus:shadow-[0_0_10px_rgba(139,92,246,0.15)] rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none transition duration-200"
      />
    </div>

    <div>
      <label
        htmlFor={selectId}
        className="block text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider mb-1.5"
      >
        {isNode ? 'Type' : 'C4 Level'}
      </label>
      <select
        id={selectId}
        value={isNode ? selectedNode!.type : schema.level}
        onChange={onTypeOrLevelChange}
        className="w-full bg-slate-950/60 border border-slate-800 focus:border-brand-500 focus:shadow-[0_0_10px_rgba(139,92,246,0.15)] rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none transition duration-200 cursor-pointer"
      >
        {isNode
          ? NODE_TYPES.map(nt => (
              <option key={nt.type} value={nt.type}>
                {nt.label}
              </option>
            ))
          : (
              [
                { type: 'context' as C4Level, label: 'System Context' },
                { type: 'container' as C4Level, label: 'Container Level' },
                { type: 'component' as C4Level, label: 'Component Level' },
                { type: 'code' as C4Level, label: 'Code Level' },
              ] as const
            ).map(opt => (
              <option key={opt.type} value={opt.type}>
                {opt.label}
              </option>
            ))}
      </select>
    </div>

    <CopyableField id={entityRefInputId} label="Entity Reference" value={entityRefValue} />

    {isNode && selectedNode && (
      <div className="flex items-center justify-between border-t border-slate-900/60 pt-3">
        <label
          htmlFor="component-external-checkbox"
          className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider"
        >
          External System / Actor
        </label>
        <input
          id="component-external-checkbox"
          type="checkbox"
          checked={!!selectedNode.external}
          onChange={e => onExternalChange(e.target.checked)}
          className="w-4 h-4 rounded border-slate-800 text-brand-500 focus:ring-brand-500 bg-slate-950/60 cursor-pointer focus:ring-offset-0 focus:outline-none"
        />
      </div>
    )}
  </div>
);
