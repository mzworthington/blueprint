/**
 * Filter feature-report Markdown (##+ headings + `-` list items) by query.
 * Keeps the leading intro; keeps ancestor headings of matches.
 */
export type FeatureFilterMode = 'text' | 'package';

export function filterFeatureMarkdown(
  markdown: string,
  query: string,
  mode: FeatureFilterMode = 'text'
): string {
  const q = query.trim().toLowerCase();
  if (!q) return markdown;

  const lines = markdown.split('\n');
  const intro: string[] = [];
  let i = 0;
  while (i < lines.length && !/^#{2,6}\s/.test(lines[i]!)) {
    intro.push(lines[i]!);
    i++;
  }

  type Node = {
    heading: string;
    level: number;
    items: string[];
    children: Node[];
  };

  const roots: Node[] = [];
  const stack: Node[] = [];

  for (; i < lines.length; i++) {
    const line = lines[i]!;
    const heading = line.match(/^(#{2,6})\s+(.+)$/);
    if (heading) {
      const node: Node = {
        heading: heading[2]!.trim(),
        level: heading[1]!.length,
        items: [],
        children: [],
      };
      while (stack.length && stack[stack.length - 1]!.level >= node.level) {
        stack.pop();
      }
      if (stack.length === 0) {
        roots.push(node);
      } else {
        stack[stack.length - 1]!.children.push(node);
      }
      stack.push(node);
      continue;
    }
    if (stack.length && /^\s*-\s+/.test(line)) {
      stack[stack.length - 1]!.items.push(line);
    }
  }

  function matchNode(node: Node): Node | null {
    if (mode === 'package') {
      // Only top-level ## package headings — exact title match, full subtree.
      return node.level === 2 && node.heading.toLowerCase() === q ? node : null;
    }

    const headingHit = node.heading.toLowerCase().includes(q);
    if (headingHit) {
      return node;
    }

    const items = node.items.filter(item => item.toLowerCase().includes(q));
    const children = node.children
      .map(child => matchNode(child))
      .filter((c): c is Node => c !== null);

    if (items.length === 0 && children.length === 0) return null;
    return { heading: node.heading, level: node.level, items, children };
  }

  function emit(node: Node, out: string[]): void {
    out.push(`${'#'.repeat(node.level)} ${node.heading}`);
    out.push(...node.items);
    for (const child of node.children) emit(child, out);
  }

  const out: string[] = [...intro];
  for (const root of roots) {
    const matched = matchNode(root);
    if (matched) emit(matched, out);
  }

  return `${out
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trimEnd()}\n`;
}

export function resolveFeatureFilterMode(
  query: string,
  packages: readonly string[]
): FeatureFilterMode {
  const q = query.trim().toLowerCase();
  if (!q) return 'text';
  return packages.some(p => p.toLowerCase() === q) ? 'package' : 'text';
}

export function countFeatureMatches(
  markdown: string,
  query: string,
  mode: FeatureFilterMode = 'text'
): number {
  const q = query.trim().toLowerCase();
  if (!q) {
    return markdown.split('\n').filter(l => /^\s*-\s+/.test(l)).length;
  }
  return filterFeatureMarkdown(markdown, query, mode)
    .split('\n')
    .filter(l => /^\s*-\s+/.test(l)).length;
}

/** Top-level ## headings for an on-page outline. */
export function extractFeatureOutline(markdown: string): string[] {
  return markdown
    .split('\n')
    .map(l => l.match(/^##\s+(.+)$/)?.[1]?.trim())
    .filter((h): h is string => Boolean(h));
}
