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

function getNextLevel(current: C4Level): C4Level {
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
        const ref = s.schema.entityRef;
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

    while (currentSystem.schema.entityRef && !visited.has(currentSystem.path)) {
      visited.add(currentSystem.path);
      const parentRef = currentSystem.schema.entityRef;
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
    return loadedSystems.some(s => s.schema.entityRef === entityRef);
  }, [selectedNode, loadedSystems]);

  const segments = useMemo(() => {
    const next: BreadcrumbSegment[] = [
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
        ? loadedSystems.find(s => s.schema.entityRef === entityRef)
        : undefined;
      const targetPath = childSystem?.path || '';

      next.push({
        name: selectedNode.name || selectedNode.entityRef || '',
        path: targetPath,
        level: childSystem?.schema.level || getNextLevel(activeLevel),
        entityRef: selectedNode.entityRef || '',
        isZoomPreview: true,
      });
    }

    return next;
  }, [
    ancestors,
    schema,
    currentFilePath,
    activeLevel,
    workspaceName,
    hasNextHierarchy,
    selectedNode,
    loadedSystems,
  ]);

  const currentChildren = getSegmentChildren(currentFilePath);

  const segmentsWithSiblings = useMemo(() => {
    return segments.map((seg, idx) => {
      const sameLevelSystems = loadedSystems.filter(s => {
        if (s.schema.level !== seg.level || s.path === seg.path) return false;
        if (idx === 0) return true;

        // Find parent segment
        const parentSeg = segments[idx - 1];
        if (!parentSeg) return false;

        const parentSystem = loadedSystems.find(p => p.path === parentSeg.path);
        if (!parentSystem) return false;

        // Check if s is a child of the parent system
        return parentSystem.schema.nodes.some(n => n.entityRef === s.schema.entityRef);
      });
      return { ...seg, sameLevelSystems };
    });
  }, [segments, loadedSystems]);

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
