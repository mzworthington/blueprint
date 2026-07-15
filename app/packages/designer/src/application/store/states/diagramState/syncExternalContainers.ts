import type { SystemSchema } from '@blueprint/core';
import { mapDomainNodeToRFNode } from '../../layoutUtils';
import type { BlueprintRFNode } from '../../layoutUtils';
import { applyStateUpdates } from './applyStateUpdates';

export function syncExternalContainers(
  set: (partial: Record<string, unknown>) => void,
  get: () => any
) {
  const { schema, loadedSystems, logger } = get() as {
    schema: SystemSchema;
    loadedSystems: Array<{ path: string; name: string; schema: SystemSchema }>;
    logger: { warn: (m: string) => void; info: (m: string) => void };
    nodes: BlueprintRFNode[];
    edges: unknown[];
    setNotification?: (n: { type: string; title: string; message: string }) => void;
  };

  if (schema.level !== 'component') {
    logger.warn('Sync external containers is only available on component-level diagrams.');
    return;
  }

  const parentSystem = loadedSystems.find(s => s.schema.level === 'container');
  if (!parentSystem) {
    logger.warn('No container-level schema found in active workspace to sync with.');
    return;
  }

  const activeContainerNode = parentSystem.schema.nodes.find(n => n.entityRef === schema.entityRef);

  if (!activeContainerNode) {
    logger.warn(
      `Could not map the current component diagram to any container node in parent schema. Make sure the schema has a valid entityRef.`
    );
    return;
  }

  const relatedContainerIds = new Set<string>();
  parentSystem.schema.dependencies.forEach(dep => {
    if (dep.from === activeContainerNode.entityRef) {
      relatedContainerIds.add(dep.to);
    } else if (dep.to === activeContainerNode.entityRef) {
      relatedContainerIds.add(dep.from);
    }
  });

  if (relatedContainerIds.size === 0) {
    logger.info('No external container dependencies found in parent schema to sync.');
    return;
  }

  let addedCount = 0;
  const currentNodes = [...get().nodes] as BlueprintRFNode[];

  let maxX = 100;
  let maxY = 100;
  currentNodes.forEach(n => {
    if (n.position.x > maxX) maxX = n.position.x;
    if (n.position.y > maxY) maxY = n.position.y;
  });

  relatedContainerIds.forEach(extId => {
    const existingNodeIndex = currentNodes.findIndex(n => n.id === extId);
    if (existingNodeIndex >= 0) {
      const node = currentNodes[existingNodeIndex];
      if (!node.data.external) {
        currentNodes[existingNodeIndex] = {
          ...node,
          data: {
            ...node.data,
            external: true,
          },
        };
        addedCount++;
      }
    } else {
      const extNode = parentSystem.schema.nodes.find(n => n.entityRef === extId);
      if (extNode) {
        maxX += 180;
        if (maxX > 600) {
          maxX = 100;
          maxY += 120;
        }

        const newRFNode = mapDomainNodeToRFNode({
          entityRef: extNode.entityRef,
          type: extNode.type,
          name: `${extNode.name} (External)`,
          external: true,
          properties: extNode.properties,
          x: maxX,
          y: maxY,
        });
        currentNodes.push(newRFNode);
        addedCount++;
      }
    }
  });

  if (addedCount > 0) {
    logger.info(`Successfully synced and imported ${addedCount} external container nodes.`);
    applyStateUpdates(set, get, currentNodes, get().edges);
    get().setNotification?.({
      type: 'success',
      title: 'Sync Externals',
      message: `Successfully synced and imported ${addedCount} external container nodes.`,
    });
  } else {
    logger.info('All external container dependencies are already mapped on the canvas.');
    get().setNotification?.({
      type: 'info',
      title: 'Sync Externals',
      message: 'All external container dependencies are already mapped on the canvas.',
    });
  }
}
