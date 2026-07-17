import type { SystemNode, SystemSchema } from '@blueprint/core';

export type ForensicsDisplayMetrics = {
  externals: number;
  tests: number;
  dependencies: number;
};

function nodeByRef(schema: SystemSchema, entityRef: string): SystemNode | undefined {
  return schema.nodes.find(n => n.entityRef === entityRef || n.entityRef.endsWith('/' + entityRef));
}

function incidentDependencies(schema: SystemSchema, entityRef: string) {
  return schema.dependencies.filter(d => d.from === entityRef || d.to === entityRef);
}

function partnerRefs(schema: SystemSchema, entityRef: string): string[] {
  const refs = new Set<string>();
  for (const dep of incidentDependencies(schema, entityRef)) {
    const partner = dep.from === entityRef ? dep.to : dep.from;
    refs.add(partner);
  }
  return [...refs];
}

/**
 * Topology counts for Workspace display toggles.
 * With no selection: diagram-wide. With a node: incident edges + partner flags.
 */
export function countSchemaForensicsMetrics(
  schema: SystemSchema,
  selectedNodeEntityRef?: string | null
): ForensicsDisplayMetrics {
  if (!selectedNodeEntityRef) {
    return {
      externals: schema.nodes.filter(n => n.external).length,
      tests: schema.nodes.filter(n => n.isTest).length,
      dependencies: schema.dependencies.length,
    };
  }

  const selected = nodeByRef(schema, selectedNodeEntityRef);
  if (!selected) {
    return { externals: 0, tests: 0, dependencies: 0 };
  }

  const ref = selected.entityRef;
  const partners = partnerRefs(schema, ref)
    .map(r => nodeByRef(schema, r))
    .filter((n): n is SystemNode => !!n);

  return {
    externals: partners.filter(n => n.external).length,
    tests: partners.filter(n => n.isTest).length,
    dependencies: incidentDependencies(schema, ref).length,
  };
}
