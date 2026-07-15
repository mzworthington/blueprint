import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useBlueprintStore } from '../../../../../application/store/store';
import { getSchemaEntityRef, type C4Level } from '@blueprint/core';

export interface BreadcrumbSegment {
  name: string;
  path: string;
  level: C4Level;
  entityRef: string;
  isZoomPreview: boolean;
}

export interface UseeBreadcrumbsReturn {
  // State
  openDropdownIdx: number | null;
  setOpenDropdownIdx: (idx: number | null) => void;
  dropdownRef: React.RefObject<HTMLDivElement | null>;
  // Derived
  activeLevel: C4Level;
  segments: BreadcrumbSegment[];
  ancestors: Array<{ path: string; name: string; level: C4Level; entityRef: string }>;
  hasNextLevelChildren: boolean;
  currentChildren: Array<{ path: string; name: string }>;
  // Helpers
  getSegmentChildren: (segPath: string) => Array<{ path: string; name: string }>;
  getNextLevel: (current: C4Level) => C4Level;
  // Store passthrough
  isWorkspaceOpen: boolean;
  workspaceName: string | undefined;
  selectSystem: (path: string) => void;
}

export function useBreadcrumbs(): UseeBreadcrumbsReturn {
  const {
    currentFilePath,
    schema,
    isWorkspaceOpen,
    workspaceName,
    selectedNodeId,
    loadedSystems,
    selectSystem,
  } = useBlueprintStore();

  const [openDropdownIdx, setOpenDropdownIdx] = useState<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdownIdx(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getSegmentChildren = useCallback(
    (segPath: string) => {
      const system = loadedSystems.find(s => s.path === segPath);
      if (!system) return [];

      const nodeEntityRefs = new Set(
        system.schema.nodes.map(n => n.entityRef).filter((ref): ref is string => !!ref)
      );

      const childSystems = loadedSystems.filter(s => {
        const ref = s.schema.entityRef || s.schema.id;
        return ref && nodeEntityRefs.has(ref);
      });

      return childSystems.map(childSystem => ({
        path: childSystem.path,
        name: childSystem.name,
        entityRef: getSchemaEntityRef(childSystem.schema, workspaceName),
      }));
    },
    [loadedSystems, workspaceName]
  );

  const activeLevel = (schema.level || 'container') as C4Level;

  const ancestors = useMemo(() => {
    const list: Array<{ path: string; name: string; level: C4Level; entityRef: string }> = [];
    const activeSystem = loadedSystems.find(s => s.path === currentFilePath);
    if (!activeSystem) return list;

    let currentSystem = activeSystem;
    const visited = new Set<string>();

    while (
      (currentSystem.schema.entityRef || currentSystem.schema.id) &&
      !visited.has(currentSystem.path)
    ) {
      visited.add(currentSystem.path);
      const parentRef = currentSystem.schema.entityRef || currentSystem.schema.id;
      const parentSystem = loadedSystems.find(s =>
        s.schema.nodes.some(n => n.entityRef === parentRef)
      );
      if (parentSystem) {
        list.unshift({
          path: parentSystem.path,
          name: parentSystem.name,
          level: (parentSystem.schema.level || 'container') as C4Level,
          entityRef: getSchemaEntityRef(parentSystem.schema, workspaceName),
        });
        currentSystem = parentSystem;
      } else {
        break;
      }
    }
    return list;
  }, [loadedSystems, currentFilePath, workspaceName]);

  const selectedNode = selectedNodeId
    ? schema.nodes.find(n => n.entityRef === selectedNodeId)
    : null;

  const hasNextHierarchy = useMemo(() => {
    if (!selectedNode) return false;
    const entityRef = selectedNode.entityRef;
    if (!entityRef) return false;
    return loadedSystems.some(
      s =>
        (s.schema.entityRef === entityRef || s.schema.id === entityRef) &&
        s.schema.level === 'component'
    );
  }, [selectedNode, loadedSystems]);

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

  const segments: BreadcrumbSegment[] = [
    ...ancestors.map(anc => ({
      name: anc.name,
      path: anc.path,
      level: anc.level,
      entityRef: anc.entityRef,
      isZoomPreview: false,
    })),
    {
      name: schema.name,
      path: currentFilePath,
      level: activeLevel,
      entityRef: getSchemaEntityRef(schema, workspaceName),
      isZoomPreview: false,
    },
  ];

  if (hasNextHierarchy && selectedNode) {
    const entityRef = selectedNode.entityRef;
    const childSystem = entityRef
      ? loadedSystems.find(
          s =>
            (s.schema.entityRef === entityRef || s.schema.id === entityRef) &&
            s.schema.level === 'component'
        )
      : undefined;
    const targetPath = childSystem?.path || '';

    segments.push({
      name: selectedNode.name || selectedNode.entityRef || '',
      path: targetPath,
      level: getNextLevel(activeLevel),
      entityRef: selectedNode.entityRef || '',
      isZoomPreview: true,
    });
  }

  const currentChildren = getSegmentChildren(currentFilePath);

  const segmentsWithSiblings = useMemo(() => {
    const activeSystem = loadedSystems.find(s => s.path === currentFilePath);
    const currentSystemId = activeSystem?.schema.entityRef || 'default';
    return segments.map((seg, idx) => {
      const sameLevelSystems = loadedSystems.filter(s => {
        if (s.schema.level !== seg.level || s.path === seg.path) return false;
        if (isWorkspaceOpen) return true;
        if (idx === 0) return true;
        return (s.schema.entityRef || 'default') === currentSystemId;
      });
      return { ...seg, sameLevelSystems };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segments, loadedSystems, currentFilePath, isWorkspaceOpen]);

  return {
    openDropdownIdx,
    setOpenDropdownIdx,
    dropdownRef,
    activeLevel,
    segments: segmentsWithSiblings as unknown as BreadcrumbSegment[],
    ancestors,
    hasNextLevelChildren: currentChildren.length > 0,
    currentChildren,
    getSegmentChildren,
    getNextLevel,
    isWorkspaceOpen,
    workspaceName,
    selectSystem,
  };
}
