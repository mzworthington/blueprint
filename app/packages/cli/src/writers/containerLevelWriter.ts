import { BaseWriter } from './baseWriter.ts';
import type { SystemNode, SystemDependency, SystemSchema } from '@blueprint/core';
import { EntityRef, parseSchemaFromYaml, seedPreservedPositions } from '@blueprint/core';

export class ContainerLevelWriter extends BaseWriter {
  async write(
    blueprintsDir: string,
    contextName: string,
    systemId: string,
    containerNodesMap: Map<string, SystemNode>,
    containerDependencies: SystemDependency[]
  ): Promise<void> {
    const systemRef = EntityRef.parse(systemId, EntityRef.parse(contextName));
    const targetPath = this.fileSystem.getAbsolutePath(blueprintsDir, 'containers.yaml');
    const nextNodes = Array.from(containerNodesMap.values());
    const nodes = await this.seedFromDisk(targetPath, nextNodes);

    const containerSchema: SystemSchema = {
      entityRef: systemRef,
      name: `${systemId.charAt(0).toUpperCase() + systemId.slice(1)} Containers`,
      version: '1.0.0',
      level: 'container',
      nodes,
      dependencies: containerDependencies,
    };

    await this.writeYaml(targetPath, containerSchema);
    this.logger.info(`📄 Saved Container schema for [${systemRef}]: ${targetPath}`);
  }

  private async seedFromDisk(targetPath: string, nextNodes: SystemNode[]): Promise<SystemNode[]> {
    if (!this.fileSystem.exists(targetPath)) return nextNodes;
    try {
      const existing = parseSchemaFromYaml(await this.fileSystem.readSchema(targetPath));
      return seedPreservedPositions(existing.nodes ?? [], nextNodes);
    } catch {
      return nextNodes;
    }
  }
}
