import ELK from 'elkjs/lib/elk.bundled.js';
import type {
  LayoutEdgeInput,
  LayoutEnginePort,
  LayoutNodeInput,
  LayoutPosition,
} from '../../core';
import { LAYOUT_ORIGIN } from './constants';

const elk = new ELK();

/** ELK layered layout adapter (top-down). */
export class ElkLayoutAdapter implements LayoutEnginePort {
  async computeLayout(
    nodes: LayoutNodeInput[],
    edges: LayoutEdgeInput[]
  ): Promise<Map<string, LayoutPosition>> {
    if (nodes.length === 0) return new Map();

    const graph = await elk.layout({
      id: 'root',
      layoutOptions: {
        'elk.algorithm': 'layered',
        'elk.direction': 'DOWN',
        'elk.spacing.nodeNode': '100',
        'elk.layered.spacing.nodeNodeBetweenLayers': '200',
        'elk.padding': '[top=48,left=48,bottom=48,right=48]',
      },
      children: [...nodes]
        .sort((a, b) => a.id.localeCompare(b.id))
        .map(n => ({
          id: n.id,
          width: n.width,
          height: n.height,
        })),
      edges: [...edges]
        .sort((a, b) => a.source.localeCompare(b.source) || a.target.localeCompare(b.target))
        .map(e => ({
          id: e.id,
          sources: [e.source],
          targets: [e.target],
        })),
    });

    const positions = new Map<string, LayoutPosition>();
    for (const child of graph.children ?? []) {
      positions.set(child.id, {
        x: Math.round(child.x ?? LAYOUT_ORIGIN.x),
        y: Math.round(child.y ?? LAYOUT_ORIGIN.y),
      });
    }

    for (const node of nodes) {
      if (!positions.has(node.id)) {
        positions.set(node.id, { x: LAYOUT_ORIGIN.x, y: LAYOUT_ORIGIN.y });
      }
    }

    return positions;
  }
}
