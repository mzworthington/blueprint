import { resolveRelativePath } from './path';

const PROJECT_REFERENCE_RE = /<ProjectReference\b[^>]*\bInclude\s*=\s*["']([^"']+)["']/gi;

/** Extract `ProjectReference` Include paths from a .csproj file. */
export function parseCsprojProjectReferences(content: string): string[] {
  const refs: string[] = [];
  let match: RegExpExecArray | null;
  const re = new RegExp(PROJECT_REFERENCE_RE.source, 'gi');
  while ((match = re.exec(content)) !== null) {
    refs.push(match[1]);
  }
  return refs;
}

/** Project name without directory or `.csproj` extension. */
export function csprojBasename(includePath: string): string {
  const normalized = includePath.replace(/\\/g, '/');
  const file = normalized.split('/').pop() || normalized;
  return file.replace(/\.csproj$/i, '');
}

/** Resolve a ProjectReference path relative to the owning .csproj file. */
export function resolveCsprojReferencePath(
  csprojRelativePath: string,
  includePath: string
): string {
  const normalizedInclude = includePath.replace(/\\/g, '/');
  const normalizedCsproj = csprojRelativePath.replace(/\\/g, '/');
  return resolveRelativePath(normalizedCsproj, normalizedInclude);
}
