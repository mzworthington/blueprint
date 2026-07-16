import type { SystemSchema } from '../models/schema';
import { slugify } from './slug';

/** Shared FQN shape for schema identity and node refs (no file paths). */
export const ENTITY_REF_PATTERN = /^[a-zA-Z0-9_-]+(\/[a-zA-Z0-9_-]+)*$/;

/**
 * True when `ref` is a hierarchical entity FQN (not a file path).
 * Hierarchy links child diagrams via schema.entityRef === parent node.entityRef.
 */
export function isEntityRef(ref: string | undefined): boolean {
  if (!ref) return false;
  return ENTITY_REF_PATTERN.test(ref.trim());
}

export function getSchemaEntityRef(schema: SystemSchema, workspaceName?: string | null): string {
  if (schema.entityRef && isEntityRef(schema.entityRef)) {
    return schema.entityRef;
  }
  if (schema.level === 'context') {
    return 'context';
  }
  const name = workspaceName || schema.name;
  if (name) {
    return slugify(name).replace(/_/g, '-');
  }
  return 'default';
}

export interface ResolvedWorkspaceState {
  schemas: Record<string, SystemSchema>;
  nodeRefMap: Record<string, Record<string, string>>;
}

/**
 * Resolve a short (non-FQN) node ref under a diagram's scope.
 * Uses schema identity (`systemId`) and optional workspace context root — not C4 level.
 */
export function resolveShortEntityRef(ref: string, systemId: string, contextSlug?: string): string {
  if (!ref) return '';
  if (ref.includes('/')) return ref;
  if (systemId.includes('/') || !contextSlug || systemId.startsWith(`${contextSlug}/`)) {
    return `${systemId}/${ref}`;
  }
  if (systemId === contextSlug) {
    return `${contextSlug}/${ref}`;
  }
  return `${contextSlug}/${systemId}/${ref}`;
}

/**
 * Processes all schemas in the workspace, calculates their C4 hierarchical FQNs,
 * and sets the resolved `entityRef` on every node. It also updates dependency targets.
 *
 * Parent linkage: a child diagram's `schema.entityRef` matches a node `entityRef`
 * on the parent diagram (no separate parentRef / c4Ref / workspace manifest).
 */
export function resolveWorkspaceEntityRefs(
  files: Array<{ path: string; schema: SystemSchema }>,
  workspaceName?: string | null
): ResolvedWorkspaceState {
  const nodeRefMapByPath = new Map<string, Map<string, string>>();

  const contextFile = files.find(f => f.schema.level === 'context');
  let contextSlug: string | undefined;
  if (contextFile) {
    contextSlug = contextFile.schema.entityRef;
  }

  const getSystemId = (schema: SystemSchema) => {
    return schema.entityRef || slugify(workspaceName || schema.name).replace(/_/g, '-');
  };

  // First pass: populate nodeRefMapByPath for all files
  for (const file of files) {
    const systemId = getSystemId(file.schema);
    const refMap = new Map<string, string>();
    nodeRefMapByPath.set(file.path, refMap);

    if (file.schema.level === 'container') {
      for (const node of file.schema.nodes) {
        const ref = node.entityRef || '';
        if (ref.includes('/')) {
          refMap.set(ref, ref);
        } else {
          const containerFQN =
            contextSlug && !systemId.startsWith(`${contextSlug}/`)
              ? `${contextSlug}/${systemId}/${ref}`
              : `${systemId}/${ref}`;
          refMap.set(ref, containerFQN);
        }
      }
    } else if (file.schema.level === 'component') {
      const parentContainerFQN =
        file.schema.entityRef && isEntityRef(file.schema.entityRef)
          ? file.schema.entityRef
          : undefined;

      for (const node of file.schema.nodes) {
        const ref = node.entityRef || '';
        if (ref.includes('/')) {
          refMap.set(ref, ref);
        } else if (parentContainerFQN) {
          refMap.set(ref, `${parentContainerFQN}/${ref}`);
        } else {
          const baseFQN =
            contextSlug && !systemId.startsWith(`${contextSlug}/`)
              ? `${contextSlug}/${systemId}`
              : `${systemId}`;
          refMap.set(ref, `${baseFQN}/${ref}`);
        }
      }
    } else if (file.schema.level === 'context') {
      for (const node of file.schema.nodes) {
        const ref = node.entityRef || '';
        if (ref.includes('/')) {
          refMap.set(ref, ref);
        } else {
          refMap.set(
            ref,
            contextSlug && !ref.startsWith(`${contextSlug}/`) ? `${contextSlug}/${ref}` : ref
          );
        }
      }
    }
  }

  // Second pass: resolve schemas and build output maps
  const resolvedSchemas = new Map<string, SystemSchema>();
  const nodeRefMap: Record<string, Record<string, string>> = Object.create(null);

  for (const file of files) {
    const systemId = getSystemId(file.schema);
    const fileRefMap = nodeRefMapByPath.get(file.path) ?? new Map<string, string>();

    const resolvedNodes = file.schema.nodes.map(node => {
      const ref = node.entityRef || '';
      if (ref.includes('/')) {
        return { ...node, entityRef: ref };
      }
      const defaultRef = resolveShortEntityRef(ref, systemId, contextSlug);
      const entityRef = fileRefMap.get(ref) ?? defaultRef;
      return { ...node, entityRef };
    });

    const resolvedDeps = (file.schema.dependencies ?? []).map(dep => {
      const getDepRef = (ref: string) => {
        if (!ref) return '';
        if (fileRefMap.has(ref)) return fileRefMap.get(ref)!;
        return resolveShortEntityRef(ref, systemId, contextSlug);
      };
      const sourceRef = getDepRef(dep.from);
      const targetRef = getDepRef(dep.to);
      return {
        ...dep,
        from: sourceRef,
        to: targetRef,
      };
    });

    const schemaEntityRef = file.schema.entityRef || getSchemaEntityRef(file.schema, workspaceName);

    resolvedSchemas.set(file.path, {
      ...file.schema,
      entityRef: schemaEntityRef,
      nodes: resolvedNodes,
      dependencies: resolvedDeps,
    });

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
