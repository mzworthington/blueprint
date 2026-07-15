import { BaseWriter } from '../analysis/domain/writer.ts';
import type { SystemSchema } from '@blueprint/core';
import { EntityRef } from '@blueprint/core';

export class ContextLevelWriter extends BaseWriter {
  async write(rootDir: string, contextName: string, systemId: string): Promise<void> {
    const contextRef = EntityRef.parse(contextName);
    const systemRef = EntityRef.parse(systemId, contextRef);

    const contextSchema: SystemSchema = {
      entityRef: contextRef,
      name: `${contextName} Context`,
      version: '1.0.0',
      level: 'context',
      nodes: await this.layout.computeLayout(
        [
          {
            entityRef: systemRef,
            type: 'software-system',
            name: systemId.charAt(0).toUpperCase() + systemId.slice(1) + ' System',
          },
        ],
        []
      ),
      dependencies: [],
    };

    const targetPath = this.fileSystem.getAbsolutePath(rootDir, 'context.yaml');
    await this.writeYaml(targetPath, contextSchema);
    this.logger.info(`📄 Saved Context schema for [${contextRef}]: ${targetPath}`);
  }
}
