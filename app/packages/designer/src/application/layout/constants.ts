/** Matches typical BlueprintNode card size (~256–300×120). */
export const NODE_SIZE = { width: 280, height: 120 } as const;

/**
 * Grid pitch for sparse graphs — tall cells leave room to scan between rows
 * without edges skimming neighbouring cards.
 */
export const GRID = { cellW: 400, cellH: 300, originX: 40, originY: 40 } as const;
