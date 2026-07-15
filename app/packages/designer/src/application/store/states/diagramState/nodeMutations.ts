import type { SystemNode, NodeType } from '@blueprint/core';
import { mapDomainNodeToRFNode } from '../../layoutUtils';
import type { BlueprintRFNode, BlueprintRFEdge } from '../../layoutUtils';
import { applyStateUpdates } from './applyStateUpdates';

type SetFn = (partial: Record<string, unknown>) => void;
type GetFn = () => {
  nodes: BlueprintRFNode[];
  edges: BlueprintRFEdge[];
  selectedNodeId: string | null;
  logger: { info: (m: string, meta?: Record<string, unknown>) => void };
};

export function addNodeMutation(set: SetFn, get: GetFn, type: NodeType): void {
  const entityRef = `${type}-${Date.now().toString().slice(-4)}`;
  const name = `New ${type
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')}`;
  const newDomainNode: SystemNode = {
    entityRef,
    type,
    name,
    properties: {},
    x: 100 + Math.random() * 200,
    y: 100 + Math.random() * 200,
  };

  get().logger.info('Instantiating new visual node component', { entityRef, type, name });

  const newRFNode = mapDomainNodeToRFNode(newDomainNode);
  applyStateUpdates(set, get, [...get().nodes, newRFNode], get().edges);
}

export function updateNodeMutation(
  set: SetFn,
  get: GetFn,
  id: string,
  updates: Partial<SystemNode>
): void {
  const nextNodes = get().nodes.map(rn => {
    if (rn.id === id) {
      const nextData = {
        ...rn.data,
        name: updates.name ?? rn.data.name,
        type: updates.type ?? rn.data.type,
        properties: updates.properties ?? rn.data.properties,
        external: updates.external !== undefined ? updates.external : rn.data.external,
        isTest: updates.isTest !== undefined ? updates.isTest : rn.data.isTest,
      };
      return {
        ...rn,
        data: nextData,
      };
    }
    return rn;
  });

  let nextEdges = get().edges;
  if (updates.entityRef && updates.entityRef !== id) {
    nextNodes.forEach(n => {
      if (n.id === id) {
        n.id = updates.entityRef!;
        n.data.id = updates.entityRef!;
        n.data.entityRef = updates.entityRef!;
      }
    });
    nextEdges = get().edges.map(re => {
      const updated = { ...re };
      if (re.source === id) {
        updated.source = updates.entityRef!;
        updated.id = `edge-${updates.entityRef}-${re.target}`;
      }
      if (re.target === id) {
        updated.target = updates.entityRef!;
        updated.id = `edge-${re.source}-${updates.entityRef}`;
      }
      return updated;
    });

    if (get().selectedNodeId === id) {
      set({ selectedNodeId: updates.entityRef });
    }
  }

  applyStateUpdates(set, get, nextNodes, nextEdges);
}

export function deleteNodeMutation(set: SetFn, get: GetFn, id: string): void {
  get().logger.info('Deleting node component from canvas', { id });
  const nextNodes = get().nodes.filter(n => n.id !== id);
  const nextEdges = get().edges.filter(e => e.source !== id && e.target !== id);
  const nextSelected = get().selectedNodeId === id ? null : get().selectedNodeId;
  set({ selectedNodeId: nextSelected });
  applyStateUpdates(set, get, nextNodes, nextEdges);
}
