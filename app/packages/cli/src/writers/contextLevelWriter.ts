import { BaseWriter } from '../analysis/domain/writer.ts';
import type { SystemDependency, SystemNode, SystemSchema } from '@blueprint/core';
import { EntityRef, parseSchemaFromYaml } from '@blueprint/core';
import { attachForensicsToSchema } from '../forensics/domain/attachForensics.ts';

export type ContextSystemInput = {
  entityRef: string;
  displayName: string;
  /** Repo-relative system root (`packages`, `microsite`). Empty for product hub. */
  rootPath: string;
  /** Groups systems from the same scanned product; different products stay disconnected. */
  productId: string;
  /** True for the product hub that spokes connect into. */
  isProductHub?: boolean;
};

export const PRODUCT_EDGE_DESCRIPTION = 'Part of product system';

function systemLabel(displayName: string, systemEntityRef: string): string {
  const raw = displayName || systemEntityRef;
  const titled = raw.charAt(0).toUpperCase() + raw.slice(1);
  return titled.endsWith(' System') ? titled : `${titled} System`;
}

/**
 * Hub-and-spoke edges: every non-hub system links to its product hub.
 * Systems with different productIds never connect (e.g. Blueprint vs Backstage).
 */
export function productHubDependenciesForSystems(nodes: SystemNode[]): SystemDependency[] {
  const groups = new Map<string, SystemNode[]>();
  for (const node of nodes) {
    const productId = String(node.properties?.productId || '');
    if (!productId) continue;
    const list = groups.get(productId) || [];
    list.push(node);
    groups.set(productId, list);
  }

  const deps: SystemDependency[] = [];
  for (const [productId, group] of groups) {
    if (group.length < 2) continue;
    const hub =
      group.find(n => n.properties?.role === 'product-hub') ||
      group.find(n => n.entityRef?.endsWith(`/${productId}`) || n.entityRef === productId);
    if (!hub) continue;

    for (const node of group) {
      if (node.entityRef === hub.entityRef) continue;
      deps.push({
        from: hub.entityRef,
        to: node.entityRef,
        type: 'direct-call',
        description: PRODUCT_EDGE_DESCRIPTION,
      });
    }
  }
  return deps;
}

function isManagedAutoEdge(dep: SystemDependency): boolean {
  return dep.description === PRODUCT_EDGE_DESCRIPTION;
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
   * Upsert software systems and connect non-hub systems to their product hub.
   * Different productIds stay isolated (Blueprint does not link to Backstage).
   */
  async writeSystems(
    rootDir: string,
    contextName: string,
    systems: ContextSystemInput[],
    options?: { forensicsComponentNodes?: SystemNode[] }
  ): Promise<void> {
    if (systems.length === 0) return;

    const contextRef = EntityRef.parse(contextName);
    const targetPath = this.fileSystem.getAbsolutePath(rootDir, 'context.yaml');
    let contextSchema = await this.loadExistingContext(targetPath, contextName, contextRef);

    const touchedRefs = new Set<string>();
    const touchedProductIds = new Set(systems.map(s => s.productId).filter(Boolean));

    for (const system of systems) {
      const systemRef = EntityRef.parse(system.entityRef, contextRef);
      touchedRefs.add(systemRef);
      const isHub = !!system.isProductHub || system.entityRef === system.productId;
      const systemNode: SystemNode = {
        entityRef: systemRef,
        type: 'software-system',
        name: systemLabel(system.displayName, system.entityRef),
        properties: {
          rootPath: system.rootPath,
          productId: system.productId,
          role: isHub ? 'product-hub' : 'subsystem',
        },
      };

      const existingIdx = contextSchema.nodes.findIndex(n => n.entityRef === systemRef);
      if (existingIdx >= 0) {
        contextSchema.nodes[existingIdx] = {
          ...contextSchema.nodes[existingIdx],
          ...systemNode,
          properties: {
            ...contextSchema.nodes[existingIdx].properties,
            ...systemNode.properties,
          },
          x: contextSchema.nodes[existingIdx].x,
          y: contextSchema.nodes[existingIdx].y,
        };
      } else {
        contextSchema.nodes.push(systemNode);
      }
    }

    const hubDeps = productHubDependenciesForSystems(contextSchema.nodes);
    const preserved = (contextSchema.dependencies || []).filter(dep => {
      if (isManagedAutoEdge(dep)) {
        // Drop previous auto edges for products we're rewriting
        const fromNode = contextSchema.nodes.find(n => n.entityRef === dep.from);
        const toNode = contextSchema.nodes.find(n => n.entityRef === dep.to);
        const fromProduct = String(fromNode?.properties?.productId || '');
        const toProduct = String(toNode?.properties?.productId || '');
        if (touchedProductIds.has(fromProduct) || touchedProductIds.has(toProduct)) {
          return false;
        }
        // Also drop legacy edges that touch nodes we just wrote
        if (touchedRefs.has(dep.from) || touchedRefs.has(dep.to)) return false;
      }
      return true;
    });

    contextSchema.dependencies = [...preserved, ...hubDeps];

    if (options?.forensicsComponentNodes?.length) {
      contextSchema = attachForensicsToSchema(contextSchema, new Map(), {
        componentNodes: options.forensicsComponentNodes,
      });
    }

    contextSchema.nodes = await this.layout.computeLayout(
      contextSchema.nodes,
      contextSchema.dependencies
    );

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
