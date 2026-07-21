import type { SystemDependency, SystemNode } from '../models/schema';

export const DEFAULT_NODE_SIZE = { width: 280, height: 120 } as const;
export const GROUP_PADDING = 48;
/** Space reserved for the group title bar in the designer. */
export const GROUP_HEADER_HEIGHT = 40;
export const GROUP_CHILD_GAP = 40;
export const GROUP_MAX_COLS = 4;

export type GroupChildLayout = {
  entityRef: string;
  width?: number;
  height?: number;
};

/** Lay out group children in a stable grid with consistent gaps (ignores stored x/y). */
export function packGroupChildren(
  children: GroupChildLayout[],
  options: {
    padding?: number;
    headerHeight?: number;
    gap?: number;
    maxCols?: number;
  } = {}
): {
  bounds: { width: number; height: number };
  positionsByRef: Map<string, { x: number; y: number }>;
} {
  const padding = options.padding ?? GROUP_PADDING;
  const headerHeight = options.headerHeight ?? GROUP_HEADER_HEIGHT;
  const gap = options.gap ?? GROUP_CHILD_GAP;
  const maxCols = options.maxCols ?? GROUP_MAX_COLS;

  const emptyBounds = {
    width: DEFAULT_NODE_SIZE.width + padding * 2,
    height: DEFAULT_NODE_SIZE.height + padding * 2 + headerHeight,
  };

  if (children.length === 0) {
    return { bounds: emptyBounds, positionsByRef: new Map() };
  }

  const childWidth = (child: GroupChildLayout) => child.width ?? DEFAULT_NODE_SIZE.width;
  const childHeight = (child: GroupChildLayout) => child.height ?? DEFAULT_NODE_SIZE.height;
  const cols = Math.min(maxCols, children.length);
  const rows = Math.ceil(children.length / cols);

  const colWidths = Array.from({ length: cols }, () => 0);
  const rowHeights = Array.from({ length: rows }, () => 0);

  children.forEach((child, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    colWidths[col] = Math.max(colWidths[col], childWidth(child));
    rowHeights[row] = Math.max(rowHeights[row], childHeight(child));
  });

  const contentWidth = colWidths.reduce((sum, w) => sum + w, 0) + gap * Math.max(0, cols - 1);
  const contentHeight = rowHeights.reduce((sum, h) => sum + h, 0) + gap * Math.max(0, rows - 1);

  const positionsByRef = new Map<string, { x: number; y: number }>();
  let y = padding + headerHeight;

  for (let row = 0; row < rows; row++) {
    let x = padding;
    for (let col = 0; col < cols; col++) {
      const index = row * cols + col;
      if (index >= children.length) break;
      const child = children[index];
      positionsByRef.set(child.entityRef, { x, y });
      x += colWidths[col] + gap;
    }
    y += rowHeights[row] + gap;
  }

  return {
    bounds: {
      width: contentWidth + padding * 2,
      height: contentHeight + padding * 2 + headerHeight,
    },
    positionsByRef,
  };
}

export function groupLayoutDimensions(children: GroupChildLayout[]): {
  width: number;
  height: number;
} {
  return packGroupChildren(children).bounds;
}

export function topLevelNodes(nodes: SystemNode[]): SystemNode[] {
  return nodes.filter(n => !n.parentEntityRef);
}

export function buildParentChildEdges(nodes: SystemNode[]): Array<{ from: string; to: string }> {
  return nodes
    .filter((n): n is SystemNode & { parentEntityRef: string } => !!n.parentEntityRef)
    .map(n => ({ from: n.parentEntityRef, to: n.entityRef }));
}

export function toRelativePosition(
  absolute: { x: number; y: number },
  parentAbsolute: { x: number; y: number }
): { x: number; y: number } {
  return {
    x: absolute.x - parentAbsolute.x,
    y: absolute.y - parentAbsolute.y,
  };
}

export function toAbsolutePosition(
  relative: { x: number; y: number },
  parentAbsolute: { x: number; y: number }
): { x: number; y: number } {
  return {
    x: relative.x + parentAbsolute.x,
    y: relative.y + parentAbsolute.y,
  };
}

