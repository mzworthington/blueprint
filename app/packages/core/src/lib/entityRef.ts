import type { SystemSchema } from '../models/schema';
import { slugify } from './slug';

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

export function getSchemaEntityRef(schema: SystemSchema, workspaceName?: string | null): string {
  if (schema.entityRef) {
    return schema.entityRef;
  }
  if (schema.level === 'context') {
    return 'context';
  }
  if (schema.id && isEntityRef(schema.id)) {
    return schema.id;
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
 * Processes all schemas in the workspace, calculates their C4 hierarchical FQNs,
 * and sets the resolved `entityRef` on every node. It also updates dependency targets.
 */
export function resolveWorkspaceEntityRefs(
  files: Array<{ path: string; schema: SystemSchema }>,
  workspaceName?: string | null
): ResolvedWorkspaceState {
  const nodeRefMapByPath = new Map<string, Map<string, string>>();

  const contextFile = files.find(f => f.schema.level === 'context');
  let contextSlug: string | undefined;
  if (contextFile) {
    contextSlug = contextFile.schema.entityRef || contextFile.schema.id;
  }

  const getSystemId = (schema: SystemSchema) => {
    return (
      schema.entityRef || schema.id || slugify(workspaceName || schema.name).replace(/_/g, '-')
    );
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
        file.schema.id && isEntityRef(file.schema.id)
          ? file.schema.id
          : file.schema.entityRef && isEntityRef(file.schema.entityRef)
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
      const defaultRef =
        contextSlug && !systemId.startsWith(`${contextSlug}/`)
          ? `${contextSlug}/${systemId}/${ref}`
          : `${systemId}/${ref}`;
      const entityRef = fileRefMap.get(ref) ?? defaultRef;
      return { ...node, entityRef };
    });

    const resolvedDeps = (file.schema.dependencies ?? []).map(dep => {
      const getDepRef = (ref: string) => {
        if (!ref) return '';
        if (fileRefMap.has(ref)) return fileRefMap.get(ref)!;
        if (ref.includes('/')) return ref;
        return contextSlug && !systemId.startsWith(`${contextSlug}/`)
          ? `${contextSlug}/${systemId}/${ref}`
          : `${systemId}/${ref}`;
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
