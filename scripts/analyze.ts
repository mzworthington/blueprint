import { Project, SyntaxKind, CallExpression, NewExpression, ImportDeclaration } from 'ts-morph';
import dagre from 'dagre';
import yaml from 'js-yaml';
import * as fs from 'fs';
import * as path from 'path';

interface BlueprintNode {
  id: string;
  type: string;
  name: string;
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
  nodes: Array<BlueprintNode & { x: number; y: number }>;
  dependencies: BlueprintDependency[];
}

function sanitizeId(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
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

  const nodes = Array.from(nodesMap.values());
  console.log(
    `📊 Extracted ${nodes.length} component nodes and ${dependenciesList.length} dependency edges.`
  );

  // 4. Calculate visual layout using Dagre
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: 'TB', nodesep: 180, edgesep: 80, ranksep: 220 });
  g.setDefaultEdgeLabel(() => ({}));

  // Define node dimensions for React Flow node spacing
  nodes.forEach(node => {
    g.setNode(node.id, { width: 280, height: 100 });
  });

  dependenciesList.forEach(edge => {
    // Only connect edges if both nodes exist in the graph
    if (g.hasNode(edge.from) && g.hasNode(edge.to)) {
      g.setEdge(edge.from, edge.to);
    }
  });

  // Execute Dagre layout
  dagre.layout(g);

  // Map coordinates back to layout schema
  const layoutNodes = nodes.map(node => {
    const coords = g.node(node.id);
    return {
      ...node,
      x: coords ? Math.round(coords.x) : 100,
      y: coords ? Math.round(coords.y) : 100,
    };
  });

  const finalSchema: BlueprintSchema = {
    name: 'Auto-Generated Blueprint System Map',
    version: '1.0.0',
    nodes: layoutNodes,
    dependencies: dependenciesList.filter(edge => nodesMap.has(edge.from) && nodesMap.has(edge.to)),
  };

  // 5. Serialize and write standard YAML output
  const yamlContent = yaml.dump(finalSchema, {
    indent: 2,
    lineWidth: 120,
    noRefs: true,
  });

  const outputPath = path.resolve(process.cwd(), 'blueprint.yaml');
  fs.writeFileSync(outputPath, yamlContent, 'utf8');

  console.log(`✅ Successfully generated visual layout!`);
  console.log(`📄 Saved schema file: ${outputPath}`);
}

try {
  runAnalysis();
} catch (error) {
  console.error('❌ Failed to run AST analysis:', error);
  process.exit(1);
}
