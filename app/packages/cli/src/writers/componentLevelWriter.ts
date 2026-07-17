import { BaseWriter } from './baseWriter.ts';
import type { SystemNode, SystemDependency, SystemSchema } from '@blueprint/core';
import { EntityRef } from '@blueprint/core';

export class ComponentLevelWriter extends BaseWriter {
  async write(
    blueprintsDir: string,
    contextName: string,
    systemId: string,
    componentNodesMap: Map<string, SystemNode>,
    componentDependencies: SystemDependency[],
    containerNodesMap: Map<string, SystemNode>
  ): Promise<void> {
    const systemRef = EntityRef.parse(systemId, EntityRef.parse(contextName));

    for (const [containerId, containerNode] of containerNodesMap.entries()) {
      const internalComponents = Array.from(componentNodesMap.values()).filter(
        c => c.properties?.containerId === containerId
      );

      const internalEdges = componentDependencies.filter(
        edge =>
          EntityRef.getContainerId(edge.from) === containerId ||
          EntityRef.getContainerId(edge.to) === containerId
      );

      const containerRef = EntityRef.child(systemRef, containerId);
      const slugifiedContainerId = EntityRef.leaf(containerRef);

      const componentSchema: SystemSchema = {
        entityRef: containerRef,
        name: `${containerNode.name} Components`,
        version: '1.0.0',
        level: 'component',
        nodes: internalComponents,
        dependencies: internalEdges,
      };

      const componentPath = this.fileSystem.getAbsolutePath(
        blueprintsDir,
        `${slugifiedContainerId}-components.yaml`
      );

      await this.writeYaml(componentPath, componentSchema);
      this.logger.info(`📄 Saved Component schema for [${containerRef}]: ${componentPath}`);
    }
  }
}
