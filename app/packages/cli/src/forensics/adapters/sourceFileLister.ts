import { Project } from 'ts-morph';
import * as path from 'path';
import * as fs from 'fs';
import { createSourcePathFilter } from '../../analysis/adapters/pathFilter/sourcePathFilter.ts';
import { throwIfAborted } from '../../analysis/domain/cancellation.ts';
import type { ForensicsOptions } from '../domain/options.ts';
import type { SourceFileListerPort } from '../domain/ports.ts';

export class SourceFileListerAdapter implements SourceFileListerPort {
  constructor(private readonly cwd: string = process.cwd()) {}

  async listSourceFiles(options: ForensicsOptions, signal?: AbortSignal): Promise<string[]> {
    throwIfAborted(signal);

    const tsConfigPath = path.resolve(this.cwd, 'tsconfig.json');
    const project = new Project(
      fs.existsSync(tsConfigPath)
        ? { tsConfigFilePath: tsConfigPath, skipAddingFilesFromTsConfig: true }
        : {}
    );

    const resolvedPattern = path.resolve(this.cwd, options.glob);
    project.addSourceFilesAtPaths([resolvedPattern]);

    const pathFilter = createSourcePathFilter(this.cwd, {
      ignore: options.ignore,
      include: options.include,
    });

    const paths: string[] = [];
    for (const sf of project.getSourceFiles()) {
      throwIfAborted(signal);
      const relativePath = path.relative(this.cwd, sf.getFilePath()).replace(/\\/g, '/');
      if (!/\.tsx?$/.test(relativePath)) continue;
      if (pathFilter.shouldSkip(relativePath)) continue;
      paths.push(relativePath);
    }

    return paths.sort();
  }
}
