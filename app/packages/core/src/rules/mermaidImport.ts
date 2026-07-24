import type { C4Level, NodeType, SystemDependency, SystemSchema } from '../models/schema';
import { slugify } from '../lib/slug';
import { resolveShortEntityRef } from '../lib/entityRef';

export type MermaidFormat =
  'flowchart' | 'c4-context' | 'c4-container' | 'c4-component' | 'unknown';

export interface MermaidImportOptions {
  targetLevel: C4Level;
  parentEntityRef?: string;
  defaultNodeType?: NodeType;
}

export interface MermaidParseResult {
  schema: SystemSchema;
  format: MermaidFormat;
  warnings: string[];
}

interface ParsedNode {
  id: string;
  name: string;
  type: NodeType;
  external?: boolean;
  parentGroupId?: string;
}

interface ParsedEdge {
  from: string;
  to: string;
  type: SystemDependency['type'];
  description?: string;
}

function stripComments(source: string): string {
  return source
    .split('\n')
    .map(line => {
      const commentIdx = line.indexOf('%%');
      return (commentIdx === -1 ? line : line.slice(0, commentIdx)).trim();
    })
    .filter(line => line.length > 0)
    .join('\n');
}

function defaultTypeForLevel(level: C4Level, fallback?: NodeType): NodeType {
  if (fallback) return fallback;
  if (level === 'component') return 'component';
  if (level === 'context') return 'software-system';
  return 'microservice';
}

function scopeNodeRef(ref: string, parentEntityRef?: string): string {
  if (!parentEntityRef || ref.includes('/')) return ref;
  return resolveShortEntityRef(ref, parentEntityRef, undefined);
}

function scopeSchema(schema: SystemSchema, parentEntityRef?: string): SystemSchema {
  if (!parentEntityRef) return schema;
  return {
    ...schema,
    nodes: schema.nodes.map(n => ({
      ...n,
      entityRef: scopeNodeRef(n.entityRef, parentEntityRef),
    })),
    dependencies: schema.dependencies.map(d => ({
      ...d,
      from: scopeNodeRef(d.from, parentEntityRef),
      to: scopeNodeRef(d.to, parentEntityRef),
    })),
  };
}

function detectFormat(source: string): MermaidFormat {
  const trimmed = source.trim();
  if (/^C4Context\b/i.test(trimmed)) return 'c4-context';
  if (/^C4Container\b/i.test(trimmed)) return 'c4-container';
  if (/^C4Component\b/i.test(trimmed)) return 'c4-component';
  if (/^(graph|flowchart)\s+(TD|TB|BT|RL|LR)/i.test(trimmed)) return 'flowchart';
  return 'unknown';
}

function parseC4Element(line: string): ParsedNode | null {
  const patterns: Array<{
    regex: RegExp;
    type: NodeType;
    external?: boolean;
  }> = [
    { regex: /^Person\s*\(\s*([^,)]+)\s*,\s*"([^"]*)"/i, type: 'person' },
    {
      regex: /^System_Ext\s*\(\s*([^,)]+)\s*,\s*"([^"]*)"/i,
      type: 'software-system',
      external: true,
    },
    {
      regex: /^SystemDb_Ext\s*\(\s*([^,)]+)\s*,\s*"([^"]*)"/i,
      type: 'relational-database',
      external: true,
    },
    { regex: /^System\s*\(\s*([^,)]+)\s*,\s*"([^"]*)"/i, type: 'software-system' },
    { regex: /^ContainerDb\s*\(\s*([^,)]+)\s*,\s*"([^"]*)"/i, type: 'relational-database' },
    { regex: /^ContainerQueue\s*\(\s*([^,)]+)\s*,\s*"([^"]*)"/i, type: 'event-broker' },
    { regex: /^Container\s*\(\s*([^,)]+)\s*,\s*"([^"]*)"/i, type: 'container' },
    { regex: /^Component\s*\(\s*([^,)]+)\s*,\s*"([^"]*)"/i, type: 'component' },
  ];

  for (const { regex, type, external } of patterns) {
    const match = line.match(regex);
    if (match) {
      const alias = slugify(match[1].trim());
      return { id: alias, name: match[2].trim(), type, external };
    }
  }
  return null;
}

