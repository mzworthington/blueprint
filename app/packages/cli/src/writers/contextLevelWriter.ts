import { BaseWriter } from './baseWriter.ts';
import type { SystemDependency, SystemNode, SystemSchema, SourceProvenance } from '@blueprint/core';
import { EntityRef, parseSchemaFromYaml, seedPreservedPositions } from '@blueprint/core';
import { attachForensicsToSchema } from '../forensics/domain/attachForensics.ts';

export type ContextSystemInput = {
  entityRef: string;
  displayName: string;
  /** Repo-relative system root (`packages`, `microsite`). Empty for product group. */
  rootPath: string;
  /** Groups systems from the same scanned product; different products stay disconnected. */
  productId: string;
  /** True for the product group frame that subsystems nest inside. */
  isProductHub?: boolean;
};

/** Auto-managed edges from the context Person actor to each top-level system. */
export const PERSON_EDGE_DESCRIPTION = 'Uses';
/** Leaf segment for the single context-level person node (`{context}/user`). */
export const CONTEXT_PERSON_LEAF = 'user';

function systemLabel(displayName: string, systemEntityRef: string): string {
  const raw = displayName || systemEntityRef;
  const titled = raw.charAt(0).toUpperCase() + raw.slice(1);
  return titled.endsWith(' System') ? titled : `${titled} System`;
}

/** Top-level nodes on the context canvas (no visual parent). */
export function topLevelSystemNodes(nodes: SystemNode[]): SystemNode[] {
  return nodes.filter(n => n.type !== 'person' && !n.parentEntityRef);
}

/** Person → each top-level system or group. */
export function personDependenciesForSystems(
  personRef: string,
  nodes: SystemNode[]
): SystemDependency[] {
  return topLevelSystemNodes(nodes).map(system => ({
    from: personRef,
    to: system.entityRef,
    type: 'direct-call' as const,
    description: PERSON_EDGE_DESCRIPTION,
  }));
}

function isManagedPersonEdge(dep: SystemDependency): boolean {
  return dep.description === PERSON_EDGE_DESCRIPTION;
}

function ensureContextPerson(contextRef: string, nodes: SystemNode[]): SystemNode {
  const personRef = EntityRef.parse(CONTEXT_PERSON_LEAF, contextRef);
  const personNode: SystemNode = {
    entityRef: personRef,
    type: 'person',
    name: 'User',
    properties: {
      role: 'context-actor',
    },
  };

  const existingIdx = nodes.findIndex(
    n =>
      n.entityRef === personRef || (n.type === 'person' && n.properties?.role === 'context-actor')
  );
  if (existingIdx >= 0) {
    const existing = nodes[existingIdx]!;
    nodes[existingIdx] = {
      ...existing,
      ...personNode,
      properties: {
        ...existing.properties,
        ...personNode.properties,
      },
    };
    return nodes[existingIdx]!;
  }

  nodes.push(personNode);
  return personNode;
}

function hubRefForProduct(nodes: SystemNode[], productId: string): string | undefined {
  return nodes.find(
    n =>
      n.type === 'group' &&
      String(n.properties?.productId || '') === productId &&
      !n.parentEntityRef
  )?.entityRef;
}

export class ContextLevelWriter extends BaseWriter {
  async write(
    rootDir: string,
    contextName: string,
    systemEntityRef: string,
    displayName?: string,
    rootPath: string = ''
  ): Promise<void> {
    await this.writeSystems(rootDir, contextName, [
      {
        entityRef: systemEntityRef,
        displayName: displayName || systemEntityRef,
        rootPath,
        productId: systemEntityRef,
        isProductHub: true,
      },
    ]);
  }

