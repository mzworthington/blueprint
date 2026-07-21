import {
  EntityRef,
  parseSchemaFromYaml,
  parseTerraformBatchToSchema,
  seedPreservedPositions,
  type SystemSchema,
  type TerraformSourceFile,
  type SourceProvenance,
} from '@blueprint/core';
import { ContextLevelWriter } from '../../writers/contextLevelWriter.ts';
import { BaseWriter } from '../../writers/baseWriter.ts';
import type { AnalysisFileSystemPort, LoggerPort } from './ports.ts';
import { discoverTerraformRoots } from './terraformDiscovery.ts';
import { throwIfAborted } from './cancellation.ts';

export type TerraformAnalyzerDependencies = {
  fileSystem: AnalysisFileSystemPort;
  logger: LoggerPort;
};

export type RunTerraformAnalysisOptions = {
  /** Scan root (default cwd). */
  scanRoot?: string;
  signal?: AbortSignal;
  source?: SourceProvenance;
};

class TerraformSchemaWriter extends BaseWriter {
  async writeContainerSchema(targetPath: string, schema: SystemSchema): Promise<void> {
    await this.writeYaml(targetPath, schema);
  }
}

/**
 * Discover Terraform roots under the scan path, parse each root module into a
 * container-level SystemSchema, and write YAML beside code-analysis blueprints.
 *
 * Context diagram: one **Infrastructure** product hub with spokes to each TF root
 * (same hub→subsystem pattern as code system discovery).
 */
export class TerraformAnalyzer {
  constructor(private deps: TerraformAnalyzerDependencies) {}

  async run(
    contextName: string,
    outputDir: string,
    options: RunTerraformAnalysisOptions = {}
  ): Promise<{ rootsAnalyzed: number; warnings: string[] }> {
    const { fileSystem, logger } = this.deps;
    const scanRoot = options.scanRoot ?? fileSystem.getCurrentWorkingDirectory();
    throwIfAborted(options.signal);

    const roots = discoverTerraformRoots(scanRoot, fileSystem);
    if (roots.length === 0) {
      logger.info('No Terraform roots found — skipping IaC pass.');
      return { rootsAnalyzed: 0, warnings: [] };
    }

    logger.info(`🏗️  Found ${roots.length} Terraform root(s)`);

    const rootDir = fileSystem.getAbsolutePath(outputDir || 'blueprints');
    if (!fileSystem.exists(rootDir)) fileSystem.mkdir(rootDir);

    const writer = new TerraformSchemaWriter(fileSystem, logger);
    const contextWriter = new ContextLevelWriter(fileSystem, logger);
    const allWarnings: string[] = [];
    /** Subsystems under the Infrastructure hub (one per TF root). */
    const tfSubsystems: Array<{
      entityRef: string;
      displayName: string;
      rootPath: string;
      productId: string;
      isProductHub?: boolean;
    }> = [];

    const infrastructureProductId = 'infrastructure';

    for (const root of roots) {
      throwIfAborted(options.signal);

      const files: TerraformSourceFile[] = [];
      for (const filePath of root.filePaths) {
        const content = fileSystem.readText(filePath);
        if (content === null) {
          logger.warn(`Skipping unreadable Terraform file: ${filePath}`);
          continue;
        }
        files.push({
          path: filePath,
          content,
          sourceFormat: filePath.endsWith('.tf.json') ? 'json' : 'hcl',
        });
      }

      if (files.length === 0) continue;

      const systemRef = EntityRef.parse(root.systemId, EntityRef.parse(contextName));
      let result;
      try {
        result = parseTerraformBatchToSchema(files, {
          targetLevel: 'container',
          parentEntityRef: systemRef,
        });
      } catch (error) {
        logger.error(`Failed to parse Terraform root ${root.rootPath}`, error);
        continue;
      }

      allWarnings.push(...result.warnings);
      for (const w of result.warnings) {
        logger.warn(w, { root: root.rootPath });
      }

      let schema: SystemSchema = {
        ...result.schema,
        entityRef: systemRef,
        name: `${root.systemId.charAt(0).toUpperCase() + root.systemId.slice(1)} Infrastructure`,
        version: result.schema.version || '1.0.0',
        level: 'container',
        ...(options.source ? { source: options.source } : {}),
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
          nodes: seedPreservedPositions(previousNodes, schema.nodes),
        };
      }

      await writer.writeContainerSchema(targetPath, schema);
      logger.info(`📄 Saved Terraform schema for [${systemRef}]: ${targetPath}`);

      const relRoot = fileSystem.getRelativePath(scanRoot, root.rootPath) || root.systemId;
      tfSubsystems.push({
        entityRef: root.systemId,
        displayName: root.systemId,
        rootPath: relRoot.replace(/\\/g, '/'),
        productId: infrastructureProductId,
        isProductHub: false,
      });
    }

    if (tfSubsystems.length > 0) {
      await contextWriter.writeSystems(
        rootDir,
        contextName,
        [
          {
            entityRef: infrastructureProductId,
            displayName: 'Infrastructure',
            rootPath: '',
            productId: infrastructureProductId,
            isProductHub: true,
          },
          ...tfSubsystems,
        ],
        options.source ? { source: options.source } : undefined
      );
    }

    return { rootsAnalyzed: tfSubsystems.length, warnings: allWarnings };
  }
}
