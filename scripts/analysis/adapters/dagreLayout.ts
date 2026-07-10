import dagre from 'dagre';
import type { LayoutPort } from '../domain/ports';
import type { SystemNode, SystemDependency } from '../../../src/domain/schema';

export class DagreLayoutAdapter implements LayoutPort {
  async computeLayout(nodes: SystemNode[], dependencies: SystemDependency[]): Promise<SystemNode[]> {
    const isContainerLevel = nodes.some(n =>
      ['domain-logic', 'state-sync', 'frontend-ui', 'app-host'].includes(n.id)
    );

    const g = new dagre.graphlib.Graph();
    
    if (isContainerLevel) {
      g.setGraph({ rankdir: 'TB', nodesep: 220, edgesep: 100, ranksep: 250 });
    } else {
      g.setGraph({ rankdir: 'TB', nodesep: 180, edgesep: 80, ranksep: 220 });
    }
    
    g.setDefaultEdgeLabel(() => ({}));

    const width = isContainerLevel ? 300 : 280;
    const height = isContainerLevel ? 120 : 100;

    nodes.forEach(node => {
      g.setNode(node.id, { width, height });
    });

    dependencies.forEach(edge => {
      if (g.hasNode(edge.from) && g.hasNode(edge.to)) {
        g.setEdge(edge.from, edge.to);
      }
    });

    dagre.layout(g);

    return nodes.map(node => {
      const coords = g.node(node.id);
      return {
        ...node,
        x: coords ? Math.round(coords.x) : 100,
        y: coords ? Math.round(coords.y) : 100,
      };
    });
  }
}
