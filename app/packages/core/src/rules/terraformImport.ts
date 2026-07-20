import { parse as parseHcl } from '@cruglobal/js-hcl2';
import type { SystemSchema } from '../models/schema';
import {
  addressToEntityRefSlug,
  infraIrToSchema,
  mintEntityRef,
  type InfraImportOptions,
} from './infraSchemaMap';
import type { InfraEdge, InfraIR, InfraNode } from './infraIr';

export type TerraformFormat = 'hcl' | 'json';

export interface TerraformImportOptions extends InfraImportOptions {
  /** Force format; default auto-detects JSON vs HCL. */
  sourceFormat?: TerraformFormat | 'auto';
}

export interface TerraformParseResult {
  schema: SystemSchema;
  format: TerraformFormat;
  warnings: string[];
}

export interface TerraformSourceFile {
  path: string;
  content: string;
  sourceFormat?: TerraformFormat | 'auto';
}

interface HclExpression {
  __hcl: 'expression';
  kind?: string;
  source?: string;
}

function isExpression(value: unknown): value is HclExpression {
  return (
    typeof value === 'object' && value !== null && (value as HclExpression).__hcl === 'expression'
  );
}

function detectFormat(source: string, forced?: TerraformFormat | 'auto'): TerraformFormat {
  if (forced === 'hcl' || forced === 'json') return forced;
  const trimmed = source.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) return 'json';
  return 'hcl';
}

function parseDocument(source: string, format: TerraformFormat): Record<string, unknown> {
  if (format === 'json') {
    const parsed: unknown = JSON.parse(source);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new Error('Terraform JSON root must be an object');
    }
    return parsed as Record<string, unknown>;
  }
  return parseHcl(source) as Record<string, unknown>;
}

export { addressToEntityRefSlug, mintEntityRef };

function collectExpressionSources(value: unknown, out: string[]): void {
  if (isExpression(value)) {
    if (typeof value.source === 'string' && value.source.length > 0) {
      out.push(value.source);
    }
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectExpressionSources(item, out);
    return;
  }
  if (typeof value === 'object' && value !== null) {
    for (const child of Object.values(value)) collectExpressionSources(child, out);
  }
}

const META_ROOTS = new Set(['var', 'local', 'path', 'terraform', 'each', 'count', 'self']);

/**
 * Extract Terraform addresses referenced in an expression source string.
 * Handles TYPE.NAME[.attr], data.TYPE.NAME[.attr], module.NAME[.attr].
 */
export function extractAddressesFromExpression(source: string): string[] {
  const addresses = new Set<string>();
  const re =
    /\b(?:data\.([A-Za-z0-9_]+)\.([A-Za-z0-9_]+)|module\.([A-Za-z0-9_]+)|([A-Za-z][A-Za-z0-9_]*)\.([A-Za-z0-9_]+))(?:\.[A-Za-z0-9_]+)*\b/g;

  let match: RegExpExecArray | null;
  while ((match = re.exec(source)) !== null) {
    if (match[1] !== undefined && match[2] !== undefined) {
      addresses.add(`data.${match[1]}.${match[2]}`);
      continue;
    }
    if (match[3] !== undefined) {
      addresses.add(`module.${match[3]}`);
      continue;
    }
    const type = match[4];
    const name = match[5];
    if (!type || !name) continue;
    if (META_ROOTS.has(type)) continue;
    addresses.add(`${type}.${name}`);
  }

  return [...addresses];
}

