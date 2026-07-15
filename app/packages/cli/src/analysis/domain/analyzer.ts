import type {
  CodebaseParserPort,
  LayoutPort,
  AnalysisFileSystemPort,
  LoggerPort,
} from './ports.ts';
import { ModelExtractor } from './modelExtractor.ts';
import { ContextLevelWriter } from '../../writers/contextLevelWriter.ts';
import { ContainerLevelWriter } from '../../writers/containerLevelWriter.ts';
import { ComponentLevelWriter } from '../../writers/componentLevelWriter.ts';
import { EntityRef } from '@blueprint/core';

export interface CodebaseAnalyzerDependencies {
  parser: CodebaseParserPort;
  layout: LayoutPort;
  fileSystem: AnalysisFileSystemPort;
  logger: LoggerPort;
}

export class CodebaseAnalyzer {
  constructor(private deps: CodebaseAnalyzerDependencies) {}

  private sanitizeId(raw: string): string {
    return raw.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  }

  private getMeaningfulName(sourceFiles: any[], globPattern: string): string {
    // 1. Resolve from C# namespaces
    const topNamespaces: string[] = [];
    sourceFiles.forEach(file => {
      if (file.namespaces) {
        file.namespaces.forEach((ns: string) => {
          const firstPart = ns.split('.')[0];
          if (firstPart) {
            topNamespaces.push(firstPart);
          }
        });
      }
    });

    if (topNamespaces.length > 0) {
      const freqMap = new Map<string, number>();
      let maxCount = 0;
      let mostFreqName = '';
      topNamespaces.forEach(name => {
        const count = (freqMap.get(name) || 0) + 1;
        freqMap.set(name, count);
        if (count > maxCount) {
          maxCount = count;
          mostFreqName = name;
        }
      });
      if (mostFreqName) {
        return mostFreqName;
      }
    }

    // 2. Resolve package.json in scanned directory or current working directory
    try {
      const baseDir = globPattern.split('**')[0].replace(/\/$/, '').replace(/\\$/, '');
      const scanDir = baseDir
        ? this.deps.fileSystem.getAbsolutePath(
            this.deps.fileSystem.getCurrentWorkingDirectory(),
            baseDir
          )
        : this.deps.fileSystem.getCurrentWorkingDirectory();

      let pkgPath = this.deps.fileSystem.getAbsolutePath(scanDir, 'package.json');
      if (!this.deps.fileSystem.exists(pkgPath)) {
        pkgPath = this.deps.fileSystem.getAbsolutePath(
          this.deps.fileSystem.getCurrentWorkingDirectory(),
          'package.json'
        );
      }

      if (this.deps.fileSystem.exists(pkgPath)) {
        const name = this.deps.fileSystem.readPackageJsonName(pkgPath);
        if (name && name !== 'root') {
          const nameWithoutScope = name.includes('/') ? name.split('/')[1] : name;
          return nameWithoutScope;
        }
      }
    } catch {
      // ignore
    }

    // 3. Resolve from base directory name of glob pattern
    try {
      const baseDir = globPattern.split('**')[0].replace(/\/$/, '').replace(/\\$/, '');
      if (baseDir) {
        const baseName = baseDir.split(/[\\/]/).filter(Boolean).pop();
        if (baseName) {
          return baseName;
        }
      }
    } catch {
      // ignore
    }

    // 4. Fallback to current working directory name
    const parts = this.deps.fileSystem.getCurrentWorkingDirectory().split(/[\\/]/).filter(Boolean);
    return parts[parts.length - 1] || 'blueprint';
  }

  async runAnalysis(
    contextName: string,
    outputDir: string,
    globPattern: string = 'src/**/*.{ts,tsx}'
  ): Promise<void> {
    this.deps.logger.info('🚀 Starting Multi-Level Codebase Analysis...');

    // 1. Parse files and isolate graph extraction logic
    const sourceFiles = await this.deps.parser.parseSourceFiles(globPattern);
    const systemName = this.getMeaningfulName(sourceFiles, globPattern);
    const systemId = this.sanitizeId(systemName);

    const parentRef = EntityRef.parse(systemId, EntityRef.parse(contextName));
    const extractor = new ModelExtractor(parentRef);
    const { componentNodesMap, componentDependencies, containerNodesMap, containerDependencies } =
      extractor.extractGraph(sourceFiles);

    // 2. Resolve target directory absolute paths
    const rootDir = this.deps.fileSystem.getAbsolutePath(outputDir || 'blueprints');
    const blueprintsDir = this.deps.fileSystem.getAbsolutePath(rootDir, systemId);

    if (!this.deps.fileSystem.exists(rootDir)) this.deps.fileSystem.mkdir(rootDir);
    if (!this.deps.fileSystem.exists(blueprintsDir)) this.deps.fileSystem.mkdir(blueprintsDir);

    // 3. Delegate generation to targeted level writers
    await new ContextLevelWriter(this.deps.layout, this.deps.fileSystem, this.deps.logger).write(
      rootDir,
      contextName,
      systemId
    );

    await new ContainerLevelWriter(this.deps.layout, this.deps.fileSystem, this.deps.logger).write(
      blueprintsDir,
      contextName,
      systemId,
      containerNodesMap,
      containerDependencies
    );

    await new ComponentLevelWriter(this.deps.layout, this.deps.fileSystem, this.deps.logger).write(
      blueprintsDir,
      contextName,
      systemId,
      componentNodesMap,
      componentDependencies,
      containerNodesMap
    );

    this.deps.logger.info(`✅ Multi-level structural blueprint generation complete.`);
  }
}
