import type { CodebaseParserPort, LayoutPort, AnalysisFileSystemPort, LoggerPort } from './ports';
import type { ParsedSourceFile } from './types';
import type { SystemNode, SystemDependency, SystemSchema } from '../../../src/domain/schema';
import * as yaml from 'js-yaml';

export interface CodebaseAnalyzerDependencies {
  parser: CodebaseParserPort;
  layout: LayoutPort;
  fileSystem: AnalysisFileSystemPort;
  logger: LoggerPort;
}

export class CodebaseAnalyzer {
  private parser: CodebaseParserPort;
  private layout: LayoutPort;
  private fileSystem: AnalysisFileSystemPort;
  private logger: LoggerPort;

  constructor(deps: CodebaseAnalyzerDependencies) {
    this.parser = deps.parser;
    this.layout = deps.layout;
    this.fileSystem = deps.fileSystem;
    this.logger = deps.logger;
  }

  private sanitizeId(raw: string): string {
    return raw.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  }

  private getMeaningfulName(): string {
    try {
      const pkgPath = this.fileSystem.getAbsolutePath(
        this.fileSystem.getCurrentWorkingDirectory(),
        'package.json'
      );
      if (this.fileSystem.exists(pkgPath)) {
        const name = this.fileSystem.readPackageJsonName(pkgPath);
        if (name) {
          const nameWithoutScope = name.includes('/') ? name.split('/')[1] : name;
          return this.sanitizeId(nameWithoutScope);
        }
      }
    } catch {
      // ignore
    }
    const parts = this.fileSystem.getCurrentWorkingDirectory().split(/[\\/]/).filter(Boolean);
    return this.sanitizeId(parts[parts.length - 1] || 'blueprint');
  }

  private getContainerInfo(node: SystemNode, systemName: string, filepath?: string) {
    if (node.id === 'external-api-target') {
      return {
        id: 'external-services',
        name: 'External HTTP Services',
        type: 'software-system' as const,
        description: 'Outbound HTTP integration endpoints.',
        technology: 'Web APIs',
      };
    }
    if (node.id === 'frontend-client') {
      return {
        id: 'frontend-client',
        name: 'Frontend Client Host',
        type: 'gateway-api' as const,
        description: 'Vite app hosting server.',
        technology: 'Vite + React',
      };
    }

    if (!filepath) {
      return {
        id: 'app-host',
        name: 'Application Shell',
        type: 'gateway-api' as const,
        description: 'Entrypoint and root shell layout.',
        technology: 'Vite / React',
      };
    }

    const normalized = filepath.replace(/\\/g, '/');
    if (normalized.startsWith('src/domain/')) {
      return {
        id: 'domain-logic',
        name: 'Domain Logic Layer',
        type: 'background-worker' as const,
        description: 'Core domain logic, schema validation rules, and graph parsing.',
        technology: 'TypeScript',
      };
    }

    if (normalized.startsWith('src/adapters/')) {
      const isStateOrSync =
        normalized.includes('store') ||
        normalized.includes('fileSync') ||
        normalized.includes('telemetry');
      if (isStateOrSync) {
        return {
          id: 'state-sync',
          name: 'State & Sync Manager',
          type: 'cache-store' as const,
          description: 'Zustand global store and local directory synchronization.',
          technology: 'Zustand / Filesystem API',
        };
      } else {
        return {
          id: 'frontend-ui',
          name: 'Frontend React UI',
          type: 'gateway-api' as const,
          description: 'React Flow canvas, sidebar configuration panel, and navigation UI.',
          technology: 'React + TailwindCSS',
        };
      }
    }

    const parts = normalized.split('/');
    if (parts.length > 2 && parts[0] === 'src') {
      const dir = parts[1];
      const name = dir.charAt(0).toUpperCase() + dir.slice(1) + ' Container';
      return {
        id: `container-${dir}`,
        name,
        type: 'background-worker' as const,
        description: `Components located under src/${dir}`,
        technology: 'TypeScript',
      };
    }

    return {
      id: 'app-host',
      name: 'Application Shell',
      type: 'gateway-api' as const,
      description: 'Entrypoint and root shell layout.',
      technology: 'Vite / React',
    };
  }

