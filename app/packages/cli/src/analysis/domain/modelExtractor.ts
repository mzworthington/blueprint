import type { SystemNode, SystemDependency } from '@blueprint/core';
import { EntityRef } from '@blueprint/core';

export class ModelExtractor {
  public parentRef: string;

  constructor(parentRef: string) {
    this.parentRef = parentRef;
  }

  public sanitizeId(raw: string): string {
    return raw.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  }

  public extractGraph(sourceFiles: any[]) {
    const componentNodesMap = new Map<string, SystemNode>();
    const componentDependencies: SystemDependency[] = [];
    const containerNodesMap = new Map<string, SystemNode>();
    const containerDependencies: SystemDependency[] = [];

    // Grouping Components into Containers based on path depth
    for (const file of sourceFiles) {
      const componentId = this.sanitizeId(file.baseName);
      const pathParts = file.relativePath.replace(/\\/g, '/').split('/');
      const rawContainer =
        pathParts.length > 1 && pathParts[0] !== 'src' ? pathParts[0] : pathParts[1] || 'core';
      const containerId = this.sanitizeId(rawContainer);

      const containerRef = EntityRef.child(this.parentRef, containerId);
      const componentRef = EntityRef.child(containerRef, componentId);

      componentNodesMap.set(componentId, {
        entityRef: componentRef,
        type: 'component',
        name: file.baseName,
        properties: { filepath: file.relativePath, containerId },
      });

      if (!containerNodesMap.has(containerId)) {
        containerNodesMap.set(containerId, {
          entityRef: containerRef,
          type: 'container',
          name: rawContainer.charAt(0).toUpperCase() + rawContainer.slice(1) + ' Service',
        });
      }
    }

    // Process edge arrays
    for (const file of sourceFiles) {
      const fromComponentId = this.sanitizeId(file.baseName);
      const fromComponent = componentNodesMap.get(fromComponentId);
      if (!fromComponent) continue;
      const fromContainerId = fromComponent.properties?.containerId;

      file.imports.forEach((imp: any) => {
        const toComponentId =
          imp.moduleSpecifier
            .split(/[\\/]/)
            .pop()
            ?.replace(/\.(ts|tsx|js|jsx)$/, '')
            .toLowerCase() || '';
        const toComponent = componentNodesMap.get(toComponentId);
        if (!toComponent) return;
        const toContainerId = toComponent.properties?.containerId;

        if (fromComponentId !== toComponentId) {
          const fromContainerRef = EntityRef.child(this.parentRef, fromContainerId);
          const toContainerRef = EntityRef.child(this.parentRef, toContainerId);

          const fromRef = EntityRef.child(fromContainerRef, fromComponentId);
          const toRef = EntityRef.child(toContainerRef, toComponentId);

          componentDependencies.push({
            from: fromRef,
            to: toRef,
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
