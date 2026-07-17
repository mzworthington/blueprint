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
import type { SystemNode } from '@blueprint/core';
import { EntityRef } from '@blueprint/core';
import { DEFAULT_ANALYSIS_OPTIONS, type AnalysisOptions } from './analysisOptions.ts';
import { discoverSystems, partitionFilesBySystem } from './systemDiscovery.ts';
import { throwIfAborted } from './cancellation.ts';
import {
  attachForensicsToSchema,
  fileMetricsToNodeForensics,
  normalizeFilePath,
} from '../../forensics/domain/attachForensics.ts';
import type { FileMetrics } from '../../forensics/domain/types.ts';
import { applyExternalDependenciesPass } from '../../writers/externalDependenciesPass.ts';
import { applyLayoutPass } from '../../writers/layoutPass.ts';
export interface CodebaseAnalyzerDependencies {
  parser: CodebaseParserPort;
  layout: LayoutPort;
  fileSystem: AnalysisFileSystemPort;
  logger: LoggerPort;
  analysisOptions?: AnalysisOptions;
}

export interface RunAnalysisOptions {
  /** When set, component/container/context nodes are enriched before write. */
  forensicsByPath?: ReadonlyMap<string, FileMetrics>;
}

export class CodebaseAnalyzer {
  private analysisOptions: AnalysisOptions;

  constructor(private deps: CodebaseAnalyzerDependencies) {
    this.analysisOptions = {
      ...DEFAULT_ANALYSIS_OPTIONS,
      ...(deps.analysisOptions ?? {}),
    };
  }

  private getMeaningfulName(sourceFiles: any[], globPattern: string): string {
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

    const parts = this.deps.fileSystem.getCurrentWorkingDirectory().split(/[\\/]/).filter(Boolean);
    return parts[parts.length - 1] || 'blueprint';
  }

  private enrichMapsWithForensics(
    componentNodesMap: Map<string, SystemNode>,
    containerNodesMap: Map<string, SystemNode>,
    forensicsByPath: ReadonlyMap<string, FileMetrics>
  ): SystemNode[] {
    for (const [key, node] of componentNodesMap) {
      const filepath = node.properties?.filepath;
      if (typeof filepath !== 'string') continue;
      const metrics = forensicsByPath.get(normalizeFilePath(filepath));
      if (!metrics) continue;
      componentNodesMap.set(key, {
        ...node,
        forensics: fileMetricsToNodeForensics(metrics),
      });
    }

    const componentNodes = Array.from(componentNodesMap.values());
    for (const [key, node] of containerNodesMap) {
      const rolled = attachForensicsToSchema(
        {
          name: 'containers',
          version: '1.0.0',
          level: 'container',
          nodes: [node],
          dependencies: [],
        },
        forensicsByPath,
        { componentNodes }
      );
      const enriched = rolled.nodes[0];
      if (enriched?.forensics) {
        containerNodesMap.set(key, { ...node, forensics: enriched.forensics });
      }
    }

    return componentNodes;
  }

  async runAnalysis(
    contextName: string,
    outputDir: string,
    globPattern: string = 'src/**/*.{ts,tsx}',
    signal?: AbortSignal,
    options: RunAnalysisOptions = {}
  ): Promise<void> {
    throwIfAborted(signal);
    this.deps.logger.info('🚀 Starting Multi-Level Codebase Analysis...');

    const sourceFiles = await this.deps.parser.parseSourceFiles(globPattern, signal);
    throwIfAborted(signal);

    const fallbackName = this.getMeaningfulName(sourceFiles, globPattern);
    const cwd = this.deps.fileSystem.getCurrentWorkingDirectory();

    const systems = discoverSystems(cwd, this.deps.fileSystem, {
      systems: this.analysisOptions.systems,
      fallbackId: fallbackName,
    });

    const workspacePackageRoots = [
      ...new Set(
        systems.filter(s => s.kind === 'workspace' || s.kind === 'config').map(s => s.rootPath)
      ),
    ].filter(Boolean);

    const partitioned = partitionFilesBySystem(sourceFiles, systems);
    const rootDir = this.deps.fileSystem.getAbsolutePath(outputDir || 'blueprints');
    if (!this.deps.fileSystem.exists(rootDir)) this.deps.fileSystem.mkdir(rootDir);

    const contextWriter = new ContextLevelWriter(this.deps.fileSystem, this.deps.logger);
    const containerWriter = new ContainerLevelWriter(this.deps.fileSystem, this.deps.logger);
    const componentWriter = new ComponentLevelWriter(this.deps.fileSystem, this.deps.logger);

    const emittedSystems = systems.filter(system => {
      const files = partitioned.get(system.id) || [];
      // Always keep the product hub on the context diagram, even with no source files.
      return files.length > 0 || system.kind === 'fallback' || system.kind === 'product';
    });

    const allComponentNodes: SystemNode[] = [];
    const forensicsByPath = options.forensicsByPath;

    for (const system of emittedSystems) {
      throwIfAborted(signal);

      if (system.kind === 'product') {
        // Hub is context-only; containers live under workspace/standalone systems.
        continue;
      }

      const files = partitioned.get(system.id) || [];

      this.deps.logger.info(
        `📦 System [${system.id}] (${system.kind}) — ${files.length} source file(s)`
      );

      const parentRef = EntityRef.parse(system.id, EntityRef.parse(contextName));
      const extractor = new ModelExtractor(parentRef, {
        rollupModules: this.analysisOptions.rollupModules,
        workspacePackageRoots: workspacePackageRoots.length > 0 ? workspacePackageRoots : undefined,
        isPackageRoot: packageDirRelative =>
          this.deps.fileSystem.exists(
            this.deps.fileSystem.getAbsolutePath(cwd, packageDirRelative, 'package.json')
          ),
      });
      const { componentNodesMap, componentDependencies, containerNodesMap, containerDependencies } =
        extractor.extractGraph(files);

      if (forensicsByPath && forensicsByPath.size > 0) {
        allComponentNodes.push(
          ...this.enrichMapsWithForensics(componentNodesMap, containerNodesMap, forensicsByPath)
        );
      } else {
        allComponentNodes.push(...componentNodesMap.values());
      }

      const blueprintsDir = this.deps.fileSystem.getAbsolutePath(rootDir, system.id);
      if (!this.deps.fileSystem.exists(blueprintsDir)) this.deps.fileSystem.mkdir(blueprintsDir);

      await containerWriter.write(
        blueprintsDir,
        contextName,
        system.id,
        containerNodesMap,
        containerDependencies
      );

      throwIfAborted(signal);

      await componentWriter.write(
        blueprintsDir,
        contextName,
        system.id,
        componentNodesMap,
        componentDependencies,
        containerNodesMap
      );
    }

    throwIfAborted(signal);
    await contextWriter.writeSystems(
      rootDir,
      contextName,
      emittedSystems.map(s => ({
        entityRef: s.id,
        displayName: s.displayName,
        rootPath: s.rootPath,
        productId: s.productId,
        isProductHub: s.kind === 'product' || s.kind === 'fallback',
      })),
      forensicsByPath && forensicsByPath.size > 0
        ? { forensicsComponentNodes: allComponentNodes }
        : undefined
    );

    throwIfAborted(signal);
    await applyExternalDependenciesPass(rootDir, this.deps.fileSystem, this.deps.logger);

    throwIfAborted(signal);
    await applyLayoutPass(rootDir, this.deps.layout, this.deps.fileSystem, this.deps.logger);

    throwIfAborted(signal);
    this.deps.logger.info(`✅ Multi-level structural blueprint generation complete.`);
  }
}
