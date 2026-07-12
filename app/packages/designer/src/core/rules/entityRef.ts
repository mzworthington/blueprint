import type { SystemSchema } from '../models/schema';
import { slugify } from './slug';
import { resolveRelativePath } from './path';

/**
 * Extracts a human-readable system ID from a blueprint file path.
 * Paths are typically structured as "blueprints/[system-name]/[file-name].yaml".
 */
export function getSystemIdFromPath(filePath: string): string {
  const normalized = filePath.replace(/\\/g, '/');
  const parts = normalized.split('/');

  const blueprintsIndex = parts.indexOf('blueprints');
  if (blueprintsIndex !== -1 && blueprintsIndex + 1 < parts.length) {
    return slugify(parts[blueprintsIndex + 1]).replace(/_/g, '-');
  }

  if (parts.length > 1) {
    return slugify(parts[parts.length - 2]).replace(/_/g, '-');
  }

  return 'default';
}

/**
 * Strips the extension and components suffix from a filename to make a clean slug.
 * E.g., "test-utils-components.yaml" -> "test-utils"
 */
export function getFileSlug(filePath: string): string {
  const parts = filePath.replace(/\\/g, '/').split('/');
  const fileName = parts[parts.length - 1];
  const baseName = fileName.replace(/(-components)?\.ya?ml$/i, '');
  return slugify(baseName).replace(/_/g, '-');
}

export function isEntityRef(ref: string | undefined): boolean {
  if (!ref) return false;
  const clean = ref.trim();
  if (clean.startsWith('.') || clean.startsWith('/') || clean.startsWith('\\')) {
    return false;
  }
  if (clean.endsWith('.yaml') || clean.endsWith('.yml')) {
    return false;
  }
  return true;
}

export function getSchemaEntityRef(
  schema: SystemSchema,
  filePath: string,
  workspaceName?: string | null
): string {
  if (schema.level === 'component' && schema.parentRef && isEntityRef(schema.parentRef)) {
    return schema.parentRef;
  }
  const systemId = getSystemIdFromPath(filePath);
  if (systemId === 'default') {
    const name = workspaceName || schema.name;
    if (name) {
      return slugify(name).replace(/_/g, '-');
    }
  }
  return systemId;
}

export interface ResolvedWorkspaceState {
  schemas: Record<string, SystemSchema>;
  nodeRefMap: Record<string, Record<string, string>>;
}

/**
 * Processes all schemas in the workspace, calculates their C4 hierarchical FQNs,
 * and sets the resolved `entityRef` on every node. It also updates dependency targets.
 */
export function resolveWorkspaceEntityRefs(
  files: Array<{ path: string; schema: SystemSchema }>
): ResolvedWorkspaceState {
  const nodeRefMapByPath = new Map<string, Map<string, string>>();
  const parentContainerMap = new Map<string, string>();

  for (const file of files) {
    nodeRefMapByPath.set(file.path, new Map<string, string>());
  }

  for (const file of files) {
    const systemId = getSystemIdFromPath(file.path);
    if (file.schema.level === 'container') {
      const refMap = nodeRefMapByPath.get(file.path)!;
      for (const node of file.schema.nodes) {
        const containerFQN = `${systemId}/${node.id}`;
        refMap.set(node.id, containerFQN);

        if (node.c4Ref) {
          const resolvedChildPath = resolveRelativePath(file.path, node.c4Ref);
          parentContainerMap.set(resolvedChildPath, containerFQN);
        }
      }
    }
  }

  for (const file of files) {
    const systemId = getSystemIdFromPath(file.path);

    if (file.schema.level === 'component') {
      let parentContainerFQN = parentContainerMap.get(file.path);
      if (!parentContainerFQN && file.schema.parentRef && isEntityRef(file.schema.parentRef)) {
        parentContainerFQN = file.schema.parentRef;
      }

      const refMap = nodeRefMapByPath.get(file.path)!;
      for (const node of file.schema.nodes) {
        if (parentContainerFQN) {
          refMap.set(node.id, `${parentContainerFQN}/${node.id}`);
        } else {
          const fileSlug = getFileSlug(file.path);
          refMap.set(node.id, `${systemId}/${fileSlug}/${node.id}`);
        }
      }
    } else if (file.schema.level === 'context') {
      const refMap = nodeRefMapByPath.get(file.path)!;
      for (const node of file.schema.nodes) {
        refMap.set(node.id, node.id);
      }
    }
  }

  const resolvedSchemas = new Map<string, SystemSchema>();
  const nodeRefMap: Record<string, Record<string, string>> = Object.create(null);

  for (const file of files) {
    const systemId = getSystemIdFromPath(file.path);
    const fileRefMap = nodeRefMapByPath.get(file.path) ?? new Map<string, string>();

    const resolvedNodes = file.schema.nodes.map(node => {
      const entityRef = fileRefMap.get(node.id) ?? `${systemId}/${node.id}`;
      return { ...node, entityRef };
    });

    const resolvedDeps = (file.schema.dependencies ?? []).map(dep => ({ ...dep }));

    const parentRef =
      file.schema.level === 'component'
        ? (parentContainerMap.get(file.path) ?? file.schema.parentRef)
        : file.schema.parentRef;

    resolvedSchemas.set(file.path, {
      ...file.schema,
      parentRef,
      nodes: resolvedNodes,
      dependencies: resolvedDeps,
    });

    // Materialise the per-path ref map into a safe plain object for the output type.
    const pathRefObj: Record<string, string> = Object.create(null);
    for (const [nodeId, ref] of fileRefMap) {
      Object.assign(pathRefObj, { [nodeId]: ref });
    }
    Object.assign(nodeRefMap, { [file.path]: pathRefObj });
  }

  return {
    schemas: Object.fromEntries(resolvedSchemas),
    nodeRefMap,
  };
}
