import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useBlueprintStore } from '../../../../../application/store/store';
import { getSystemIdFromPath, type C4Level } from '../../../../../core';

export interface BreadcrumbSegment {
  name: string;
  path: string;
  level: C4Level;
  onClick: () => void;
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
  ancestors: Array<{ path: string; name: string; level: C4Level }>;
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
    navigationStack,
    currentFilePath,
    schema,
    isWorkspaceOpen,
    workspaceName,
    zoomOut,
    selectedNodeId,
    zoomIntoNode,
    selectNode,
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

      const childSystems = loadedSystems.filter(
        s => s.schema.parentRef && nodeEntityRefs.has(s.schema.parentRef)
      );

      return childSystems.map(childSystem => ({
        path: childSystem.path,
        name: childSystem.name,
      }));
    },
    [loadedSystems]
  );

  const activeLevel = (schema.level || 'container') as C4Level;

  const handleBreadcrumbClick = async (targetIndex: number) => {
    const popCount = navigationStack.length - targetIndex;
    for (let i = 0; i < popCount; i++) {
      await zoomOut();
    }
  };

  const ancestors = useMemo(() => {
    const list: Array<{ path: string; name: string; level: C4Level }> = [];
    const activeSystem = loadedSystems.find(s => s.path === currentFilePath);
    if (!activeSystem) return list;

    let currentSystem = activeSystem;
    const visited = new Set<string>();

    while (currentSystem.schema.parentRef && !visited.has(currentSystem.path)) {
      visited.add(currentSystem.path);
      const parentRef = currentSystem.schema.parentRef;
      const parentSystem = loadedSystems.find(s =>
        s.schema.nodes.some(n => n.entityRef === parentRef)
      );
      if (parentSystem) {
        list.unshift({
          path: parentSystem.path,
          name: parentSystem.name,
          level: (parentSystem.schema.level || 'container') as C4Level,
        });
        currentSystem = parentSystem;
      } else {
        break;
      }
    }
    return list;
  }, [loadedSystems, currentFilePath]);

  const selectedNode = selectedNodeId ? schema.nodes.find(n => n.id === selectedNodeId) : null;

  const hasNextHierarchy = useMemo(() => {
    if (!selectedNode) return false;
    const entityRef = selectedNode.entityRef;
    if (!entityRef) return false;
    return loadedSystems.some(
      s => s.schema.parentRef === entityRef && s.schema.level === 'component'
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
    ...(ancestors.length > 0
      ? ancestors.map(anc => ({
          name: anc.name,
          path: anc.path,
          level: anc.level,
          onClick: () => selectSystem(anc.path),
          isZoomPreview: false,
        }))
      : navigationStack.map((hist, idx) => ({
          name: hist.schema.name,
          path: hist.path,
          level: (hist.schema.level || 'container') as C4Level,
          onClick: () => handleBreadcrumbClick(idx),
          isZoomPreview: false,
        }))),
    {
      name: schema.name,
      path: currentFilePath,
      level: activeLevel,
      onClick: () => {
        if (hasNextHierarchy) {
          selectNode(null);
        }
      },
      isZoomPreview: false,
    },
  ];

  if (hasNextHierarchy && selectedNode) {
    const entityRef = selectedNode.entityRef;
    const childSystem = entityRef
      ? loadedSystems.find(s => s.schema.parentRef === entityRef && s.schema.level === 'component')
      : undefined;
    const targetPath = childSystem?.path || '';

    segments.push({
      name: selectedNode.name || selectedNode.id,
      path: targetPath,
      level: getNextLevel(activeLevel),
      onClick: () => {
        zoomIntoNode(selectedNode.id);
      },
      isZoomPreview: true,
    });
  }

  const currentChildren = getSegmentChildren(currentFilePath);

  // Expose sameLevelSystems computation as part of segments metadata so the
  // component can remain purely declarative. We embed the data needed for
  // the "other levels" dropdown into a parallel array.
  const segmentsWithSiblings = useMemo(() => {
    const currentSystemId = getSystemIdFromPath(currentFilePath);
    return segments.map((seg, idx) => {
      const sameLevelSystems = loadedSystems.filter(s => {
        if (s.schema.level !== seg.level || s.path === seg.path) return false;
        if (isWorkspaceOpen) return true;
        if (idx === 0) return true;
        return getSystemIdFromPath(s.path) === currentSystemId;
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
