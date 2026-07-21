import type { SystemNode, NodeType } from '@blueprint/core';
import { mapDomainNodeToRFNode } from '../../layoutUtils';
import type { BlueprintRFNode, BlueprintRFEdge } from '../../layoutUtils';
import { applyStateUpdates } from './applyStateUpdates';

type SetFn = (partial: Record<string, unknown>) => void;
type GetFn = () => {
  nodes: BlueprintRFNode[];
  edges: BlueprintRFEdge[];
  selectedNodeId: string | null;
  currentFilePath: string;
  nodeRefMap: Record<string, Record<string, string>>;
  markLayoutCustomized: () => void;
  logger: { info: (m: string, meta?: Record<string, unknown>) => void };
};

function collectNodeAliases(
  nodes: BlueprintRFNode[],
  id: string,
  fileRefMap: Record<string, string>
): Set<string> {
  const aliases = new Set<string>([id]);
  const rfNode = nodes.find(n => n.id === id || n.data.entityRef === id || n.data.id === id);
  if (!rfNode) return aliases;

  aliases.add(rfNode.id);
  if (rfNode.data.id) aliases.add(rfNode.data.id);
  if (rfNode.data.entityRef) aliases.add(rfNode.data.entityRef);

  const localSegment = rfNode.data.entityRef?.includes('/')
    ? rfNode.data.entityRef.split('/').pop()
    : rfNode.data.entityRef;
  if (localSegment) aliases.add(localSegment);

  for (const [localId, fqn] of Object.entries(fileRefMap)) {
    if (localId === rfNode.id || fqn === rfNode.data.entityRef || fqn === rfNode.data.id) {
      aliases.add(localId);
      aliases.add(fqn);
    }
  }

  return aliases;
}

export function addNodeMutation(
  set: SetFn,
  get: GetFn,
  type: NodeType,
  position?: { x: number; y: number }
): void {
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
    x: position?.x ?? 100 + Math.random() * 200,
    y: position?.y ?? 100 + Math.random() * 200,
  };

  get().logger.info('Instantiating new visual node component', { entityRef, type, name });

  get().markLayoutCustomized();

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
    const fileRefMap = get().nodeRefMap?.[get().currentFilePath] || {};
    const oldAliases = collectNodeAliases(nextNodes, id, fileRefMap);

    nextNodes.forEach(n => {
      if (oldAliases.has(n.id)) {
        n.id = updates.entityRef!;
        n.data.id = updates.entityRef!;
        n.data.entityRef = updates.entityRef!;
      }
    });
    nextEdges = get().edges.map(re => {
      const updated = { ...re };
      if (oldAliases.has(re.source)) {
        updated.source = updates.entityRef!;
        updated.id = `edge-${updates.entityRef}-${re.target}`;
      }
      if (oldAliases.has(re.target)) {
        updated.target = updates.entityRef!;
        updated.id = `edge-${re.source}-${updates.entityRef}`;
      }
      return updated;
    });

    if (get().selectedNodeId && oldAliases.has(get().selectedNodeId!)) {
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