  /**
   * Upsert software systems and nest non-hub systems under their product group.
   * Ensures a single Person actor linked to each top-level group/system.
   */
  async writeSystems(
    rootDir: string,
    contextName: string,
    systems: ContextSystemInput[],
    options?: {
      forensicsComponentNodes?: SystemNode[];
      source?: SourceProvenance;
    }
  ): Promise<void> {
    if (systems.length === 0) return;

    const contextRef = EntityRef.parse(contextName);
    const targetPath = this.fileSystem.getAbsolutePath(rootDir, 'context.yaml');
    let contextSchema = await this.loadExistingContext(targetPath, contextName, contextRef);
    const previousNodes = [...contextSchema.nodes];

    const touchedRefs = new Set<string>();
    const touchedProductIds = new Set(systems.map(s => s.productId).filter(Boolean));
    const batchHubByProduct = new Map<string, string>();

    for (const system of systems) {
      const systemRef = EntityRef.parse(system.entityRef, contextRef);
      touchedRefs.add(systemRef);
      const isHub = !!system.isProductHub || system.entityRef === system.productId;
      if (isHub) {
        batchHubByProduct.set(system.productId, systemRef);
      }
    }

    for (const system of systems) {
      const systemRef = EntityRef.parse(system.entityRef, contextRef);
      const isHub = !!system.isProductHub || system.entityRef === system.productId;
      const siblingCount =
        systems.filter(s => s.productId === system.productId && s.entityRef !== system.entityRef)
          .length +
        contextSchema.nodes.filter(
          n =>
            n.properties?.productId === system.productId &&
            n.entityRef !== systemRef &&
            n.entityRef !== batchHubByProduct.get(system.productId)
        ).length;
      const isGroup = isHub && siblingCount > 0;
      const hubParentRef = !isHub
        ? (batchHubByProduct.get(system.productId) ??
          hubRefForProduct(contextSchema.nodes, system.productId))
        : undefined;

      const systemNode: SystemNode = {
        entityRef: systemRef,
        type: isGroup ? 'group' : 'software-system',
        name: systemLabel(system.displayName, system.entityRef),
        properties: {
          rootPath: system.rootPath,
          productId: system.productId,
        },
        ...(hubParentRef ? { parentEntityRef: hubParentRef } : {}),
      };

      const existingIdx = contextSchema.nodes.findIndex(n => n.entityRef === systemRef);
      if (existingIdx >= 0) {
        const existing = contextSchema.nodes[existingIdx]!;
        contextSchema.nodes[existingIdx] = {
          ...existing,
          ...systemNode,
          properties: {
            ...existing.properties,
            ...systemNode.properties,
          },
          parentEntityRef: systemNode.parentEntityRef ?? existing.parentEntityRef,
        };
      } else {
        contextSchema.nodes.push(systemNode);
      }
    }

    const person = ensureContextPerson(contextRef, contextSchema.nodes);
    const personDeps = personDependenciesForSystems(person.entityRef, contextSchema.nodes);

    const preserved = (contextSchema.dependencies || []).filter(dep => {
      if (isManagedPersonEdge(dep)) return false;
      if (touchedRefs.has(dep.from) || touchedRefs.has(dep.to)) return false;
      const fromNode = contextSchema.nodes.find(n => n.entityRef === dep.from);
      const toNode = contextSchema.nodes.find(n => n.entityRef === dep.to);
      const fromProduct = String(fromNode?.properties?.productId || '');
      const toProduct = String(toNode?.properties?.productId || '');
      if (touchedProductIds.has(fromProduct) || touchedProductIds.has(toProduct)) {
        return false;
      }
      return true;
    });

    contextSchema.dependencies = [...preserved, ...personDeps];

    if (options?.forensicsComponentNodes?.length) {
      contextSchema = attachForensicsToSchema(contextSchema, new Map(), {
        componentNodes: options.forensicsComponentNodes,
      });
    }

    if (options?.source) {
      contextSchema = { ...contextSchema, source: options.source };
    }

    contextSchema = {
      ...contextSchema,
      nodes: seedPreservedPositions(previousNodes, contextSchema.nodes),
    };

    await this.writeYaml(targetPath, contextSchema);
    this.logger.info(`📄 Saved Context schema for [${contextRef}]: ${targetPath}`);
  }

  private async loadExistingContext(
    targetPath: string,
    contextName: string,
    contextRef: string
  ): Promise<SystemSchema> {
    if (this.fileSystem.exists(targetPath)) {
      try {
        const existingYaml = await this.fileSystem.readSchema(targetPath);
        const parsed = parseSchemaFromYaml(existingYaml);
        return {
          ...parsed,
          entityRef: parsed.entityRef || contextRef,
          name: parsed.name || `${contextName} Context`,
          nodes: parsed.nodes ? [...parsed.nodes] : [],
          dependencies: parsed.dependencies ? [...parsed.dependencies] : [],
        };
      } catch (err) {
        this.logger.warn(
          `Failed to parse existing context.yaml (${err}). Reinitializing context diagram.`
        );
      }
    }

    return {
      entityRef: contextRef,
      name: `${contextName} Context`,
      version: '1.0.0',
      level: 'context',
      nodes: [],
      dependencies: [],
    };
  }
}
