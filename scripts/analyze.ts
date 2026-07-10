import { Project, SyntaxKind, CallExpression, NewExpression, ImportDeclaration } from 'ts-morph';
import dagre from 'dagre';
import * as yaml from 'js-yaml';
import * as fs from 'fs';
import * as path from 'path';

interface BlueprintNode {
  id: string;
  type: string;
  name: string;
  isTest?: boolean;
  c4Ref?: string;
  properties?: Record<string, string | number | boolean>;
}

interface BlueprintDependency {
  from: string;
  to: string;
  type: string;
  description?: string;
}

interface BlueprintSchema {
  name: string;
  version: string;
  level: string;
  parentRef?: string;
  nodes: Array<BlueprintNode & { x: number; y: number }>;
  dependencies: BlueprintDependency[];
}

function sanitizeId(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
}

function getMeaningfulName(): string {
  try {
    const pkgPath = path.resolve(process.cwd(), 'package.json');
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      if (pkg.name) {
        const nameWithoutScope = pkg.name.includes('/') ? pkg.name.split('/')[1] : pkg.name;
        return sanitizeId(nameWithoutScope);
      }
    }
  } catch {
    // ignore
  }
  return sanitizeId(path.basename(process.cwd()));
}

function runAnalysis() {
  console.log('🚀 Starting AST Codebase Analysis...');

  const project = new Project({
    tsConfigFilePath: path.resolve(process.cwd(), 'tsconfig.json'),
    skipAddingFilesFromTsConfig: true,
  });

  // Source files to analyze
  project.addSourceFilesAtPaths(path.resolve(process.cwd(), 'src/**/*.{ts,tsx}'));

  const sourceFiles = project.getSourceFiles();
  console.log(`📂 Found ${sourceFiles.length} source files to inspect.`);

  const nodesMap = new Map<string, BlueprintNode>();
  const dependenciesList: BlueprintDependency[] = [];

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
    const relativePath = path.relative(process.cwd(), sourceFile.getFilePath());
    const fileBaseName = path.basename(relativePath, path.extname(relativePath));
    const cleanFileId = sanitizeId(fileBaseName);
    const isTestFile = relativePath.includes('.test.') || relativePath.includes('setupTests');

    // Heuristics flags
    let isReactComponent = false;
    let isDatabase = false;
    let isEventBroker = false;
    let isApiServer = false;

    // 1. Check imports for key packages
    sourceFile.getImportDeclarations().forEach((imp: ImportDeclaration) => {
      const moduleSpecifier = imp.getModuleSpecifierValue();
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
    sourceFile.getDescendantsOfKind(SyntaxKind.NewExpression).forEach((newExpr: NewExpression) => {
      const typeText = newExpr.getExpression().getText();
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
          name: `${fileBaseName} UI Component`,
          isTest: isTestFile,
          properties: {
            filepath: relativePath,
            technology: 'React Component',
          },
        });
      }
    } else if (isDatabase) {
      nodesMap.set(cleanFileId, {
        id: cleanFileId,
        type: 'relational-database',
        name: `${fileBaseName} Database`,
        isTest: isTestFile,
        properties: {
          filepath: relativePath,
          technology: 'Prisma / SQL Database Client',
        },
      });
    } else if (isEventBroker) {
      nodesMap.set(cleanFileId, {
        id: cleanFileId,
        type: 'event-broker',
        name: `${fileBaseName} Message Broker`,
        isTest: isTestFile,
        properties: {
          filepath: relativePath,
          technology: 'Event Queue/Broker Client',
        },
      });
    } else if (isApiServer) {
      nodesMap.set(cleanFileId, {
        id: cleanFileId,
        type: 'rest-api',
        name: `${fileBaseName} REST Endpoint`,
        isTest: isTestFile,
        properties: {
          filepath: relativePath,
          technology: 'REST Controller / Router',
        },
      });
    } else {
      nodesMap.set(cleanFileId, {
        id: cleanFileId,
        type: 'background-worker',
        name: `${fileBaseName} Service`,
        isTest: isTestFile,
        properties: {
          filepath: relativePath,
          technology: 'TypeScript Domain Service',
        },
      });
    }
  }

  // Pass 2: Establish dependencies now that all nodes are registered
  for (const sourceFile of sourceFiles) {
    const relativePath = path.relative(process.cwd(), sourceFile.getFilePath());
    const fileBaseName = path.basename(relativePath, path.extname(relativePath));
    const cleanFileId = sanitizeId(fileBaseName);
    const isTestFile = relativePath.includes('.test.') || relativePath.includes('setupTests');

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
        description: `Renders ${fileBaseName} layout component`,
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
    sourceFile
      .getDescendantsOfKind(SyntaxKind.CallExpression)
      .forEach((callExpr: CallExpression) => {
        const callText = callExpr.getExpression().getText();

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
    const sourceImportFileNames = sourceFile
      .getImportDeclarations()
      .map(imp => {
        try {
          const mod = imp.getModuleSpecifierValue();
          return sanitizeId(path.basename(mod));
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
          let edgeType = 'direct-call';
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
  const systemName = getMeaningfulName();
  const displayName = systemName
    .split(/[-_]/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  console.log(
    `📊 Extracted ${components.length} component nodes and ${dependenciesList.length} dependency edges.`
  );

  // Helper definition for Container details
  interface ContainerInfo {
    id: string;
    name: string;
    type: string;
    description: string;
    technology: string;
  }

  function getContainerInfo(node: BlueprintNode, filepath?: string): ContainerInfo {
    if (node.id === 'external-api-target') {
      return {
        id: 'external-services',
        name: 'External HTTP Services',
        type: 'software-system',
        description: 'Outbound HTTP integration endpoints.',
        technology: 'Web APIs',
      };
    }
    if (node.id === 'frontend-client') {
      return {
        id: 'frontend-client',
        name: 'Frontend Client Host',
        type: 'gateway-api',
        description: 'Vite app hosting server.',
        technology: 'Vite + React',
      };
    }

    if (!filepath) {
      return {
        id: 'app-host',
        name: 'Application Shell',
        type: 'gateway-api',
        description: 'Entrypoint and root shell layout.',
        technology: 'Vite / React',
      };
    }

    const normalized = filepath.replace(/\\/g, '/');
    if (normalized.startsWith('src/domain/')) {
      return {
        id: 'domain-logic',
        name: 'Domain Logic Layer',
        type: 'background-worker',
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
          type: 'cache-store',
          description: 'Zustand global store and local directory synchronization.',
          technology: 'Zustand / Filesystem API',
        };
      } else {
        return {
          id: 'frontend-ui',
          name: 'Frontend React UI',
          type: 'gateway-api',
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
        type: 'background-worker',
        description: `Components located under src/${dir}`,
        technology: 'TypeScript',
      };
    }

    return {
      id: 'app-host',
      name: 'Application Shell',
      type: 'gateway-api',
      description: 'Entrypoint and root shell layout.',
      technology: 'Vite / React',
    };
  }

  const containerNodesMap = new Map<string, BlueprintNode>();
  const containerDependenciesList: BlueprintDependency[] = [];

  components.forEach(node => {
    const info = getContainerInfo(node, node.properties?.filepath as string);
    if (!containerNodesMap.has(info.id)) {
      const cNode: BlueprintNode = {
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
      const fromInfo = getContainerInfo(fromNode, fromNode.properties?.filepath as string);
      const toInfo = getContainerInfo(toNode, toNode.properties?.filepath as string);

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

  const gCont = new dagre.graphlib.Graph();
  gCont.setGraph({ rankdir: 'TB', nodesep: 220, edgesep: 100, ranksep: 250 });
  gCont.setDefaultEdgeLabel(() => ({}));

  const containers = Array.from(containerNodesMap.values());
  containers.forEach(node => {
    gCont.setNode(node.id, { width: 300, height: 120 });
  });

  containerDependenciesList.forEach(edge => {
    if (gCont.hasNode(edge.from) && gCont.hasNode(edge.to)) {
      gCont.setEdge(edge.from, edge.to);
    }
  });

  dagre.layout(gCont);

  const layoutContainers = containers.map(node => {
    const coords = gCont.node(node.id);
    return {
      ...node,
      x: coords ? Math.round(coords.x) : 100,
      y: coords ? Math.round(coords.y) : 100,
    };
  });

  const blueprintsDir = path.resolve(process.cwd(), 'blueprints');
  if (!fs.existsSync(blueprintsDir)) {
    fs.mkdirSync(blueprintsDir, { recursive: true });
  }

  const containerSchema: BlueprintSchema = {
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

  const containerPath = path.resolve(blueprintsDir, `${systemName}-containers.yaml`);
  fs.writeFileSync(containerPath, containerYaml, 'utf8');
  console.log(`📄 Saved Container-level schema: ${containerPath}`);

  const activeContainerIds = Array.from(containerNodesMap.keys()).filter(
    id => id !== 'external-services' && id !== 'frontend-client'
  );

  activeContainerIds.forEach(contId => {
    const containerNode = containerNodesMap.get(contId)!;
    const internalNodes = components.filter(
      n => getContainerInfo(n, n.properties?.filepath as string).id === contId
    );

    const relevantEdges = dependenciesList.filter(edge => {
      const fromNode = nodesMap.get(edge.from);
      const toNode = nodesMap.get(edge.to);
      if (!fromNode || !toNode) return false;
      const fromCont = getContainerInfo(fromNode, fromNode.properties?.filepath as string).id;
      const toCont = getContainerInfo(toNode, toNode.properties?.filepath as string).id;
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
      const info = getContainerInfo(node, node.properties?.filepath as string);
      const isExternal = info.id !== contId;

      return {
        ...node,
        external: node.external || isExternal,
        name: isExternal ? `${node.name} (${info.name})` : node.name,
      };
    });

    const gSub = new dagre.graphlib.Graph();
    gSub.setGraph({ rankdir: 'TB', nodesep: 180, edgesep: 80, ranksep: 220 });
    gSub.setDefaultEdgeLabel(() => ({}));

    subNodes.forEach(n => gSub.setNode(n.id, { width: 280, height: 100 }));
    relevantEdges.forEach(e => {
      if (gSub.hasNode(e.from) && gSub.hasNode(e.to)) {
        gSub.setEdge(e.from, e.to);
      }
    });

    dagre.layout(gSub);

    const layoutSubNodes = subNodes.map(node => {
      const coords = gSub.node(node.id);
      return {
        ...node,
        x: coords ? Math.round(coords.x) : 100,
        y: coords ? Math.round(coords.y) : 100,
      };
    });

    const componentSchema: BlueprintSchema = {
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

    const componentPath = path.resolve(blueprintsDir, `${systemName}-${contId}-components.yaml`);
    fs.writeFileSync(componentPath, componentYaml, 'utf8');
    console.log(`📄 Saved Component-level schema for ${contId}: ${componentPath}`);
  });

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

  const manifestPath = path.resolve(blueprintsDir, `${systemName}-workspace.yaml`);
  fs.writeFileSync(manifestPath, manifestYaml, 'utf8');
  console.log(`📄 Saved Workspace manifest schema: ${manifestPath}`);

  const oldPath = path.resolve(blueprintsDir, `${systemName}.yaml`);
  if (fs.existsSync(oldPath)) {
    fs.unlinkSync(oldPath);
    console.log(`🗑️ Removed obsolete schema file: ${oldPath}`);
  }

  const oldCompPath = path.resolve(blueprintsDir, `${systemName}-components.yaml`);
  if (fs.existsSync(oldCompPath)) {
    fs.unlinkSync(oldCompPath);
    console.log(`🗑️ Removed obsolete global component schema file: ${oldCompPath}`);
  }

  console.log(`✅ Successfully generated visual layout levels!`);
}

try {
  runAnalysis();
} catch (error) {
  console.error('❌ Failed to run AST analysis:', error);
  process.exit(1);
}
