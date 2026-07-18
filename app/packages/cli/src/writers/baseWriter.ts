import path from 'node:path';
import { existsSync } from 'node:fs';
import type { AnalysisFileSystemPort, LoggerPort } from '../analysis/domain/ports.ts';
import type { SystemSchema } from '@blueprint/core';
import { SYSTEM_SCHEMA_MAJOR_VERSION, serializeSchemaToYaml } from '@blueprint/core';

export abstract class BaseWriter {
  constructor(
    protected fileSystem: AnalysisFileSystemPort,
    protected logger: LoggerPort
  ) {}

  protected async writeYaml(pathName: string, schema: SystemSchema): Promise<void> {
    const output = serializeSchemaToYaml(schema);

    // Ensure parent directory exists
    const normalizedPath = pathName.replace(/\\/g, '/');
    const lastSlash = normalizedPath.lastIndexOf('/');
    if (lastSlash !== -1) {
      const parentDir = pathName.substring(0, lastSlash);
      if (parentDir && !this.fileSystem.exists(parentDir)) {
        this.fileSystem.mkdir(parentDir);
      }
    }

    await this.fileSystem.writeSchema(pathName, output);
  }
}

/**
 * Resolve a path-relative schema file for workspace IDE association.
 * Prefer {@link systemSchemaPublicUrl} in YAML `version` (written by serialize).
 */
export function resolveLocalSchemaUrl(yamlFilePath: string): string | undefined {
  const versioned = path.join(
    'schemas',
    `v${SYSTEM_SCHEMA_MAJOR_VERSION}`,
    'blueprint.schema.json'
  );
  const candidates = [versioned, path.join('schemas', 'blueprint.schema.json')];
  let dir = path.dirname(path.resolve(yamlFilePath));

  for (let i = 0; i < 12; i++) {
    for (const candidate of candidates) {
      const abs = path.join(dir, candidate);
      if (existsSync(abs)) {
        const rel = path.relative(path.dirname(path.resolve(yamlFilePath)), abs);
        return rel.split(path.sep).join('/');
      }
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  return undefined;
}
