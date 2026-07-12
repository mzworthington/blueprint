import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useBlueprintStore } from '../../../../../application/store/store';
import { getSchemaEntityRef, getSystemIdFromPath } from '@blueprint/core';
import type { C4Level } from '@blueprint/core';

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
    workspaceManifest,
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
      if (!system || !workspaceManifest || !workspaceManifest.hierarchy) return [];

      const segRef = getSchemaEntityRef(system.schema, system.path);
      const match = workspaceManifest.hierarchy.find(h => h.parent === segRef);
      if (!match) return [];

      return match.children.map(childRef => {
        const childSystem = loadedSystems.find(
          s => getSchemaEntityRef(s.schema, s.path) === childRef
        );
        return {
          path: childSystem?.path || childRef,
          name: childSystem?.name || childRef.split('/').pop() || childRef,
        };
      });
    },
    [workspaceManifest, loadedSystems]
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
    if (!workspaceManifest || !workspaceManifest.hierarchy) return list;

    const activeSystem = loadedSystems.find(s => s.path === currentFilePath);
    if (!activeSystem) return list;

    let activeRef = getSchemaEntityRef(activeSystem.schema, activeSystem.path);
    let foundParent = true;
    const visited = new Set<string>();

    while (foundParent) {
      foundParent = false;
      if (visited.has(activeRef)) break;
      visited.add(activeRef);

      const match = workspaceManifest.hierarchy.find(h => h.children.includes(activeRef));
      if (match) {
        const parentSystem = loadedSystems.find(
          s => getSchemaEntityRef(s.schema, s.path) === match.parent
        );
        if (parentSystem) {
          list.unshift({
            path: parentSystem.path,
            name: parentSystem.name,
            level: (parentSystem.schema.level || 'container') as C4Level,
          });
          activeRef = match.parent;
          foundParent = true;
        }
      }
    }
    return list;
  }, [loadedSystems, currentFilePath, workspaceManifest]);

  const selectedNode = selectedNodeId ? schema.nodes.find(n => n.id === selectedNodeId) : null;

  const hasNextHierarchy = useMemo(() => {
    if (!selectedNode) return false;
    if (selectedNode.c4Ref) return true;
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
    const targetPath = childSystem?.path || selectedNode.c4Ref || '';

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
