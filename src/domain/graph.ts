import yaml from 'js-yaml';
import { z } from 'zod';
import type { SystemSchema, ValidationResult, ValidationIssue } from './schema';

/**
 * Validates the node dependency graph for cycles and other logic constraints.
 */
export function validateGraph(schema: SystemSchema): ValidationResult {
  const issues: ValidationIssue[] = [];
  const adj = new Map<string, string[]>();

  // Initialize adjacency list
  for (const node of schema.nodes) {
    adj.set(node.id, []);
  }

  // Populate adjacency list
  for (const dep of schema.dependencies) {
    // If the dependency points to or from non-existent nodes, we could flag it
    if (!adj.has(dep.from)) {
      issues.push({
        type: 'invalid-connection',
        message: `Dependency source node "${dep.from}" does not exist.`,
      });
      continue;
    }
    if (!adj.has(dep.to)) {
      issues.push({
        type: 'invalid-connection',
        message: `Dependency target node "${dep.to}" does not exist.`,
      });
      continue;
    }
    adj.get(dep.from)!.push(dep.to);
  }

  // DFS Cycle Detection
  const visited = new Set<string>();
  const stack: string[] = [];
  const stackSet = new Set<string>();

  function dfs(node: string): string[] | null {
    visited.add(node);
    stack.push(node);
    stackSet.add(node);

    const neighbors = adj.get(node) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        const cycle = dfs(neighbor);
        if (cycle) return cycle;
      } else if (stackSet.has(neighbor)) {
        const idx = stack.indexOf(neighbor);
        return [...stack.slice(idx), neighbor];
      }
    }

    stack.pop();
    stackSet.delete(node);
    return null;
  }

  for (const node of schema.nodes) {
    if (!visited.has(node.id)) {
      const cyclePath = dfs(node.id);
      if (cyclePath) {
        issues.push({
          type: 'cycle',
          message: `Circular dependency detected: ${cyclePath.join(' ➔ ')}`,
          path: cyclePath,
        });
        // Stop after first cycle for simplicity, or we could list all
        break;
      }
    }
  }

  return {
    isValid: issues.length === 0,
    issues,
  };
}

const nodeTypeSchema = z.enum([
  'relational-database',
  'event-broker',
  'grpc-service',
  'serverless-function',
  'rest-api',
  'cache-store',
  'gateway-api',
  'background-worker',
]);

const dependencyTypeSchema = z.enum(['direct-call', 'publish-subscribe', 'read-write']);

const systemNodeSchema = z.object({
  id: z
    .string()
    .min(1)
    .regex(/^[a-zA-Z0-9_-]+$/, 'Node ID must be alphanumeric, dashes, or underscores'),
  type: nodeTypeSchema,
  name: z.string().min(1),
  properties: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
  x: z.number().optional(),
  y: z.number().optional(),
});

const systemDependencySchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  type: dependencyTypeSchema,
  description: z.string().optional(),
});

const systemSchemaValidator = z.object({
  name: z.string().min(1),
  version: z.string().min(1),
  nodes: z.array(systemNodeSchema),
  dependencies: z.array(systemDependencySchema).optional(),
});

/**
 * Parses a YAML string into a SystemSchema.
 */
export function parseSchemaFromYaml(yamlContent: string): SystemSchema {
  const parsed = yaml.load(yamlContent);
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid YAML: output is not an object');
  }

  const validated = systemSchemaValidator.parse(parsed);

  return {
    name: validated.name,
    version: validated.version,
    nodes: validated.nodes.map(n => ({
      id: n.id,
      type: n.type,
      name: n.name,
      properties: n.properties || {},
      x: n.x,
      y: n.y,
    })),
    dependencies: validated.dependencies
      ? validated.dependencies.map(d => ({
          from: d.from,
          to: d.to,
          type: d.type,
          description: d.description || '',
        }))
      : [],
  };
}

/**
 * Serializes a SystemSchema model to a YAML string.
 */
export function serializeSchemaToYaml(schema: SystemSchema): string {
  // Clean coordinates and optional properties to keep YAML tidy
  const cleanSchema = {
    name: schema.name,
    version: schema.version,
    nodes: schema.nodes.map(n => {
      const cleaned: any = { id: n.id, type: n.type, name: n.name };
      if (n.properties && Object.keys(n.properties).length > 0) {
        cleaned.properties = n.properties;
      }
      if (typeof n.x === 'number') cleaned.x = Math.round(n.x);
      if (typeof n.y === 'number') cleaned.y = Math.round(n.y);
      return cleaned;
    }),
    dependencies: schema.dependencies.map(d => {
      const cleaned: any = { from: d.from, to: d.to, type: d.type };
      if (d.description) cleaned.description = d.description;
      return cleaned;
    }),
  };

  return yaml.dump(cleanSchema, {
    noRefs: true,
    lineWidth: 120,
    noCompatMode: true,
  });
}

/**
 * Serializes a SystemSchema model to a Mermaid diagram string.
 */
export function serializeSchemaToMermaid(schema: SystemSchema): string {
  const lines = ['graph TD'];

  for (const node of schema.nodes) {
    let label = `["${node.name}"]`;
    if (node.type === 'relational-database') {
      label = `[("${node.name}")]`;
    } else if (node.type === 'event-broker') {
      label = `{"${node.name}"}`;
    } else if (node.type === 'cache-store') {
      label = `[("${node.name}")]`;
    } else if (node.type === 'serverless-function') {
      label = `[["${node.name}"]]`;
    }
    lines.push(`    ${node.id}${label}`);
  }

  for (const dep of schema.dependencies) {
    const arrow = dep.type === 'publish-subscribe' ? '-.->' : '-->';
    const text = dep.description ? `|"${dep.description}"| ` : '';
    lines.push(`    ${dep.from} ${arrow} ${text}${dep.to}`);
  }

  return lines.join('\n');
}
