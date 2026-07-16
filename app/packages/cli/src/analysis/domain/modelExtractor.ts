import type { SystemNode, SystemDependency } from '@blueprint/core';
import { EntityRef, slugify } from '@blueprint/core';
import {
  resolveContainerFromPath,
  componentMapKey,
  type ResolveContainerOptions,
} from './containerGrouping.ts';
import type { ParsedSourceFile } from './types.ts';
import { classifyParsedSource, dependencyTypeForTarget } from './nodeTypeHydrator.ts';
import {
  classifyCSharpContainer,
  isCSharpSourcePath,
  nodeTypePriority,
  resolveCSharpComponent,
} from './csharpGrouping.ts';

export class ModelExtractor {
  public parentRef: string;
  private resolveOptions: ResolveContainerOptions;

  constructor(parentRef: string, resolveOptions: ResolveContainerOptions = {}) {
    this.parentRef = parentRef;
    this.resolveOptions = resolveOptions;
  }

  public extractGraph(sourceFiles: ParsedSourceFile[]) {
    const componentNodesMap = new Map<string, SystemNode>();
    const componentDependencies: SystemDependency[] = [];
    const containerNodesMap = new Map<string, SystemNode>();
    const containerDependencies: SystemDependency[] = [];

    for (const file of sourceFiles) {
      const { containerId, displayName } = resolveContainerFromPath(
        file.relativePath,
        this.resolveOptions
      );

      const componentIdentity = this.resolveComponentIdentity(file);
      if (!componentIdentity) continue;

      const { componentId, componentName } = componentIdentity;
      const mapKey = componentMapKey(containerId, componentId);

      const containerRef = EntityRef.child(this.parentRef, containerId);
      const componentRef = EntityRef.child(containerRef, componentId);
      const hydration = classifyParsedSource(file);

      const existing = componentNodesMap.get(mapKey);
      if (existing) {
        if (nodeTypePriority(hydration.type) > nodeTypePriority(existing.type)) {
          existing.type = hydration.type;
          existing.properties = {
            ...existing.properties,
            technology: hydration.technology,
            classification: hydration.reason,
          };
        }
        if (!file.isTestFile) {
          existing.isTest = false;
        }
      } else {
        componentNodesMap.set(mapKey, {
          entityRef: componentRef,
          type: hydration.type,
          name: componentName,
          isTest: !!file.isTestFile,
          properties: {
            filepath: file.relativePath,
            containerId,
            technology: hydration.technology,
            classification: hydration.reason,
          },
        });
      }

      if (!containerNodesMap.has(containerId)) {
        const containerType = isCSharpSourcePath(file.relativePath)
          ? classifyCSharpContainer(displayName, containerId)
          : 'container';

        containerNodesMap.set(containerId, {
          entityRef: containerRef,
          type: containerType,
          name: `${displayName.charAt(0).toUpperCase()}${displayName.slice(1)} Service`,
          isTest: !!file.isTestFile,
        });
      } else if (!file.isTestFile) {
        containerNodesMap.get(containerId)!.isTest = false;
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
      if (isCSharpSourcePath(file.relativePath)) continue;

      const componentIdentity = this.resolveComponentIdentity(file);
      if (!componentIdentity) continue;

      const fromComponentId = componentIdentity.componentId;
      const { containerId: fromContainerId } = resolveContainerFromPath(
        file.relativePath,
        this.resolveOptions
      );
      const fromComponent = findComponent(fromContainerId, fromComponentId);
      if (!fromComponent) continue;

      file.imports.forEach(imp => {
        const toComponentId = slugify(
          imp.moduleSpecifier
            .split(/[\\/]/)
            .pop()
            ?.replace(/\.(ts|tsx|js|jsx|cs|py)$/, '') || ''
        );
        const toComponent = findComponent(fromContainerId, toComponentId);
        if (!toComponent) return;
        const toContainerId = String(toComponent.properties?.containerId || '');

        if (fromComponent.entityRef !== toComponent.entityRef) {
          const fromContainerRef = EntityRef.child(this.parentRef, fromContainerId);
          const toContainerRef = EntityRef.child(this.parentRef, toContainerId);
          const edge = dependencyTypeForTarget(toComponent);

          componentDependencies.push({
            from: fromComponent.entityRef,
            to: toComponent.entityRef,
            type: edge.type,
            description: edge.description,
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

  private resolveComponentIdentity(
    file: ParsedSourceFile
  ): { componentId: string; componentName: string } | null {
    if (isCSharpSourcePath(file.relativePath)) {
      return resolveCSharpComponent(file.relativePath, file.baseName);
    }

    return {
      componentId: slugify(file.baseName),
      componentName: `${file.baseName} Service`,
    };
  }
}
