import type { SystemNode, SystemDependency } from '@blueprint/core';
import { EntityRef, slugify } from '@blueprint/core';
import { resolveContainerFromPath, componentMapKey } from './containerGrouping.ts';

export class ModelExtractor {
  public parentRef: string;

  constructor(parentRef: string) {
    this.parentRef = parentRef;
  }

  public extractGraph(sourceFiles: any[]) {
    const componentNodesMap = new Map<string, SystemNode>();
    const componentDependencies: SystemDependency[] = [];
    const containerNodesMap = new Map<string, SystemNode>();
    const containerDependencies: SystemDependency[] = [];

    for (const file of sourceFiles) {
      const componentId = slugify(file.baseName);
      const { containerId, displayName } = resolveContainerFromPath(file.relativePath);
      const mapKey = componentMapKey(containerId, componentId);

      const containerRef = EntityRef.child(this.parentRef, containerId);
      const componentRef = EntityRef.child(containerRef, componentId);

      componentNodesMap.set(mapKey, {
        entityRef: componentRef,
        type: 'component',
        name: file.baseName,
        isTest: !!file.isTestFile,
        properties: { filepath: file.relativePath, containerId },
      });

      if (!containerNodesMap.has(containerId)) {
        containerNodesMap.set(containerId, {
          entityRef: containerRef,
          type: 'container',
          name: `${displayName.charAt(0).toUpperCase()}${displayName.slice(1)} Service`,
        });
      }
    }

    const findComponent = (containerHint: string | undefined, componentId: string) => {
      if (containerHint) {
        const keyed = componentNodesMap.get(componentMapKey(containerHint, componentId));
        if (keyed) return keyed;
      }
      for (const [key, node] of componentNodesMap) {
        if (key.endsWith(`/${componentId}`) || key === componentId) {
          return node;
        }
      }
      return undefined;
    };

    for (const file of sourceFiles) {
      const fromComponentId = slugify(file.baseName);
      const { containerId: fromContainerId } = resolveContainerFromPath(file.relativePath);
      const fromComponent = findComponent(fromContainerId, fromComponentId);
      if (!fromComponent) continue;

      file.imports.forEach((imp: any) => {
        const toComponentId = slugify(
          imp.moduleSpecifier
            .split(/[\\/]/)
            .pop()
            ?.replace(/\.(ts|tsx|js|jsx)$/, '') || ''
        );
        const toComponent = findComponent(fromContainerId, toComponentId);
        if (!toComponent) return;
        const toContainerId = String(toComponent.properties?.containerId || '');

        if (fromComponent.entityRef !== toComponent.entityRef) {
          const fromContainerRef = EntityRef.child(this.parentRef, fromContainerId);
          const toContainerRef = EntityRef.child(this.parentRef, toContainerId);

          componentDependencies.push({
            from: fromComponent.entityRef,
            to: toComponent.entityRef,
            type: 'direct-call',
          });

          if (fromContainerId && toContainerId && fromContainerId !== toContainerId) {
            const edgeExists = containerDependencies.some(
              d => d.from === fromContainerRef && d.to === toContainerRef
            );
            if (!edgeExists) {
              containerDependencies.push({
                from: fromContainerRef,
                to: toContainerRef,
                type: 'inter-container',
              });
            }
          }
        }
      });
    }

    return { componentNodesMap, componentDependencies, containerNodesMap, containerDependencies };
  }
}
