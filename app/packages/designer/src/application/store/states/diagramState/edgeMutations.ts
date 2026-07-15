import type { Connection } from '@xyflow/react';
import type { SystemDependency } from '@blueprint/core';
import type { BlueprintRFEdge, ComponentEdgeData } from '../../layoutUtils';
import { applyStateUpdates } from './applyStateUpdates';

type SetFn = (partial: Record<string, unknown>) => void;
type GetFn = () => {
  nodes: import('../../layoutUtils').BlueprintRFNode[];
  edges: BlueprintRFEdge[];
  logger: { info: (m: string, meta?: Record<string, unknown>) => void };
};

export function connectNodesMutation(set: SetFn, get: GetFn, connection: Connection): void {
  if (!connection.source || !connection.target) return;

  const newEdgeId = `edge-${connection.source}-${connection.target}`;
  if (get().edges.some(e => e.id === newEdgeId)) return;

  get().logger.info('Establishing connection edge between component nodes', {
    from: connection.source,
    to: connection.target,
    type: 'direct-call',
  });

  const newEdge: BlueprintRFEdge = {
    id: newEdgeId,
    source: connection.source,
    target: connection.target,
    type: 'default',
    data: { type: 'direct-call', description: '' },
    style: { strokeWidth: 2 },
  };

  applyStateUpdates(set, get, get().nodes, [...get().edges, newEdge]);
}

export function updateDependencyMutation(
  set: SetFn,
  get: GetFn,
  from: string,
  to: string,
  updates: Partial<SystemDependency>
): void {
  const edgeId = `edge-${from}-${to}`;
  const nextEdges = get().edges.map(e => {
    if (e.id === edgeId) {
      const nextData = {
        ...e.data,
        type: updates.type ?? e.data?.type,
        description: updates.description ?? e.data?.description,
      } as ComponentEdgeData;
      return {
        ...e,
        data: nextData,
        animated: nextData.type === 'publish-subscribe',
      };
    }
    return e;
  });
  applyStateUpdates(set, get, get().nodes, nextEdges);
}

export function deleteDependencyMutation(set: SetFn, get: GetFn, from: string, to: string): void {
  const edgeId = `edge-${from}-${to}`;
  const nextEdges = get().edges.filter(e => e.id !== edgeId);
  applyStateUpdates(set, get, get().nodes, nextEdges);
}
