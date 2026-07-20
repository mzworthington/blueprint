import * as yaml from 'js-yaml';
import { z } from 'zod';
import type {
  SystemSchema,
  SystemDependency,
  ValidationResult,
  ValidationIssue,
} from '../models/schema';
import { SYSTEM_SCHEMA_MAJOR_VERSION, systemSchemaPublicUrl } from '../models/schemaVersion';
import { ENTITY_REF_PATTERN } from '../lib/entityRef';

/** Keep first edge per from→to pair (duplicate ids break React Flow / canvas perf). */
export function dedupeDependencies(deps: SystemDependency[]): SystemDependency[] {
  const seen = new Set<string>();
  const out: SystemDependency[] = [];
  for (const dep of deps) {
    const key = `${dep.from}\0${dep.to}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(dep);
  }
  return out;
}

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
  'container',
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

/** Shared FQN shape for schema identity and node refs (no file paths). */
const entityRefStringSchema = z
  .string()
  .min(1)
  .regex(
    ENTITY_REF_PATTERN,
    'entityRef must be alphanumeric, dashes, or underscores segments separated by slashes'
  );

const forensicClassificationSchema = z.enum(['hotspot', 'knowledge-silo']);

const coupledFileForensicsSchema = z.object({
  path: z.string().min(1),
  score: z.number(),
  sharedCommits: z.number(),
});

const nodeForensicsSchema = z.object({
  complexity: z.number().optional(),
  loc: z.number().optional(),
  sloc: z.number().optional(),
  churn: z.number().optional(),
  churnByWeek: z.array(z.number().nonnegative()).optional(),
  authorCount: z.number().optional(),
  topAuthorPercent: z.number().optional(),
  hotspotScore: z.number().optional(),
  classifications: z.array(forensicClassificationSchema).optional(),
  coupledFiles: z.array(coupledFileForensicsSchema).optional(),
  sinceDays: z.number().positive().optional(),
  fileCount: z.number().optional(),
  hotspotCount: z.number().optional(),
  knowledgeSiloCount: z.number().optional(),
});

const systemNodeSchema = z.object({
  entityRef: entityRefStringSchema,
  type: nodeTypeSchema,
  name: z.string().min(1),
  external: z.boolean().optional(),
  properties: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
  isTest: z.boolean().optional(),
  x: z.number().optional(),
  y: z.number().optional(),
  forensics: nodeForensicsSchema.optional(),
});

const systemDependencySchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  type: dependencyTypeSchema,
  description: z.string().optional(),
});

/** Zod contract for blueprint YAML/JSON wire format (v3). Prefer this over hand-written JSON Schema. */
const metaDataSchema = z.object({
  entityRef: entityRefStringSchema.optional(),
  name: z.string().min(1),
});

export const systemSchemaValidator = z.object({
  version: z.string().min(1),
  level: z.enum(['context', 'container', 'component', 'code']),
  metaData: metaDataSchema,
  nodes: z.array(systemNodeSchema),
  dependencies: z.array(systemDependencySchema).optional(),
});

/** Legacy flat document (pre-v3). Still accepted by parsers. */
const legacySystemSchemaValidator = z.object({
  entityRef: entityRefStringSchema.optional(),
  name: z.string().min(1),
  version: z.string().min(1),
  level: z.enum(['context', 'container', 'component', 'code']),
  /** @deprecated Prefer `entityRef`. Kept for legacy YAML/CLI output. */
  id: entityRefStringSchema.optional(),
  nodes: z.array(systemNodeSchema),
  dependencies: z.array(systemDependencySchema).optional(),
});

/**
 * JSON Schema (Draft 07) derived from {@link systemSchemaValidator} for IDE YAML hints.
 * Documents are a YAML mapping with `version` (schema URL), `level`, `metaData`, and `nodes`.
 * Regenerated by `pnpm --filter @blueprint/core generate:schema`.
 * Hosted at {@link systemSchemaPublicUrl} (`/schemas/v{n}/` and `/schemas/latest/`).
 */
export function toSystemSchemaJsonSchema(): Record<string, unknown> {
  const docSchema = z.toJSONSchema(systemSchemaValidator, { target: 'draft-07' }) as Record<
    string,
    unknown
  >;
  delete docSchema.$schema;
  const versionedId = systemSchemaPublicUrl(`v${SYSTEM_SCHEMA_MAJOR_VERSION}`);
  return {
    ...docSchema,
    $schema: 'http://json-schema.org/draft-07/schema#',
    $id: versionedId,
    title: 'Blueprint System Schema',
    description:
      'Declarative C4 diagram schema used by Blueprint CLI and designer. ' +
      'Root is a YAML mapping: version (schema URL), level, metaData (entityRef, name), nodes, dependencies. ' +
      'Generated from Zod — do not edit by hand.',
  };
}

/** Accept legacy object-root docs, one-element sequence form, or v3 metaData form. */
function unwrapSchemaDocument(parsed: unknown, kind: 'YAML' | 'JSON'): unknown {
  if (!parsed || typeof parsed !== 'object') {
    throw new Error(
      `Invalid schema ${kind}. Schema must be a YAML/JSON object or one-element sequence`
    );
  }
  if (Array.isArray(parsed)) {
    if (
      parsed.length !== 1 ||
      !parsed[0] ||
      typeof parsed[0] !== 'object' ||
      Array.isArray(parsed[0])
    ) {
      throw new Error(
        `Invalid schema ${kind}. Sequence form must contain exactly one diagram object`
      );
    }
    return parsed[0];
  }
  return parsed;
}

function mapValidatedSchema(validated: {
  entityRef?: string;
  id?: string;
  name: string;
  version: string;
  level: SystemSchema['level'];
  nodes: z.infer<typeof systemNodeSchema>[];
  dependencies?: z.infer<typeof systemDependencySchema>[];
}): SystemSchema {
  return {
    entityRef: validated.entityRef || validated.id || '',
    name: validated.name,
    version: validated.version,
    level: validated.level,
    nodes: validated.nodes.map(n => ({
      entityRef: n.entityRef,
      type: n.type,
      name: n.name,
      external: n.external,
      properties: n.properties || {},
      isTest: n.isTest,
      x: n.x,
      y: n.y,
      forensics: n.forensics,
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

function parseWireDocument(doc: unknown): SystemSchema {
  if (doc && typeof doc === 'object' && !Array.isArray(doc) && 'metaData' in doc) {
    const validated = systemSchemaValidator.parse(doc);
    return mapValidatedSchema({
      entityRef: validated.metaData.entityRef,
      name: validated.metaData.name,
      version: validated.version,
      level: validated.level,
      nodes: validated.nodes,
      dependencies: validated.dependencies,
    });
  }
  return mapValidatedSchema(legacySystemSchemaValidator.parse(doc));
}

function formatZodError(zodErr: z.ZodError): string {
  return zodErr.issues
    .map(issue => {
      const path = issue.path
        .map((p, idx) => (typeof p === 'number' ? `[${p}]` : (idx > 0 ? '.' : '') + String(p)))
        .join('');
      return `${path || 'root'}: ${issue.message}`;
    })
    .join('; ');
}

export function parseSchemaFromYaml(yamlContent: string): SystemSchema {
  let parsed: unknown;
  try {
    parsed = yaml.load(yamlContent);
  } catch (yamlErr: unknown) {
    const message = yamlErr instanceof Error ? yamlErr.message : String(yamlErr);
    throw new Error(`Invalid schema YAML. YAML Parsing Error: ${message}`);
  }

  try {
    return parseWireDocument(unwrapSchemaDocument(parsed, 'YAML'));
  } catch (zodErr) {
    if (zodErr instanceof z.ZodError) {
      throw new Error(`Invalid schema YAML. Schema Validation Error: ${formatZodError(zodErr)}`);
    }
    throw zodErr;
  }
}

export function parseSchemaFromJson(jsonContent: string): SystemSchema {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonContent);
  } catch (jsonErr: unknown) {
    const message = jsonErr instanceof Error ? jsonErr.message : String(jsonErr);
    throw new Error(`Invalid schema JSON. JSON Parsing Error: ${message}`);
  }

  try {
    return parseWireDocument(unwrapSchemaDocument(parsed, 'JSON'));
  } catch (zodErr) {
    if (zodErr instanceof z.ZodError) {
      throw new Error(`Invalid schema JSON. Schema Validation Error: ${formatZodError(zodErr)}`);
    }
    throw zodErr;
  }
}

/**
 * Serializes a SystemSchema model to a YAML string (CLI + designer share this format).
 * Root is a mapping: version (schema URL), level, metaData, nodes, dependencies.
 */
export function serializeSchemaToYaml(
  schema: SystemSchema,
  _options?: { schemaUrl?: string }
): string {
  const cleanSchema: Record<string, unknown> = {
    version: systemSchemaPublicUrl(),
    level: schema.level,
    metaData: {
      ...(schema.entityRef ? { entityRef: schema.entityRef } : {}),
      name: schema.name,
    },
  };

  cleanSchema.nodes = schema.nodes.map(n => {
    const cleaned: Record<string, unknown> = {
      entityRef: n.entityRef,
      type: n.type,
      name: n.name,
    };
    if (n.external !== undefined) cleaned.external = n.external;
    if (n.isTest !== undefined) cleaned.isTest = n.isTest;
    if (n.properties && Object.keys(n.properties).length > 0) {
      cleaned.properties = n.properties;
    }
    if (typeof n.x === 'number') cleaned.x = Math.round(n.x);
    if (typeof n.y === 'number') cleaned.y = Math.round(n.y);
    if (n.forensics) cleaned.forensics = cleanForensics(n.forensics);
    return cleaned;
  });

  cleanSchema.dependencies = schema.dependencies.map(d => {
    const cleaned: Record<string, unknown> = {
      from: d.from,
      to: d.to,
      type: d.type,
    };
    if (d.description) cleaned.description = d.description;
    return cleaned;
  });

  return (
    yaml
      .dump(cleanSchema, {
        noRefs: true,
        lineWidth: 120,
      })
      // js-yaml quotes `y` as a YAML 1.1 boolean alias; keep the key readable.
      .replace(/^([ \t]*)'y': /gm, '$1y: ')
  );
}

function cleanForensics(forensics: NonNullable<SystemSchema['nodes'][number]['forensics']>) {
  const cleaned: Record<string, unknown> = { ...forensics };
  if (Array.isArray(cleaned.classifications) && cleaned.classifications.length === 0) {
    delete cleaned.classifications;
  }
  if (Array.isArray(cleaned.coupledFiles) && cleaned.coupledFiles.length === 0) {
    delete cleaned.coupledFiles;
  }
  return cleaned;
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
