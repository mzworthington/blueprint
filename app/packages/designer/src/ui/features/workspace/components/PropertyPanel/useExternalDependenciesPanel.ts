import { useCallback, useMemo, useState } from 'react';
import type { C4Level, NodeType } from '@blueprint/core';
import { useBlueprintStore } from '../../../../../application/store/store';

type LevelFilter = 'all' | C4Level;

export function useExternalDependenciesPanel() {
  const listWorkspaceExternalCandidates = useBlueprintStore(s => s.listWorkspaceExternalCandidates);
  const addExternalDependencies = useBlueprintStore(s => s.addExternalDependencies);
  const syncSuggestedExternals = useBlueprintStore(s => s.syncSuggestedExternals);

  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState<LevelFilter>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | NodeType>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const candidates = useMemo(() => {
    return listWorkspaceExternalCandidates({
      search: search || undefined,
      sourceSchemaLevels: levelFilter === 'all' ? undefined : [levelFilter],
      types: typeFilter === 'all' ? undefined : [typeFilter],
    });
  }, [listWorkspaceExternalCandidates, search, levelFilter, typeFilter]);

  const availableTypes = useMemo(() => {
    const types = new Set<NodeType>();
    for (const candidate of listWorkspaceExternalCandidates()) {
      types.add(candidate.type);
    }
    return [...types].sort();
  }, [listWorkspaceExternalCandidates]);

  const toggleSelected = useCallback((entityRef: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(entityRef)) next.delete(entityRef);
      else next.add(entityRef);
      return next;
    });
  }, []);

  const handleAdd = useCallback(() => {
    if (selected.size === 0) return;
    addExternalDependencies([...selected]);
    setSelected(new Set());
  }, [addExternalDependencies, selected]);

  const handleSyncSuggested = useCallback(() => {
    syncSuggestedExternals();
    setSelected(new Set());
  }, [syncSuggestedExternals]);

  return {
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
    canAdd: selected.size > 0,
  };
}
