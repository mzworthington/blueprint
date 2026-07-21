import {
  buildOwnershipBreakdown,
  buildRefactorBoundary,
  type RefactorBoundaryNodeInput,
} from '@blueprint/core';
import type { RankedOffender, LoadedSystemRef } from './rankOffenders';

export function collectRefactorBoundaryNodes(
  systems: readonly LoadedSystemRef[]
): RefactorBoundaryNodeInput[] {
  const nodes: RefactorBoundaryNodeInput[] = [];

  for (const system of systems) {
    for (const node of system.schema.nodes) {
      const containerId =
        typeof node.properties?.containerId === 'string' ? node.properties.containerId : undefined;
      const filepath =
        typeof node.properties?.filepath === 'string' ? node.properties.filepath : undefined;
      nodes.push({
        entityRef: node.entityRef,
        name: node.name,
        type: node.type,
        containerId,
        filepath,
        forensics: node.forensics,
      });
    }
  }

  return nodes;
}

export function buildRefactorPlanForOffender(
  offender: RankedOffender,
  systems: readonly LoadedSystemRef[]
) {
  const boundary = buildRefactorBoundary(offender.entityRef, collectRefactorBoundaryNodes(systems));
  const seedNode = systems
    .flatMap(s => s.schema.nodes)
    .find(n => n.entityRef === offender.entityRef);
  const ownership = buildOwnershipBreakdown(seedNode?.forensics);
  return { boundary, ownership };
}