export function fitGroupBounds(
  children: Array<{ x?: number; y?: number; width?: number; height?: number }>,
  padding = GROUP_PADDING
): { x: number; y: number; width: number; height: number } {
  const width = (n: { width?: number }) => n.width ?? DEFAULT_NODE_SIZE.width;
  const height = (n: { height?: number }) => n.height ?? DEFAULT_NODE_SIZE.height;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const child of children) {
    const x = child.x ?? 0;
    const y = child.y ?? 0;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + width(child));
    maxY = Math.max(maxY, y + height(child));
  }

  if (!Number.isFinite(minX)) {
    return {
      x: 0,
      y: 0,
      width: DEFAULT_NODE_SIZE.width + padding * 2,
      height: DEFAULT_NODE_SIZE.height + padding * 2,
    };
  }

  return {
    x: minX - padding,
    y: minY - padding,
    width: maxX - minX + padding * 2,
    height: maxY - minY + padding * 2,
  };
}

/** Pack grouped children into a padded grid inside the group frame. */
export function resolveGroupContentLayout(
  children: Array<{ entityRef: string; x?: number; y?: number; width?: number; height?: number }>
): {
  bounds: { width: number; height: number };
  positionsByRef: Map<string, { x: number; y: number }>;
} {
  return packGroupChildren(children);
}

/** Pack grouped children so their stored coords start from the padded interior origin. */
export function normalizeGroupedNodePositions(nodes: SystemNode[]): SystemNode[] {
  const updates = new Map<string, { x: number; y: number }>();
  for (const group of nodes.filter(n => n.type === 'group')) {
    const children = nodes.filter(n => n.parentEntityRef === group.entityRef);
    if (children.length === 0) continue;
    const { positionsByRef } = resolveGroupContentLayout(children);
    for (const [ref, pos] of positionsByRef) {
      updates.set(ref, pos);
    }
  }
  return nodes.map(node => {
    const pos = updates.get(node.entityRef);
    return pos ? { ...node, ...pos } : node;
  });
}

/** After absolute layout, store nested node coordinates relative to their parent. */
export function applyRelativePositionsAfterLayout(nodes: SystemNode[]): SystemNode[] {
  const byRef = new Map(nodes.map(n => [n.entityRef, n]));
  const relative = nodes.map(node => {
    if (!node.parentEntityRef) return node;
    const parent = byRef.get(node.parentEntityRef);
    if (
      !parent ||
      node.x === undefined ||
      node.y === undefined ||
      parent.x === undefined ||
      parent.y === undefined
    ) {
      return node;
    }
    return {
      ...node,
      ...toRelativePosition({ x: node.x, y: node.y }, { x: parent.x, y: parent.y }),
    };
  });
  return normalizeGroupedNodePositions(relative);
}

export function layoutEdgesFromNodesAndDependencies(
  nodes: SystemNode[],
  dependencies: SystemDependency[]
): Array<{ source: string; target: string }> {
  const parentEdges = buildParentChildEdges(nodes).map(e => ({
    source: e.from,
    target: e.to,
  }));
  const depEdges = dependencies.map(d => ({ source: d.from, target: d.to }));
  const seen = new Set<string>();
  const edges: Array<{ source: string; target: string }> = [];
  for (const edge of [...parentEdges, ...depEdges]) {
    const key = `${edge.source}\0${edge.target}`;
    if (seen.has(key)) continue;
    seen.add(key);
    edges.push(edge);
  }
  return edges;
}

export function hasGroupedLayout(nodes: SystemNode[]): boolean {
  return nodes.some(n => n.type === 'group' || n.parentEntityRef);
}

export function stripLayoutCoordinates(nodes: SystemNode[]): SystemNode[] {
  return nodes.map(({ x: _x, y: _y, ...rest }) => rest);
}

/** Structure-only nodes: pack children inside groups, drop stored coordinates. */
export function prepareGroupedNodesForLayout(nodes: SystemNode[]): SystemNode[] {
  return normalizeGroupedNodePositions(stripLayoutCoordinates(nodes));
}
