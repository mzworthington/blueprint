import type {
  CodebaseParserPort,
  LayoutPort,
  AnalysisFileSystemPort,
  LoggerPort,
} from './ports.ts';
import type { ParsedSourceFile } from './types.ts';
import type {
  SystemNode,
  SystemDependency,
  SystemSchema,
} from '../../core/generated/blueprint/v1/schema.ts';
import * as yaml from 'js-yaml';
import type { LanguageAnalyzer } from './languageAnalyzer.ts';
import { TypeScriptAnalyzer } from './typescriptAnalyzer.ts';
import { CSharpAnalyzer } from './csharpAnalyzer.ts';
import { PythonAnalyzer } from './pythonAnalyzer.ts';
import { FallbackAnalyzer } from './fallbackAnalyzer.ts';

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
  private strategies: LanguageAnalyzer[];

  constructor(deps: CodebaseAnalyzerDependencies) {
    this.parser = deps.parser;
    this.layout = deps.layout;
    this.fileSystem = deps.fileSystem;
    this.logger = deps.logger;
    this.strategies = [
      new TypeScriptAnalyzer(),
      new CSharpAnalyzer(),
      new PythonAnalyzer(),
      new FallbackAnalyzer(),
    ];
  }

  private getStrategy(fileExt: string): LanguageAnalyzer {
    return (
      this.strategies.find(s => s.supports(fileExt)) || this.strategies[this.strategies.length - 1]
    );
  }

  private sanitizeId(raw: string): string {
    return raw.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  }

  private getMeaningfulName(sourceFiles: ParsedSourceFile[], globPattern: string): string {
    // 1. Resolve from C# namespaces
    const topNamespaces: string[] = [];
    sourceFiles.forEach(file => {
      if (file.namespaces) {
        file.namespaces.forEach(ns => {
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
        ? this.fileSystem.getAbsolutePath(this.fileSystem.getCurrentWorkingDirectory(), baseDir)
        : this.fileSystem.getCurrentWorkingDirectory();

      let pkgPath = this.fileSystem.getAbsolutePath(scanDir, 'package.json');
      if (!this.fileSystem.exists(pkgPath)) {
        pkgPath = this.fileSystem.getAbsolutePath(
          this.fileSystem.getCurrentWorkingDirectory(),
          'package.json'
        );
      }

      if (this.fileSystem.exists(pkgPath)) {
        const name = this.fileSystem.readPackageJsonName(pkgPath);
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
    const parts = this.fileSystem.getCurrentWorkingDirectory().split(/[\\/]/).filter(Boolean);
    return parts[parts.length - 1] || 'blueprint';
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
    const fileExt = normalized.split('.').pop()?.toLowerCase() || '';

    const strategy = this.getStrategy(fileExt);
    const info = strategy.getContainerInfo(node, systemName, fileExt, normalized);
    if (info) {
      return info;
    }

    // Fallback to app-host
    return {
      id: 'app-host',
      name: 'Application Shell',
      type: 'gateway-api' as const,
      description: 'Entrypoint and root shell layout.',
      technology: 'Vite / React',
    };
  }

  async runAnalysis(globPattern: string = 'src/**/*.{ts,tsx}', outputDir?: string): Promise<void> {
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
      const fileExt = sourceFile.relativePath.split('.').pop()?.toLowerCase() || '';

      // Root shell / entrypoint files named app or main are excluded from component nodes
      if (cleanFileId === 'app' || cleanFileId === 'main') {
        continue;
      }

      const strategy = this.getStrategy(fileExt);
      const node = strategy.createNode(sourceFile, cleanFileId, isTestFile);
      nodesMap.set(cleanFileId, node);
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

      // Check if it instantiates/references types from other scanned files
      if (sourceFile.newExpressions) {
        sourceFile.newExpressions.forEach(newExpr => {
          let className = newExpr.className;
          let targetId = this.sanitizeId(className);
          let targetNode = nodesMap.get(targetId);

          // C# interface resolution fallback: e.g. IUserService -> UserService
          if (
            !targetNode &&
            className.startsWith('I') &&
            className.length > 1 &&
            className[1] === className[1].toUpperCase()
          ) {
            className = className.slice(1);
            targetId = this.sanitizeId(className);
            targetNode = nodesMap.get(targetId);
          }

          if (targetNode && targetId !== cleanFileId) {
            const alreadyExists = dependenciesList.some(
              d => d.from === cleanFileId && d.to === targetId
            );
            if (!alreadyExists) {
              let edgeType: 'direct-call' | 'read-write' | 'publish-subscribe' = 'direct-call';
              let desc = 'References class type / calls methods';

              if (targetNode.type === 'relational-database') {
                edgeType = 'read-write';
                desc = 'Queries database table records';
              } else if (targetNode.type === 'event-broker') {
                edgeType = 'publish-subscribe';
                desc = 'Publishes / consumes messaging topics';
              }

              dependenciesList.push({
                from: cleanFileId,
                to: targetId,
                type: edgeType,
                description: desc,
              });
            }
          }
        });
      }
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
    const meaningfulName = this.getMeaningfulName(sourceFiles, globPattern);
    const systemName = this.sanitizeId(meaningfulName);
    let displayName = meaningfulName;
    if (meaningfulName.includes('-') || meaningfulName.includes('_')) {
      displayName = meaningfulName
        .split(/[-_]/)
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
    } else {
      displayName = meaningfulName.charAt(0).toUpperCase() + meaningfulName.slice(1);
    }

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
        const toInfo = this.getContainerInfo(
          toNode,
          systemName,
          toNode.properties?.filepath as string
        );

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

    const rootBlueprintsDir = outputDir
      ? this.fileSystem.getAbsolutePath(outputDir)
      : this.fileSystem.getAbsolutePath(this.fileSystem.getCurrentWorkingDirectory(), 'blueprints');
    if (!this.fileSystem.exists(rootBlueprintsDir)) {
      this.fileSystem.mkdir(rootBlueprintsDir);
    }
    const blueprintsDir = outputDir
      ? this.fileSystem.getAbsolutePath(outputDir, systemName)
      : this.fileSystem.getAbsolutePath(rootBlueprintsDir, systemName);
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

    const containerPath = this.fileSystem.getAbsolutePath(blueprintsDir, 'containers.yaml');
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
        parentRef: `${systemName}/${contId}`,
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
        `${contId}-components.yaml`
      );
      await this.fileSystem.writeSchema(componentPath, componentYaml);
      this.logger.info(`📄 Saved Component-level schema for ${contId}: ${componentPath}`);
    }

    const workspaceManifest = {
      name: `${displayName} Workspace`,
      root: systemName,
      hierarchy: [
        {
          parent: systemName,
          children: activeContainerIds.map(contId => `${systemName}/${contId}`),
        },
      ],
    };

    const manifestYaml = yaml.dump(workspaceManifest, {
      indent: 2,
      lineWidth: 120,
      noRefs: true,
    });

    const manifestPath = this.fileSystem.getAbsolutePath(blueprintsDir, 'workspace.yaml');
    await this.fileSystem.writeSchema(manifestPath, manifestYaml);
    this.logger.info(`📄 Saved Workspace manifest schema: ${manifestPath}`);

    this.logger.info(`✅ Successfully generated visual layout levels!`);
  }
}