function parseC4Rel(line: string): ParsedEdge | null {
  // [^\s,)] — exclude whitespace so \s* cannot overlap (CodeQL js/polynomial-redos).
  const match = line.match(
    /^Rel(?:_U|_D|_L|_R)?\s*\(\s*([^\s,)]+)\s*,\s*([^\s,)]+)(?:\s*,\s*"([^"]*)")?\s*\)/i
  );
  if (!match) return null;
  return {
    from: slugify(match[1]),
    to: slugify(match[2]),
    type: 'direct-call',
    description: match[3]?.trim() || undefined,
  };
}

function parseC4(
  source: string,
  format: MermaidFormat,
  options: MermaidImportOptions
): MermaidParseResult {
  const warnings: string[] = [];
  const nodes: ParsedNode[] = [];
  const edges: ParsedEdge[] = [];
  const nodeIds = new Set<string>();

  const levelMap: Record<string, C4Level> = {
    'c4-context': 'context',
    'c4-container': 'container',
    'c4-component': 'component',
  };

  for (const rawLine of source.split('\n')) {
    const line = rawLine.trim();
    if (!line || /^C4/i.test(line) || /^title\b/i.test(line)) continue;
    if (/^(Enterprise_Boundary|System_Boundary|Boundary|Container_Boundary)\b/i.test(line)) {
      warnings.push(`Skipped boundary declaration: ${line.slice(0, 60)}`);
      continue;
    }
    if (/^(UpdateElementStyle|UpdateRelStyle|Lay_)/i.test(line)) {
      warnings.push(`Skipped styling directive: ${line.slice(0, 60)}`);
      continue;
    }

    const element = parseC4Element(line);
    if (element) {
      nodes.push(element);
      nodeIds.add(element.id);
      continue;
    }

    const rel = parseC4Rel(line);
    if (rel) {
      edges.push(rel);
    }
  }

  const schema: SystemSchema = {
    name: 'Imported C4 Diagram',
    version: '1.0.0',
    level: levelMap[format] ?? options.targetLevel,
    nodes: nodes.map(n => ({
      entityRef: n.id,
      type: n.type,
      name: n.name,
      external: n.external,
    })),
    dependencies: edges
      .filter(e => nodeIds.has(e.from) && nodeIds.has(e.to))
      .map(e => ({
        from: e.from,
        to: e.to,
        type: e.type,
        description: e.description,
      })),
  };

  return {
    schema: scopeSchema(schema, options.parentEntityRef),
    format,
    warnings,
  };
}

function inferTypeFromShape(shape: string, fallback: NodeType): NodeType {
  if (shape === 'database') return 'relational-database';
  if (shape === 'diamond') return 'event-broker';
  if (shape === 'subroutine') return 'serverless-function';
  if (shape === 'stadium') return 'person';
  return fallback;
}

/** Strip export decorations without regex (avoids CodeQL js/polynomial-redos). */
function stripFlowchartLabelDecorations(rawName: string): { name: string; external: boolean } {
  const externalSuffix = '(External)';
  const external = rawName.includes(externalSuffix);
  let name = rawName;
  if (name.startsWith('👤')) {
    name = name.slice('👤'.length).trimStart();
  }
  if (name.endsWith(externalSuffix)) {
    name = name.slice(0, -externalSuffix.length).trimEnd();
  }
  return { name, external };
}

