import * as yaml from 'js-yaml';
import { z } from 'zod';
import type { SystemSchema, ValidationResult, ValidationIssue } from '@blueprint/core';

/**
 * Validates the node dependency graph for cycles and other logic constraints.
 */
export function validateGraph(schema: SystemSchema): ValidationResult {
  const issues: ValidationIssue[] = [];
  const adj = new Map<string, string[]>();

  for (const node of schema.nodes) {
    adj.set(node.entityRef || '', []);
  }

  for (const dep of schema.dependencies) {
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
    const ref = node.entityRef || '';
    if (!visited.has(ref)) {
      const cyclePath = dfs(ref);
      if (cyclePath) {
        issues.push({
          type: 'cycle',
          message: `Circular dependency detected: ${cyclePath.join(' ➔ ')}`,
          path: cyclePath,
        });

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
  'person',
  'software-system',

  'web-app',
  'mobile-app',
  'single-page-app',
  'microservice',
  'database',
  'cache-store',
  'event-broker',
  'serverless-app',

  'component',
  'code-module',

  'relational-database',
  'grpc-service',
  'serverless-function',
  'rest-api',
  'gateway-api',
  'background-worker',
]);

const dependencyTypeSchema = z.enum([
  'direct-call',
  'publish-subscribe',
  'read-write',
  'inter-container',
]);

const systemNodeSchema = z.object({
  entityRef: z
    .string()
    .min(1)
    .regex(
      /^[a-zA-Z0-9_-]+(\/[a-zA-Z0-9_-]+)*$/,
      'Node entityRef must be alphanumeric, dashes, or underscores segments separated by slashes'
    ),
  type: nodeTypeSchema,
  name: z.string().min(1),
  external: z.boolean().optional(),
  properties: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
  isTest: z.boolean().optional(),
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
  entityRef: z.string().min(1).optional(),
  name: z.string().min(1),
  version: z.string().min(1),
  level: z.enum(['context', 'container', 'component', 'code']),
  id: z.string().optional(),
  nodes: z.array(systemNodeSchema),
  dependencies: z.array(systemDependencySchema).optional(),
});

export function parseSchemaFromYaml(yamlContent: string): SystemSchema {
  let parsed: any;
  try {
    parsed = yaml.load(yamlContent);
  } catch (yamlErr: any) {
    throw new Error(`Invalid schema YAML. YAML Parsing Error: ${yamlErr.message || yamlErr}`);
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid schema YAML. Schema must be a valid YAML object');
  }

  try {
    const validated = systemSchemaValidator.parse(parsed);

    return {
      entityRef: validated.entityRef || (parsed as any).entityRef || '',
      name: validated.name,
      version: validated.version,
      level: validated.level,
      id: validated.id,
      nodes: validated.nodes.map(n => ({
        entityRef: n.entityRef,
        type: n.type,
        name: n.name,
        external: n.external,
        properties: n.properties || {},
        isTest: n.isTest,
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
  } catch (zodErr) {
    if (zodErr instanceof z.ZodError) {
      const details = zodErr.issues
        .map(issue => {
          const path = issue.path
            .map((p, idx) => (typeof p === 'number' ? `[${p}]` : (idx > 0 ? '.' : '') + String(p)))
            .join('');
          return `${path || 'root'}: ${issue.message}`;
        })
        .join('; ');
      throw new Error(`Invalid schema YAML. Schema Validation Error: ${details}`);
    }
    throw zodErr;
  }
}

export function parseSchemaFromJson(jsonContent: string): SystemSchema {
  let parsed: any;
  try {
    parsed = JSON.parse(jsonContent);
  } catch (jsonErr: any) {
    throw new Error(`Invalid schema JSON. JSON Parsing Error: ${jsonErr.message || jsonErr}`);
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid schema JSON. Schema must be a valid JSON object');
  }

  try {
    const validated = systemSchemaValidator.parse(parsed);

    return {
      name: validated.name,
      version: validated.version,
      level: validated.level,
      id: validated.id,
      nodes: validated.nodes.map(n => ({
        entityRef: n.entityRef,
        type: n.type,
        name: n.name,
        external: n.external,
        properties: n.properties || {},
        isTest: n.isTest,
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
  } catch (zodErr) {
    if (zodErr instanceof z.ZodError) {
      const details = zodErr.issues
        .map(issue => {
          const path = issue.path
            .map((p, idx) => (typeof p === 'number' ? `[${p}]` : (idx > 0 ? '.' : '') + String(p)))
            .join('');
          return `${path || 'root'}: ${issue.message}`;
        })
        .join('; ');
      throw new Error(`Invalid schema JSON. Schema Validation Error: ${details}`);
    }
    throw zodErr;
  }
}

/**
 * Serializes a SystemSchema model to a YAML string.
 */
export function serializeSchemaToYaml(schema: SystemSchema): string {
  const cleanSchema: any = {
    name: schema.name,
    version: schema.version,
    level: schema.level,
  };

  if (schema.id) {
    cleanSchema.id = schema.id;
  }

  cleanSchema.nodes = schema.nodes.map(n => {
    const cleaned: any = { entityRef: n.entityRef, type: n.type, name: n.name };
    if (n.external !== undefined) cleaned.external = n.external;
    if (n.isTest !== undefined) cleaned.isTest = n.isTest;
    if (n.properties && Object.keys(n.properties).length > 0) {
      cleaned.properties = n.properties;
    }
    if (typeof n.x === 'number') cleaned.x = Math.round(n.x);
    if (typeof n.y === 'number') cleaned.y = Math.round(n.y);
    return cleaned;
  });

  cleanSchema.dependencies = schema.dependencies.map(d => {
    const cleaned: any = {
      from: d.from,
      to: d.to,
      type: d.type,
    };
    if (d.description) cleaned.description = d.description;
    return cleaned;
  });

  return yaml.dump(cleanSchema, {
    noRefs: true,
    lineWidth: 120,
  });
}

/**
 * Serializes a SystemSchema model to a Mermaid diagram string.
 */
export function serializeSchemaToMermaid(schema: SystemSchema): string {
  const lines = ['graph TD'];

  const mId = (id: string) => `node_${id.replace(/[^a-zA-Z0-9]/g, '_')}`;

  for (const node of schema.nodes) {
    let label = `["${node.name}"]`;
    if (node.type === 'relational-database' || node.type === 'database') {
      label = `[("${node.name}")]`;
    } else if (node.type === 'event-broker') {
      label = `{"${node.name}"}`;
    } else if (node.type === 'cache-store') {
      label = `[("${node.name}")]`;
    } else if (node.type === 'serverless-function' || node.type === 'serverless-app') {
      label = `[["${node.name}"]]`;
    } else if (node.type === 'person') {
      label = `["👤 ${node.name}"]`;
    } else if (node.external) {
      label = `["${node.name} (External)"]`;
    }
    lines.push(`    ${mId(node.entityRef || '')}${label}`);
  }

  for (const dep of schema.dependencies) {
    const arrow = dep.type === 'publish-subscribe' ? '-.->' : '-->';
    const text = dep.description ? `|"${dep.description}"| ` : '';
    lines.push(`    ${mId(dep.from)} ${arrow} ${text}${mId(dep.to)}`);
  }

  return lines.join('\n');
}
