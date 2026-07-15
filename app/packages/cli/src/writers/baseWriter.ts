import type { LayoutPort, AnalysisFileSystemPort, LoggerPort } from '../analysis/domain/ports.ts';
import type { SystemSchema } from '@blueprint/core';
import * as yaml from 'js-yaml';

export abstract class BaseWriter {
  constructor(
    protected layout: LayoutPort,
    protected fileSystem: AnalysisFileSystemPort,
    protected logger: LoggerPort
  ) {}

  protected async writeYaml(path: string, schema: SystemSchema): Promise<void> {
    const output = yaml.dump(schema, { indent: 2, lineWidth: 120, noRefs: true });

    // Ensure parent directory exists
    const normalizedPath = path.replace(/\\/g, '/');
    const lastSlash = normalizedPath.lastIndexOf('/');
    if (lastSlash !== -1) {
      const parentDir = path.substring(0, lastSlash);
      if (parentDir && !this.fileSystem.exists(parentDir)) {
        this.fileSystem.mkdir(parentDir);
      }
    }

    await this.fileSystem.writeSchema(path, output);
  }
}
