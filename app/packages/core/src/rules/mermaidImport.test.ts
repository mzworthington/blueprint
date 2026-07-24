import { describe, it, expect } from 'vitest';
import { parseMermaidToSchema, extractMermaidFromMarkdown } from './mermaidImport';

describe('parseMermaidToSchema — flowchart', () => {
  it('parses a simple graph TD with nodes and edges', () => {
    const mermaid = `graph TD
    Gateway["Gateway Node"]
  DB[("DB Node")]
  Gateway --> DB`;

    const result = parseMermaidToSchema(mermaid, { targetLevel: 'container' });

    expect(result.format).toBe('flowchart');
    expect(result.schema.level).toBe('container');
    expect(result.schema.nodes).toHaveLength(2);
    expect(result.schema.nodes.find(n => n.entityRef === 'gateway')).toMatchObject({
      name: 'Gateway Node',
      type: 'microservice',
    });
    expect(result.schema.nodes.find(n => n.entityRef === 'db')).toMatchObject({
      name: 'DB Node',
      type: 'relational-database',
    });
    expect(result.schema.dependencies).toHaveLength(1);
    expect(result.schema.dependencies[0]).toMatchObject({
      from: 'gateway',
      to: 'db',
      type: 'direct-call',
    });
  });

  it('parses labeled edges with descriptions', () => {
    const mermaid = `graph TD
    A["Service A"] --> |"Query"| B[("Database")]`;

    const result = parseMermaidToSchema(mermaid, { targetLevel: 'container' });

    expect(result.schema.dependencies[0]).toMatchObject({
      from: 'a',
      to: 'b',
      type: 'direct-call',
      description: 'Query',
    });
  });

  it('parses publish-subscribe edges from dotted arrows', () => {
    const mermaid = `graph TD
    Pub["Publisher"] -.-> Sub["Subscriber"]`;

    const result = parseMermaidToSchema(mermaid, { targetLevel: 'container' });

    expect(result.schema.dependencies[0].type).toBe('publish-subscribe');
  });

  it('infers event-broker from diamond shape', () => {
    const mermaid = `graph TD
    Q{"Event Queue"}`;

    const result = parseMermaidToSchema(mermaid, { targetLevel: 'container' });

    expect(result.schema.nodes[0]).toMatchObject({
      entityRef: 'q',
      name: 'Event Queue',
      type: 'event-broker',
    });
  });

  it('parses subgraph blocks into group nodes with parentEntityRef', () => {
    const mermaid = `graph TD
    subgraph Driving [Driving UI]
      Canvas[Canvas.tsx]
    end
    Canvas --> Store[Store]`;

    const result = parseMermaidToSchema(mermaid, { targetLevel: 'container' });

    expect(result.warnings.some(w => w.toLowerCase().includes('flattened'))).toBe(false);
    expect(result.schema.nodes.find(n => n.entityRef === 'driving')).toMatchObject({
      type: 'group',
      name: 'Driving UI',
    });
    expect(result.schema.nodes.find(n => n.entityRef === 'canvas')).toMatchObject({
      name: 'Canvas.tsx',
      parentEntityRef: 'driving',
    });
    expect(result.schema.nodes.find(n => n.entityRef === 'store')).toMatchObject({
      name: 'Store',
    });
    expect(result.schema.nodes.find(n => n.entityRef === 'store')?.parentEntityRef).toBeUndefined();
  });

  it('defaults component type at component level', () => {
    const mermaid = `flowchart LR
    Widget["Widget"]`;

    const result = parseMermaidToSchema(mermaid, { targetLevel: 'component' });

    expect(result.schema.nodes[0].type).toBe('component');
  });

  it('strips person emoji and (External) suffix from flowchart labels', () => {
    const mermaid = `graph TD
    User["👤 Alice"]
    Ext["Payment API (External)"]`;

    const result = parseMermaidToSchema(mermaid, { targetLevel: 'context' });

    expect(result.schema.nodes.find(n => n.entityRef === 'user')).toMatchObject({
      name: 'Alice',
    });
    expect(result.schema.nodes.find(n => n.entityRef === 'ext')).toMatchObject({
      name: 'Payment API',
      external: true,
    });
  });

  it('throws on unrecognised diagram type', () => {
    expect(() =>
      parseMermaidToSchema('sequenceDiagram\n  A->>B: hello', { targetLevel: 'container' })
    ).toThrow(/unrecognised|unsupported/i);
  });
});