function parseSubgraphLine(line: string): { id: string; title: string } | null {
  const trimmed = line.trim();
  if (!/^subgraph\b/i.test(trimmed)) return null;

  const idAndBracket = trimmed.match(/^subgraph\s+(\w+)\s*\[["']?([^"'\]]+)["']?\]\s*$/i);
  if (idAndBracket) {
    return { id: idAndBracket[1], title: idAndBracket[2].trim() };
  }

  const bracketOnly = trimmed.match(/^subgraph\s+\[["']?([^"'\]]+)["']?\]\s*$/i);
  if (bracketOnly) {
    const title = bracketOnly[1].trim();
    return { id: slugify(title), title };
  }

  const idBracketTitle = trimmed.match(/^subgraph\s+(\S+)\s+\[([^\]]+)\]\s*$/i);
  if (idBracketTitle) {
    const title = idBracketTitle[2].trim().replace(/^["']|["']$/g, '');
    return { id: idBracketTitle[1], title };
  }

  const rest = trimmed.replace(/^subgraph\s+/i, '').trim();
  if (!rest) return null;
  const quoted = rest.match(/^["'](.+)["']$/);
  const title = quoted ? quoted[1] : rest;
  return { id: slugify(title), title };
}

function registerParsedNode(
  nodeMap: Map<string, ParsedNode>,
  node: ParsedNode,
  parentGroupId?: string
) {
  const incoming = parentGroupId ? { ...node, parentGroupId } : node;
  const existing = nodeMap.get(incoming.id);
  if (!existing) {
    nodeMap.set(incoming.id, incoming);
    return;
  }

  const incomingIsPlaceholder = incoming.name === incoming.id;
  const existingIsPlaceholder = existing.name === existing.id;

  nodeMap.set(incoming.id, {
    ...existing,
    ...incoming,
    name: incomingIsPlaceholder && !existingIsPlaceholder ? existing.name : incoming.name,
    type:
      incoming.type === 'group' ? 'group' : incomingIsPlaceholder ? existing.type : incoming.type,
    external: incoming.external ?? existing.external,
    parentGroupId: incoming.parentGroupId ?? existing.parentGroupId,
  });
}

function parseFlowchartNode(line: string, defaultType: NodeType): ParsedNode | null {
  const patterns: Array<{ regex: RegExp; shape: string }> = [
    { regex: /^(\w+)\[\["([^"]*)"\]\]/, shape: 'subroutine' },
    { regex: /^(\w+)\[\("([^"]*)"\)\]/, shape: 'database' },
    { regex: /^(\w+)\{"([^"]*)"\}/, shape: 'diamond' },
    { regex: /^(\w+)\["([^"]*)"\]/, shape: 'rect' },
    { regex: /^(\w+)\(\("([^"]*)"\)\)/, shape: 'database' },
    { regex: /^(\w+)\(([^)]*)\)/, shape: 'rect' },
    { regex: /^(\w+)\[([^\]]*)\]/, shape: 'rect' },
    { regex: /^(\w+)$/, shape: 'rect' },
  ];

  const trimmed = line.trim();
  // String includes — avoid /-->/ regex (CodeQL js/bad-tag-filter false positive).
  if (!trimmed || trimmed.includes('-->') || trimmed.includes('-.->')) return null;
  if (/^(graph|flowchart|subgraph|end)\b/i.test(trimmed)) return null;

  for (const { regex, shape } of patterns) {
    const match = trimmed.match(regex);
    if (match) {
      const id = slugify(match[1]);
      const rawName = match[2]?.trim() || match[1];
      const { name, external } = stripFlowchartLabelDecorations(rawName);
      const type = inferTypeFromShape(shape, defaultType);
      return { id, name, type, external: external || undefined };
    }
  }
  return null;
}

function parseFlowchartEdge(line: string): ParsedEdge | null {
  const dotted = line.match(
    /^([\w]+)(?:\[[^\]]*\]|\([^)]*\)|\{[^}]*\})?\s*-\.->\s*(?:\|"([^"]*)"\|\s*)?([\w]+)(?:\[[^\]]*\]|\([^)]*\)|\{[^}]*\})?\s*$/
  );
  if (dotted) {
    return {
      from: slugify(dotted[1]),
      to: slugify(dotted[3]),
      type: 'publish-subscribe',
      description: dotted[2]?.trim(),
    };
  }

  const solid = line.match(
    /^([\w]+)(?:\[[^\]]*\]|\([^)]*\)|\{[^}]*\})?\s*-->\s*(?:\|"([^"]*)"\|\s*)?([\w]+)(?:\[[^\]]*\]|\([^)]*\)|\{[^}]*\})?\s*$/
  );
  if (solid) {
    return {
      from: slugify(solid[1]),
      to: slugify(solid[3]),
      type: 'direct-call',
      description: solid[2]?.trim(),
    };
  }

  return null;
}

function extractNodesFromEdgeLine(line: string, defaultType: NodeType): ParsedNode[] {
  const nodes: ParsedNode[] = [];
  // String split — avoid /-->/ regex (CodeQL js/bad-tag-filter false positive).
  const fragments = line
    .split('-->')
    .flatMap(part => part.split('-.->'))
    .map(part => part.trim());
  for (const fragment of fragments) {
    const trimmed = fragment.replace(/\|"?[^"|]*"?\|/g, '').trim();
    const node = parseFlowchartNode(trimmed, defaultType);
    if (node) nodes.push(node);
  }
  return nodes;
}