function asBody(value: unknown): Record<string, unknown> {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function hasExpansionMeta(body: Record<string, unknown>): boolean {
  return 'for_each' in body || 'count' in body;
}

function pushNode(
  nodes: InfraNode[],
  seen: Map<string, string>,
  fileLabel: string,
  node: InfraNode
): void {
  const prior = seen.get(node.address);
  if (prior) {
    throw new Error(
      `duplicate-address: ${node.address} declared in both ${prior} and ${fileLabel}`
    );
  }
  seen.set(node.address, fileLabel);
  nodes.push(node);
}

function extractFromDocument(
  doc: Record<string, unknown>,
  fileLabel: string,
  nodes: InfraNode[],
  seen: Map<string, string>
): void {
  const resources = doc.resource;
  if (typeof resources === 'object' && resources !== null) {
    for (const [providerType, byName] of Object.entries(resources as Record<string, unknown>)) {
      if (typeof byName !== 'object' || byName === null) continue;
      for (const [name, rawBody] of Object.entries(byName as Record<string, unknown>)) {
        const body = asBody(rawBody);
        pushNode(nodes, seen, fileLabel, {
          address: `${providerType}.${name}`,
          kind: 'resource',
          providerType,
          name,
          hasExpansion: hasExpansionMeta(body),
          body,
        });
      }
    }
  }

  const data = doc.data;
  if (typeof data === 'object' && data !== null) {
    for (const [providerType, byName] of Object.entries(data as Record<string, unknown>)) {
      if (typeof byName !== 'object' || byName === null) continue;
      for (const [name, rawBody] of Object.entries(byName as Record<string, unknown>)) {
        const body = asBody(rawBody);
        pushNode(nodes, seen, fileLabel, {
          address: `data.${providerType}.${name}`,
          kind: 'data',
          providerType,
          name,
          hasExpansion: hasExpansionMeta(body),
          body,
        });
      }
    }
  }

  const modules = doc.module;
  if (typeof modules === 'object' && modules !== null) {
    for (const [name, rawBody] of Object.entries(modules as Record<string, unknown>)) {
      const body = asBody(rawBody);
      const source = typeof body.source === 'string' ? body.source : undefined;
      pushNode(nodes, seen, fileLabel, {
        address: `module.${name}`,
        kind: 'module',
        providerType: 'module',
        name,
        source,
        hasExpansion: hasExpansionMeta(body),
        body,
      });
    }
  }
}

function buildEdges(nodes: InfraNode[], warnings: string[]): InfraEdge[] {
  const addressSet = new Set(nodes.map(n => n.address));
  const edges: InfraEdge[] = [];
  const edgeKeys = new Set<string>();

  const addEdge = (from: string, to: string, via: string) => {
    if (from === to) return;
    if (!addressSet.has(to)) {
      warnings.push(`unresolved-ref:${via}`);
      return;
    }
    const key = `${from}->${to}`;
    if (edgeKeys.has(key)) return;
    edgeKeys.add(key);
    edges.push({ from, to, via });
  };

  for (const node of nodes) {
    const sources: string[] = [];
    collectExpressionSources(node.body, sources);

    for (const expr of sources) {
      const refs = extractAddressesFromExpression(expr);
      if (
        refs.length === 0 &&
        /\b[a-zA-Z][a-zA-Z0-9_]*\.[a-zA-Z0-9_]+/.test(expr) &&
        !/\b(var|local|path|terraform|each|count|self)\./.test(expr)
      ) {
        warnings.push(`unresolved-ref:${expr}`);
        continue;
      }
      for (const ref of refs) {
        if (ref === node.address) continue;
        addEdge(node.address, ref, expr);
      }
    }
  }

  return edges;
}

export function documentToInfraIR(
  docs: Array<{ label: string; doc: Record<string, unknown> }>
): InfraIR {
  const nodes: InfraNode[] = [];
  const seen = new Map<string, string>();
  const warnings: string[] = [];

  for (const { label, doc } of docs) {
    extractFromDocument(doc, label, nodes, seen);
  }

  for (const node of nodes) {
    if (node.hasExpansion) {
      warnings.push(`for_each/count: emitting one representative node for ${node.address}`);
    }
  }

  const edges = buildEdges(nodes, warnings);
  return { nodes, edges, warnings };
}

function parseSourcesToIr(
  files: Array<{ path: string; content: string; sourceFormat?: TerraformFormat | 'auto' }>
): { ir: InfraIR; format: TerraformFormat } {
  const docs: Array<{ label: string; doc: Record<string, unknown> }> = [];
  let format: TerraformFormat = 'hcl';

  for (const file of files) {
    const detected = detectFormat(file.content, file.sourceFormat ?? 'auto');
    format = detected;
    const doc = parseDocument(file.content, detected);
    docs.push({ label: file.path, doc });
  }

  return { ir: documentToInfraIR(docs), format };
}

/** Pull HCL/Terraform out of a markdown fenced block when present. */
export function extractTerraformFromMarkdown(text: string): string {
  // [ \t]* (not \s*) avoids newline backtracking / ReDoS.
  const fence = /```(?:hcl|tf|terraform)?[ \t]*\n([\s\S]*?)```/i.exec(text);
  if (fence?.[1]) return fence[1].trim();
  return text.trim();
}

export function parseTerraformToSchema(
  source: string,
  options: TerraformImportOptions
): TerraformParseResult {
  const format = detectFormat(source, options.sourceFormat ?? 'auto');
  const doc = parseDocument(source, format);
  const ir = documentToInfraIR([{ label: '<input>', doc }]);
  const { schema, warnings } = infraIrToSchema(ir, options);
  return { schema, format, warnings };
}

export function parseTerraformBatchToSchema(
  files: TerraformSourceFile[],
  options: TerraformImportOptions
): TerraformParseResult {
  if (files.length === 0) {
    return {
      schema: {
        name: 'infrastructure',
        version: '0.1.0',
        level: options.targetLevel,
        nodes: [],
        dependencies: [],
        ...(options.parentEntityRef ? { entityRef: options.parentEntityRef } : {}),
      },
      format: 'hcl',
      warnings: [],
    };
  }

  const { ir, format } = parseSourcesToIr(files);
  const { schema, warnings } = infraIrToSchema(ir, options);
  return { schema, format, warnings };
}

// Re-export kinds for adapters
export type { InfraKind, InfraIR, InfraNode, InfraEdge } from './infraIr';
