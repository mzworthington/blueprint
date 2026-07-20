import {
  EntityRef,
  parseSchemaFromYaml,
  parsePulumiBatchToSchema,
  serializeSchemaToYaml,
  type SystemSchema,
  type PulumiSourceFile,
} from '@blueprint/core';
import { ContextLevelWriter } from '../../writers/contextLevelWriter.ts';
import { BaseWriter } from '../../writers/baseWriter.ts';
import { layoutWithPreservation } from '../../writers/layoutWithPreservation.ts';
import type { AnalysisFileSystemPort, LayoutPort, LoggerPort } from './ports.ts';
import { discoverPulumiRoots } from './pulumiDiscovery.ts';
import { throwIfAborted } from './cancellation.ts';

export type PulumiAnalyzerDependencies = {
  fileSystem: AnalysisFileSystemPort;
  logger: LoggerPort;
  layout: LayoutPort;
  /** Layout for context.yaml (defaults to `layout`). */
  contextLayout?: LayoutPort;
};

export type RunPulumiAnalysisOptions = {
  /** Scan root (default cwd). */
  scanRoot?: string;
  forceRelayout?: boolean;
  signal?: AbortSignal;
};

class PulumiSchemaWriter extends BaseWriter {
  async writeContainerSchema(targetPath: string, schema: SystemSchema): Promise<void> {
    await this.writeYaml(targetPath, schema);
  }
}

/**
 * Discover Pulumi projects under the scan path, parse each into a container-level
 * SystemSchema, and write YAML beside code-analysis blueprints.
 *
 * Context diagram: spokes link into the shared **Infrastructure** product hub
 * (same pattern as TerraformAnalyzer).
 */
export class PulumiAnalyzer {
  constructor(private deps: PulumiAnalyzerDependencies) {}

  async run(
    contextName: string,
    outputDir: string,
    options: RunPulumiAnalysisOptions = {}
  ): Promise<{ rootsAnalyzed: number; warnings: string[] }> {
    const { fileSystem, logger, layout } = this.deps;
    const scanRoot = options.scanRoot ?? fileSystem.getCurrentWorkingDirectory();
    const forceRelayout = options.forceRelayout !== false;
    throwIfAborted(options.signal);

    const roots = discoverPulumiRoots(scanRoot, fileSystem);
    if (roots.length === 0) {
      logger.info('No Pulumi projects found — skipping IaC pass.');
      return { rootsAnalyzed: 0, warnings: [] };
    }

    logger.info(`☁️  Found ${roots.length} Pulumi project(s)`);

    const rootDir = fileSystem.getAbsolutePath(outputDir || 'blueprints');
    if (!fileSystem.exists(rootDir)) fileSystem.mkdir(rootDir);

    const writer = new PulumiSchemaWriter(fileSystem, logger);
    const contextWriter = new ContextLevelWriter(fileSystem, logger);
    const allWarnings: string[] = [];
    const pulumiSubsystems: Array<{
      entityRef: string;
      displayName: string;
      rootPath: string;
      productId: string;
      isProductHub?: boolean;
    }> = [];

    const infrastructureProductId = 'infrastructure';

    for (const root of roots) {
      throwIfAborted(options.signal);

      const files: PulumiSourceFile[] = [];
      for (const filePath of root.filePaths) {
        const content = fileSystem.readText(filePath);
        if (content === null) {
          logger.warn(`Skipping unreadable Pulumi file: ${filePath}`);
          continue;
        }
        files.push({
          path: filePath,
          content,
          sourceFormat: /\.tsx?$/i.test(filePath) ? 'typescript' : 'yaml',
        });
      }

      if (files.length === 0) continue;

      const systemRef = EntityRef.parse(root.systemId, EntityRef.parse(contextName));
      let result;
      try {
        result = parsePulumiBatchToSchema(files, {
          targetLevel: 'container',
          parentEntityRef: systemRef,
        });
      } catch (error) {
        logger.error(`Failed to parse Pulumi project ${root.rootPath}`, error);
        continue;
      }

      allWarnings.push(...result.warnings);
      for (const w of result.warnings) {
        logger.warn(w, { root: root.rootPath });
      }

      let schema: SystemSchema = {
        ...result.schema,
        entityRef: systemRef,
        name: `${root.systemId.charAt(0).toUpperCase() + root.systemId.slice(1)} Pulumi`,
        version: result.schema.version || '1.0.0',
        level: 'container',
      };

      const blueprintsDir = fileSystem.getAbsolutePath(rootDir, root.systemId);
      if (!fileSystem.exists(blueprintsDir)) fileSystem.mkdir(blueprintsDir);
      const targetPath = fileSystem.getAbsolutePath(blueprintsDir, 'containers.yaml');

      let previousNodes: SystemSchema['nodes'] = [];
      if (fileSystem.exists(targetPath)) {
        try {
          previousNodes = parseSchemaFromYaml(await fileSystem.readSchema(targetPath)).nodes ?? [];
        } catch {
          previousNodes = [];
        }
      }

      if (schema.nodes.length > 0) {
        schema = {
          ...schema,
          nodes: await layoutWithPreservation(
            layout,
            previousNodes,
            schema.nodes,
            schema.dependencies,
            { forceRelayout }
          ),
        };
      }

      await writer.writeContainerSchema(targetPath, schema);
      logger.info(`📄 Saved Pulumi schema for [${systemRef}]: ${targetPath}`);

      const relRoot = fileSystem.getRelativePath(scanRoot, root.rootPath) || root.systemId;
      pulumiSubsystems.push({
        entityRef: root.systemId,
        displayName: root.systemId,
        rootPath: relRoot.replace(/\\/g, '/'),
        productId: infrastructureProductId,
        isProductHub: false,
      });
    }

    if (pulumiSubsystems.length > 0) {
      await contextWriter.writeSystems(rootDir, contextName, [
        {
          entityRef: infrastructureProductId,
          displayName: 'Infrastructure',
          rootPath: '',
          productId: infrastructureProductId,
          isProductHub: true,
        },
        ...pulumiSubsystems,
      ]);
      await this.layoutContextDiagram(rootDir, forceRelayout);
    }

    return { rootsAnalyzed: pulumiSubsystems.length, warnings: allWarnings };
  }

  private async layoutContextDiagram(rootDir: string, forceRelayout: boolean): Promise<void> {
    const { fileSystem, logger, layout, contextLayout } = this.deps;
    const engine = contextLayout ?? layout;
    const targetPath = fileSystem.getAbsolutePath(rootDir, 'context.yaml');
    if (!fileSystem.exists(targetPath)) return;

    try {
      const previous = parseSchemaFromYaml(await fileSystem.readSchema(targetPath));
      const laidOut = await layoutWithPreservation(
        engine,
        previous.nodes,
        previous.nodes,
        previous.dependencies,
        { forceRelayout }
      );
      const next: SystemSchema = { ...previous, nodes: laidOut };
      await fileSystem.writeSchema(targetPath, serializeSchemaToYaml(next));
      logger.info('📐 Laid out context diagram after Pulumi systems');
    } catch (error) {
      logger.warn('Failed to layout context diagram after Pulumi pass', {
        error: String(error),
      });
    }
  }
}