  async runAnalysis(globPattern: string = 'src/**/*.{ts,tsx}'): Promise<void> {
    this.logger.info('🚀 Starting AST Codebase Analysis...');

    const sourceFiles = await this.parser.parseSourceFiles(globPattern);
    this.logger.info(`📂 Found ${sourceFiles.length} source files to inspect.`);

    const nodesMap = new Map<string, SystemNode>();
    const dependenciesList: SystemDependency[] = [];

    // Always register a default entry point node for the client UI/App
    const clientNodeId = 'frontend-client';
    nodesMap.set(clientNodeId, {
      id: clientNodeId,
      type: 'gateway-api',
      name: 'Frontend Client App',
      properties: {
        description: 'The main user interface running React and Vite.',
        technology: 'React + TypeScript',
      },
    });

    // Pass 1: Identify all nodes
    for (const sourceFile of sourceFiles) {
      const cleanFileId = this.sanitizeId(sourceFile.baseName);
      const isTestFile = sourceFile.isTestFile;

      // Heuristics flags
      let isReactComponent = false;
      let isDatabase = false;
      let isEventBroker = false;
      let isApiServer = false;

      // 1. Check imports for key packages
      sourceFile.imports.forEach(imp => {
        const moduleSpecifier = imp.moduleSpecifier;
        if (moduleSpecifier.includes('react') || moduleSpecifier.includes('@xyflow/react')) {
          isReactComponent = true;
        }
        if (
          moduleSpecifier.includes('prisma') ||
          moduleSpecifier.includes('knex') ||
          moduleSpecifier.includes('pg') ||
          moduleSpecifier.includes('mongodb')
        ) {
          isDatabase = true;
        }
        if (
          moduleSpecifier.includes('kafkajs') ||
          moduleSpecifier.includes('bullmq') ||
          moduleSpecifier.includes('amqplib') ||
          moduleSpecifier.includes('mqtt')
        ) {
          isEventBroker = true;
        }
        if (
          moduleSpecifier.includes('express') ||
          moduleSpecifier.includes('fastify') ||
          moduleSpecifier.includes('@nestjs/common')
        ) {
          isApiServer = true;
        }
      });

      // 2. Scan class definitions or variable instantiations
      sourceFile.newExpressions.forEach(newExpr => {
        const typeText = newExpr.className;
        if (typeText.includes('PrismaClient') || typeText.includes('MongoClient')) {
          isDatabase = true;
        }
        if (typeText.includes('Kafka') || typeText.includes('Queue') || typeText.includes('Client')) {
          if (typeText.toLowerCase().includes('queue') || typeText.toLowerCase().includes('kafka')) {
            isEventBroker = true;
          }
        }
      });

      // Determine target node properties
      if (isReactComponent) {
        if (cleanFileId !== 'app' && cleanFileId !== 'main') {
          nodesMap.set(cleanFileId, {
            id: cleanFileId,
            type: 'gateway-api',
            name: `${sourceFile.baseName} UI Component`,
            isTest: isTestFile,
            properties: {
              filepath: sourceFile.relativePath,
              technology: 'React Component',
            },
          });
        }
      } else if (isDatabase) {
        nodesMap.set(cleanFileId, {
          id: cleanFileId,
          type: 'relational-database',
          name: `${sourceFile.baseName} Database`,
          isTest: isTestFile,
          properties: {
            filepath: sourceFile.relativePath,
            technology: 'Prisma / SQL Database Client',
          },
        });
      } else if (isEventBroker) {
        nodesMap.set(cleanFileId, {
          id: cleanFileId,
          type: 'event-broker',
          name: `${sourceFile.baseName} Message Broker`,
          isTest: isTestFile,
          properties: {
            filepath: sourceFile.relativePath,
            technology: 'Event Queue/Broker Client',
          },
        });
      } else if (isApiServer) {
        nodesMap.set(cleanFileId, {
          id: cleanFileId,
          type: 'rest-api',
          name: `${sourceFile.baseName} REST Endpoint`,
          isTest: isTestFile,
          properties: {
            filepath: sourceFile.relativePath,
            technology: 'REST Controller / Router',
          },
        });
      } else {
        nodesMap.set(cleanFileId, {
          id: cleanFileId,
          type: 'background-worker',
          name: `${sourceFile.baseName} Service`,
          isTest: isTestFile,
          properties: {
            filepath: sourceFile.relativePath,
            technology: 'TypeScript Domain Service',
          },
        });
      }
    }

    // Pass 2: Establish dependencies now that all nodes are registered
    for (const sourceFile of sourceFiles) {
      const cleanFileId = this.sanitizeId(sourceFile.baseName);
      const isTestFile = sourceFile.isTestFile;

      if (cleanFileId === 'app' || cleanFileId === 'main') {
        continue;
      }

      const node = nodesMap.get(cleanFileId);
      if (!node) continue;

      // React components and APIs get triggered by frontend client/app if not test files
      if (node.type === 'gateway-api' && !isTestFile) {
        dependenciesList.push({
          from: clientNodeId,
          to: cleanFileId,
          type: 'direct-call',
          description: `Renders ${sourceFile.baseName} layout component`,
        });
      } else if (node.type === 'rest-api' && !isTestFile) {
        dependenciesList.push({
          from: clientNodeId,
          to: cleanFileId,
          type: 'direct-call',
          description: 'Hits API routing gateway',
        });
      }

      // Scan references/calls to determine edges
      sourceFile.callExpressions.forEach(callText => {
        // External API fetch calls
        if (callText === 'fetch' || callText.includes('axios.')) {
          dependenciesList.push({
            from: cleanFileId,
            to: 'external-api-target',
            type: 'direct-call',
            description: 'HMR outbound query requests',
          });
          nodesMap.set('external-api-target', {
            id: 'external-api-target',
            type: 'rest-api',
            name: 'External HTTP API Endpoint',
            isTest: false,
            properties: {
              description: 'Generic outbound web integration endpoints.',
            },
          });
        }
      });

      // Check if it references other scanned files via imports
      const sourceImportFileNames = sourceFile.imports
        .map(imp => {
          try {
            const parts = imp.moduleSpecifier.split(/[\\/]/).filter(Boolean);
            const base = parts[parts.length - 1] || '';
            return this.sanitizeId(base.replace(/\.(ts|tsx|js|jsx)$/, ''));
          } catch {
            return '';
          }
        })
        .filter(Boolean);

      sourceImportFileNames.forEach(importId => {
        if (importId && importId !== cleanFileId) {
          const alreadyExists = dependenciesList.some(
            d => d.from === cleanFileId && d.to === importId
          );
          if (!alreadyExists && importId !== 'ports' && importId !== 'schema') {
            let edgeType: 'direct-call' | 'read-write' | 'publish-subscribe' = 'direct-call';
            let desc = 'Executes local class methods / functions';

            const targetNode = nodesMap.get(importId);
            if (targetNode) {
              if (targetNode.type === 'relational-database') {
                edgeType = 'read-write';
                desc = 'Queries database table records';
              } else if (targetNode.type === 'event-broker') {
                edgeType = 'publish-subscribe';
                desc = 'Publishes / consumes messaging topics';
              }

              dependenciesList.push({
                from: cleanFileId,
                to: importId,
                type: edgeType,
                description: desc,
              });
            }
          }
        }
      });
    }

    // Fallback: If this is the blueprint project itself, let's make sure filesSync.ts is connected to standard ports!
    if (nodesMap.has('filesync') && nodesMap.has('ports')) {
      dependenciesList.push({
        from: 'filesync',
        to: 'ports',
        type: 'direct-call',
        description: 'Implements FileSystemPort interface',
      });
    }

    const components = Array.from(nodesMap.values());
    const systemName = this.getMeaningfulName();
    const displayName = systemName
      .split(/[-_]/)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

    this.logger.info(
      `📊 Extracted ${components.length} component nodes and ${dependenciesList.length} dependency edges.`
    );

    const containerNodesMap = new Map<string, SystemNode>();
    const containerDependenciesList: SystemDependency[] = [];

    components.forEach(node => {
      const info = this.getContainerInfo(node, systemName, node.properties?.filepath as string);
      if (!containerNodesMap.has(info.id)) {
        const cNode: SystemNode = {
          id: info.id,
          type: info.type,
          name: info.name,
          properties: {
            description: info.description,
            technology: info.technology,
          },
        };
        if (info.id !== 'external-services' && info.id !== 'frontend-client') {
          cNode.c4Ref = `./${systemName}-${info.id}-components.yaml`;
        }
        containerNodesMap.set(info.id, cNode);
      }
    });

    dependenciesList.forEach(edge => {
      const fromNode = nodesMap.get(edge.from);
      const toNode = nodesMap.get(edge.to);
      if (fromNode && toNode) {
        const fromInfo = this.getContainerInfo(
          fromNode,
          systemName,
          fromNode.properties?.filepath as string
        );
        const toInfo = this.getContainerInfo(toNode, systemName, toNode.properties?.filepath as string);

        if (fromInfo.id !== toInfo.id) {
          const alreadyExists = containerDependenciesList.some(
            d => d.from === fromInfo.id && d.to === toInfo.id
          );
          if (!alreadyExists) {
            containerDependenciesList.push({
              from: fromInfo.id,
              to: toInfo.id,
              type: edge.type,
              description: `Inter-container request / connection`,
            });
          }
        }
      }
    });

    const containers = Array.from(containerNodesMap.values());
    const layoutContainers = await this.layout.computeLayout(containers, containerDependenciesList);

    const blueprintsDir = this.fileSystem.getAbsolutePath(
      this.fileSystem.getCurrentWorkingDirectory(),
      'blueprints'
    );
    if (!this.fileSystem.exists(blueprintsDir)) {
      this.fileSystem.mkdir(blueprintsDir);
    }

    const containerSchema: SystemSchema = {
      name: `${displayName} - Container Level`,
      version: '1.0.0',
      level: 'container',
      nodes: layoutContainers,
      dependencies: containerDependenciesList,
    };

    const containerYaml = yaml.dump(containerSchema, {
      indent: 2,
      lineWidth: 120,
      noRefs: true,
    });

    const containerPath = this.fileSystem.getAbsolutePath(blueprintsDir, `${systemName}-containers.yaml`);
    await this.fileSystem.writeSchema(containerPath, containerYaml);
    this.logger.info(`📄 Saved Container-level schema: ${containerPath}`);

    const activeContainerIds = Array.from(containerNodesMap.keys()).filter(
      id => id !== 'external-services' && id !== 'frontend-client'
    );

    for (const contId of activeContainerIds) {
      const containerNode = containerNodesMap.get(contId)!;
      const internalNodes = components.filter(
        n => this.getContainerInfo(n, systemName, n.properties?.filepath as string).id === contId
      );

      const relevantEdges = dependenciesList.filter(edge => {
        const fromNode = nodesMap.get(edge.from);
        const toNode = nodesMap.get(edge.to);
        if (!fromNode || !toNode) return false;
        const fromCont = this.getContainerInfo(
          fromNode,
          systemName,
          fromNode.properties?.filepath as string
        ).id;
        const toCont = this.getContainerInfo(
          toNode,
          systemName,
          toNode.properties?.filepath as string
        ).id;
        return fromCont === contId || toCont === contId;
      });

      const nodeIds = new Set<string>();
      internalNodes.forEach(n => nodeIds.add(n.id));
      relevantEdges.forEach(e => {
        nodeIds.add(e.from);
        nodeIds.add(e.to);
      });

      const subNodes = Array.from(nodeIds).map(id => {
        const node = nodesMap.get(id)!;
        const info = this.getContainerInfo(node, systemName, node.properties?.filepath as string);
        const isExternal = info.id !== contId;

        return {
          ...node,
          external: node.external || isExternal,
          name: isExternal ? `${node.name} (${info.name})` : node.name,
        };
      });

      const layoutSubNodes = await this.layout.computeLayout(subNodes, relevantEdges);

      const componentSchema: SystemSchema = {
        name: `${displayName} - ${containerNode.name} Components`,
        version: '1.0.0',
        level: 'component',
        nodes: layoutSubNodes,
        dependencies: relevantEdges,
      };

      const componentYaml = yaml.dump(componentSchema, {
        indent: 2,
        lineWidth: 120,
        noRefs: true,
      });

      const componentPath = this.fileSystem.getAbsolutePath(
        blueprintsDir,
        `${systemName}-${contId}-components.yaml`
      );
      await this.fileSystem.writeSchema(componentPath, componentYaml);
      this.logger.info(`📄 Saved Component-level schema for ${contId}: ${componentPath}`);
    }

    const workspaceManifest = {
      name: `${displayName} Workspace`,
      root: `./${systemName}-containers.yaml`,
      hierarchy: [
        {
          parent: `./${systemName}-containers.yaml`,
          children: activeContainerIds.map(contId => `./${systemName}-${contId}-components.yaml`),
        },
      ],
    };

    const manifestYaml = yaml.dump(workspaceManifest, {
      indent: 2,
      lineWidth: 120,
      noRefs: true,
    });

    const manifestPath = this.fileSystem.getAbsolutePath(blueprintsDir, `${systemName}-workspace.yaml`);
    await this.fileSystem.writeSchema(manifestPath, manifestYaml);
    this.logger.info(`📄 Saved Workspace manifest schema: ${manifestPath}`);

    const oldPath = this.fileSystem.getAbsolutePath(blueprintsDir, `${systemName}.yaml`);
    if (this.fileSystem.exists(oldPath)) {
      this.fileSystem.unlink(oldPath);
      this.logger.info(`🗑️ Removed obsolete schema file: ${oldPath}`);
    }

    const oldCompPath = this.fileSystem.getAbsolutePath(blueprintsDir, `${systemName}-components.yaml`);
    if (this.fileSystem.exists(oldCompPath)) {
      this.fileSystem.unlink(oldCompPath);
      this.logger.info(`🗑️ Removed obsolete global component schema file: ${oldCompPath}`);
    }

    this.logger.info(`✅ Successfully generated visual layout levels!`);
  }
}
