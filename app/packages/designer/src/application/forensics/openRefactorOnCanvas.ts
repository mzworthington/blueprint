import type { RefactorBoundary } from '@blueprint/core';
import type { RankedOffender } from './rankOffenders';

export type OpenRefactorOnCanvasActions = {
  selectSystem: (path: string) => void;
  selectNode: (entityRef: string) => void;
  setShowCoupling: (show: boolean) => void;
  setGuidedRefactorEntityRefs: (entityRefs: string[] | null) => void;
  setLocation: (path: string) => void;
};

/**
 * Navigate to the offender on the canvas with coupling focus and boundary highlights.
 */
export function openRefactorOnCanvas(
  boundary: RefactorBoundary,
  offender: RankedOffender,
  actions: OpenRefactorOnCanvasActions
): void {
  actions.selectSystem(offender.schemaPath);
  actions.selectNode(offender.entityRef);
  actions.setShowCoupling(true);
  actions.setGuidedRefactorEntityRefs(boundary.memberEntityRefs);
  actions.setLocation(`/workspace/${offender.diagramEntityRef}`);
}
