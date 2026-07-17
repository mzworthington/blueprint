import React from 'react';
import { Link } from 'lucide-react';
import type { C4Level, NodeType } from '@blueprint/core';
import { useExternalDependenciesPanel } from './useExternalDependenciesPanel';

const LEVEL_OPTIONS: Array<{ value: 'all' | C4Level; label: string }> = [
  { value: 'all', label: 'All levels' },
  { value: 'context', label: 'Context' },
  { value: 'container', label: 'Container' },
  { value: 'component', label: 'Component' },
  { value: 'code', label: 'Code' },
];

export const ExternalDependenciesSection: React.FC = () => {
  const {
    search,
    setSearch,
    levelFilter,
    setLevelFilter,
    typeFilter,
    setTypeFilter,
    availableTypes,
    candidates,
    selected,
    toggleSelected,
    handleAdd,
    handleSyncSuggested,
    canAdd,
  } = useExternalDependenciesPanel();

  return (
    <section className="border-t border-slate-900 pt-4">
      <SectionHeader />
      <p className="text-xs text-slate-400 mb-3">
        Pull entities from elsewhere in the workspace onto this diagram as external proxies.
      </p>

      <div className="space-y-2 mb-3">
        <input
          type="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search name or entityRef"
          aria-label="Search external dependencies"
          className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-brand-500/40"
        />
        <SectionFilters
          levelFilter={levelFilter}
          setLevelFilter={setLevelFilter}
          typeFilter={typeFilter}
          setTypeFilter={setTypeFilter}
          availableTypes={availableTypes}
        />
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-950/40 divide-y divide-slate-800/80 max-h-48 overflow-y-auto mb-3">
        {candidates.length === 0 ? (
          <p className="p-3 text-xs text-slate-500 italic">No matching workspace entities.</p>
        ) : (
          candidates.map(candidate => (
            <label
              key={candidate.entityRef}
              className="flex items-start gap-2 p-2.5 hover:bg-slate-900/60 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selected.has(candidate.entityRef)}
                onChange={() => toggleSelected(candidate.entityRef)}
                className="mt-0.5 w-3.5 h-3.5 rounded border-slate-700 text-brand-500 focus:ring-brand-500 bg-slate-950"
              />
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-semibold text-slate-200 truncate">
                  {candidate.name}
                </span>
                <span className="block text-[10px] font-mono text-slate-500 truncate">
                  {candidate.entityRef}
                </span>
                <span className="block text-[10px] text-slate-600">
                  {candidate.sourceSchemaLevel} · {candidate.type}
                </span>
              </span>
            </label>
          ))
        )}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSyncSuggested}
          className="flex-1 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white border border-slate-700 hover:border-slate-500 rounded-lg transition cursor-pointer"
        >
          Sync suggested
        </button>
        <button
          type="button"
          onClick={handleAdd}
          disabled={!canAdd}
          className="flex-1 px-3 py-2 text-xs font-semibold bg-brand-700 hover:bg-brand-800 text-white rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
        >
          Add selected
        </button>
      </div>
    </section>
  );
};

function SectionHeader() {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Link className="w-3.5 h-3.5 text-[#00f0ff] shrink-0" />
      <h4 className="text-[10px] font-bold font-mono text-brand-400 uppercase tracking-wider">
        External Dependencies
      </h4>
    </div>
  );
}

function SectionFilters({
  levelFilter,
  setLevelFilter,
  typeFilter,
  setTypeFilter,
  availableTypes,
}: {
  levelFilter: 'all' | C4Level;
  setLevelFilter: (value: 'all' | C4Level) => void;
  typeFilter: 'all' | NodeType;
  setTypeFilter: (value: 'all' | NodeType) => void;
  availableTypes: NodeType[];
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <select
        value={levelFilter}
        onChange={e => setLevelFilter(e.target.value as 'all' | C4Level)}
        aria-label="Filter by source level"
        className="bg-slate-950/60 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-brand-500/40"
      >
        {LEVEL_OPTIONS.map(opt => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <select
        value={typeFilter}
        onChange={e => setTypeFilter(e.target.value as 'all' | NodeType)}
        aria-label="Filter by node type"
        className="bg-slate-950/60 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-brand-500/40"
      >
        <option value="all">All types</option>
        {availableTypes.map(type => (
          <option key={type} value={type}>
            {type}
          </option>
        ))}
      </select>
    </div>
  );
}
