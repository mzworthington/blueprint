import { BaseWriter } from '../analysis/domain/writer.ts';
import type { SystemNode, SystemDependency, SystemSchema } from '@blueprint/core';
import { EntityRef } from '@blueprint/core';

export class ContainerLevelWriter extends BaseWriter {
  async write(
    blueprintsDir: string,
    contextName: string,
    systemId: string,
    containerNodesMap: Map<string, SystemNode>,
    containerDependencies: SystemDependency[]
  ): Promise<void> {
    const systemRef = EntityRef.parse(systemId, EntityRef.parse(contextName));

    const containerSchema: SystemSchema = {
      entityRef: systemRef,
      name: `${systemId.charAt(0).toUpperCase() + systemId.slice(1)} Containers`,
      version: '1.0.0',
      level: 'container',
      nodes: await this.layout.computeLayout(
        Array.from(containerNodesMap.values()),
        containerDependencies
      ),
      dependencies: containerDependencies,
    };

    const targetPath = this.fileSystem.getAbsolutePath(blueprintsDir, 'containers.yaml');
    await this.writeYaml(targetPath, containerSchema);
    this.logger.info(`📄 Saved Container schema for [${systemRef}]: ${targetPath}`);
  }
}