describe('parseMermaidToSchema — C4', () => {
  it('parses C4Context with Person, System, and Rel', () => {
    const mermaid = `C4Context
    title System Context
    Person(user, "Banking Customer")
    System(banking, "Internet Banking System")
    Rel(user, banking, "Uses")`;

    const result = parseMermaidToSchema(mermaid, { targetLevel: 'context' });

    expect(result.format).toBe('c4-context');
    expect(result.schema.level).toBe('context');
    expect(result.schema.nodes).toHaveLength(2);
    expect(result.schema.nodes.find(n => n.entityRef === 'user')).toMatchObject({
      type: 'person',
      name: 'Banking Customer',
    });
    expect(result.schema.nodes.find(n => n.entityRef === 'banking')).toMatchObject({
      type: 'software-system',
      name: 'Internet Banking System',
    });
    expect(result.schema.dependencies[0]).toMatchObject({
      from: 'user',
      to: 'banking',
      description: 'Uses',
    });
  });

  it('parses C4Container with ContainerDb and external systems', () => {
    const mermaid = `C4Container
    Person(customer, "Customer")
    System_Ext(payment, "Payment Gateway")
    Container(web, "Web App", "React")
    ContainerDb(db, "Database", "PostgreSQL")
    Rel(customer, web, "Uses")
    Rel(web, db, "Reads/Writes")
    Rel(web, payment, "Pays via")`;

    const result = parseMermaidToSchema(mermaid, { targetLevel: 'container' });

    expect(result.format).toBe('c4-container');
    expect(result.schema.nodes.find(n => n.entityRef === 'db')).toMatchObject({
      type: 'relational-database',
    });
    expect(result.schema.nodes.find(n => n.entityRef === 'payment')).toMatchObject({
      external: true,
    });
    expect(result.schema.dependencies.length).toBeGreaterThanOrEqual(3);
  });

  it('parses C4Component diagram', () => {
    const mermaid = `C4Component
    Container(api, "API")
    Component(controller, "Controller", "REST")
    Rel(api, controller, "Delegates")`;

    const result = parseMermaidToSchema(mermaid, { targetLevel: 'component' });

    expect(result.format).toBe('c4-component');
    expect(result.schema.level).toBe('component');
    expect(result.schema.nodes.find(n => n.entityRef === 'controller')).toMatchObject({
      type: 'component',
    });
  });

  it('parses directed Rel variants and ignores malformed Rel lines', () => {
    const spaces = ' '.repeat(5000);
    const mermaid = `C4Context
    Person(user, "User")
    System(api, "API")
    Rel_U(user, api, "Calls")
    Rel(${spaces}
    Rel((,${spaces}`;

    const result = parseMermaidToSchema(mermaid, { targetLevel: 'context' });

    expect(result.schema.dependencies).toEqual([
      expect.objectContaining({ from: 'user', to: 'api', description: 'Calls' }),
    ]);
  });
});

describe('extractMermaidFromMarkdown', () => {
  it('extracts the first mermaid fenced block', () => {
    const md = `# Title

Some text.

\`\`\`mermaid
graph TD
  A --> B
\`\`\`

More text.`;

    expect(extractMermaidFromMarkdown(md)).toContain('graph TD');
    expect(extractMermaidFromMarkdown(md)).toContain('A --> B');
  });

  it('is case-insensitive on the fence language tag', () => {
    const md = '```Mermaid\ngraph TD\n  A --> B\n```';
    expect(extractMermaidFromMarkdown(md)).toContain('graph TD');
  });

  it('returns trimmed input when no fence is found', () => {
    expect(extractMermaidFromMarkdown('graph TD\n  A --> B')).toContain('graph TD');
  });

  it('returns trimmed input when fence opener has non-whitespace junk', () => {
    const md = '```mermaidx\ngraph TD\n  A --> B\n```';
    expect(extractMermaidFromMarkdown(md)).toBe(md.trim());
  });

  it('skips an invalid mermaid-prefixed fence and uses a later valid one', () => {
    const md = `\`\`\`mermaidx
ignored
\`\`\`

\`\`\`mermaid
graph TD
  A --> B
\`\`\``;
    expect(extractMermaidFromMarkdown(md)).toContain('graph TD');
  });
});
