import { useMemo } from 'react';
import { useLocation } from 'wouter';
import { useBlueprintStore } from '../../../../application/store/store';
import { getSchemaEntityRef } from '@blueprint/core';
import type { SystemSchema } from '@blueprint/core';

/** One entry per container-level system in the workspace. */
export interface ContainerSystem {
  path: string;
  name: string;
  schema: SystemSchema;
  /** The resolved entity ref used for URL navigation. */
  entityRef: string;
}

/** A cross-system dependency edge derived from node entityRef matching. */
export interface CrossSystemEdge {
  id: string;
  /** Entity ref of the source node. */
  fromNodeRef: string;
  /** Entity ref of the target node. */
  toNodeRef: string;
  /** Path of the container system the source node belongs to. */
  fromSystemPath: string;
  /** Path of the container system the target node belongs to. */
  toSystemPath: string;
  description?: string;
}

export interface UseSystemOverviewReturn {
  /** All container-level systems, sorted by name. */
  containerSystems: ContainerSystem[];
  /** Inter-system dependencies (edges whose endpoints span different systems). */
  crossSystemEdges: CrossSystemEdge[];
  /** Label from the manifest overview config, or a sensible default. */
  overviewLabel: string;
  /** Navigate into a specific container system diagram. */
  navigateToSystem: (path: string) => void;
  /** True when there is at least one container system to display. */
  hasContent: boolean;
}

export function useSystemOverview(): UseSystemOverviewReturn {
  const { loadedSystems, workspaceManifest, selectSystem } = useBlueprintStore();
  const [, setLocation] = useLocation();

  const containerSystems = useMemo<ContainerSystem[]>(() => {
    return loadedSystems
      .filter(s => s.schema.level === 'container')
      .map(s => ({
        path: s.path,
        name: s.name,
        schema: s.schema,
        entityRef: getSchemaEntityRef(s.schema, s.path),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [loadedSystems]);

  const crossSystemEdges = useMemo<CrossSystemEdge[]>(() => {
    // Build a lookup: entityRef → system path, for all nodes across all container systems.
    const nodeRefToSystemPath = new Map<string, string>();
    for (const sys of containerSystems) {
      for (const node of sys.schema.nodes) {
        if (node.entityRef) {
          nodeRefToSystemPath.set(node.entityRef, sys.path);
        }
      }
    }

    const edges: CrossSystemEdge[] = [];
    for (const sys of containerSystems) {
      for (const dep of sys.schema.dependencies) {
        // Find the source node in this system to get its entityRef
        const fromNode = sys.schema.nodes.find(n => n.id === dep.from);
        const toNode = sys.schema.nodes.find(n => n.id === dep.to);
        if (!fromNode?.entityRef || !toNode?.entityRef) continue;

        const toSystemPath = nodeRefToSystemPath.get(toNode.entityRef);
        // Only include edges that cross system boundaries
        if (!toSystemPath || toSystemPath === sys.path) continue;

        edges.push({
          id: `${fromNode.entityRef}→${toNode.entityRef}`,
          fromNodeRef: fromNode.entityRef,
          toNodeRef: toNode.entityRef,
          fromSystemPath: sys.path,
          toSystemPath,
          description: dep.description,
        });
      }
    }
    return edges;
  }, [containerSystems]);

  const overviewLabel =
    workspaceManifest?.overview?.label || workspaceManifest?.name || 'System Overview';

  const navigateToSystem = (path: string) => {
    selectSystem(path);
    // Find the entity ref for this system to build a deep URL
    const sys = containerSystems.find(s => s.path === path);
    if (sys) {
      setLocation(`/workspace/${sys.entityRef}`);
    } else {
      setLocation('/workspace');
    }
  };

  return {
    containerSystems,
    crossSystemEdges,
    overviewLabel,
    navigateToSystem,
    hasContent: containerSystems.length > 0,
  };
}