function parseFlowchart(source: string, options: MermaidImportOptions): MermaidParseResult {
  const warnings: string[] = [];
  const cleaned = stripComments(source);
  const defaultType = defaultTypeForLevel(options.targetLevel, options.defaultNodeType);

  const nodeMap = new Map<string, ParsedNode>();
  const edges: ParsedEdge[] = [];
  const subgraphStack: string[] = [];

  const currentParentGroupId = () =>
    subgraphStack.length > 0 ? subgraphStack[subgraphStack.length - 1] : undefined;

  for (const rawLine of cleaned.split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;

    if (/^end\b/i.test(line)) {
      if (subgraphStack.length > 0) {
        subgraphStack.pop();
      }
      continue;
    }

    const subgraph = parseSubgraphLine(line);
    if (subgraph) {
      if (subgraphStack.length > 0) {
        warnings.push('Nested subgraphs are flattened (one level of grouping supported).');
      }
      const groupId = slugify(subgraph.id);
      registerParsedNode(
        nodeMap,
        { id: groupId, name: subgraph.title, type: 'group' },
        currentParentGroupId()
      );
      subgraphStack.push(groupId);
      continue;
    }

    const edge = parseFlowchartEdge(line);
    if (edge) {
      edges.push(edge);
      for (const n of extractNodesFromEdgeLine(line, defaultType)) {
        if (!nodeMap.has(n.id)) {
          registerParsedNode(nodeMap, n, currentParentGroupId());
        }
      }
      if (!nodeMap.has(edge.from)) {
        registerParsedNode(
          nodeMap,
          { id: edge.from, name: edge.from, type: defaultType },
          currentParentGroupId()
        );
      }
      if (!nodeMap.has(edge.to)) {
        registerParsedNode(
          nodeMap,
          { id: edge.to, name: edge.to, type: defaultType },
          currentParentGroupId()
        );
      }
      continue;
    }

    const node = parseFlowchartNode(line, defaultType);
    if (node) {
      registerParsedNode(nodeMap, node, currentParentGroupId());
    }
  }

  const nodes = [...nodeMap.values()];
  const nodeIds = new Set(nodes.map(n => n.id));

  const schema: SystemSchema = {
    name: 'Imported Flowchart',
    version: '1.0.0',
    level: options.targetLevel,
    nodes: nodes.map(n => ({
      entityRef: n.id,
      type: n.type,
      name: n.name,
      external: n.external,
      ...(n.parentGroupId ? { parentEntityRef: n.parentGroupId } : {}),
    })),
    dependencies: edges
      .filter(e => nodeIds.has(e.from) && nodeIds.has(e.to))
      .map(e => ({
        from: e.from,
        to: e.to,
        type: e.type,
        description: e.description,
      })),
  };

  return {
    schema: scopeSchema(schema, options.parentEntityRef),
    format: 'flowchart',
    warnings,
  };
}

/**
 * Parses Mermaid diagram text into a provisional SystemSchema.
 */
export function parseMermaidToSchema(
  mermaid: string,
  options: MermaidImportOptions
): MermaidParseResult {
  const source = stripComments(mermaid.trim());
  if (!source) {
    throw new Error('Mermaid input is empty.');
  }

  const format = detectFormat(source);
  if (format === 'unknown') {
    throw new Error(
      'Unrecognised or unsupported Mermaid diagram type. Supported: flowchart, graph, C4Context, C4Container, C4Component.'
    );
  }

  if (format.startsWith('c4-')) {
    return parseC4(source, format, options);
  }

  return parseFlowchart(source, options);
}

/**
 * Extracts Mermaid source from a markdown fenced block, or returns trimmed input.
 * Uses indexOf/scan instead of a regex to avoid ReDoS (CodeQL js/polynomial-redos).
 */
export function extractMermaidFromMarkdown(content: string): string {
  const open = '```mermaid';
  const lower = content.toLowerCase();
  let searchFrom = 0;

  while (searchFrom < content.length) {
    const start = lower.indexOf(open, searchFrom);
    if (start === -1) {
      break;
    }

    let i = start + open.length;
    // Allow horizontal whitespace after the language tag, then require a newline.
    let validOpen = false;
    while (i < content.length) {
      const c = content[i];
      if (c === ' ' || c === '\t' || c === '\r') {
        i++;
        continue;
      }
      if (c === '\n') {
        i++;
        validOpen = true;
        break;
      }
      break;
    }

    if (!validOpen) {
      searchFrom = start + open.length;
      continue;
    }

    const closeIdx = content.indexOf('```', i);
    if (closeIdx === -1) {
      break;
    }

    return content.slice(i, closeIdx).trim();
  }

  return content.trim();
}
