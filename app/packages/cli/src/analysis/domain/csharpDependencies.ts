import type { SystemDependency, SystemNode } from '@blueprint/core';
import {
  EntityRef,
  parseCsprojProjectReferences,
  resolveCsprojReferencePath,
} from '@blueprint/core';
import {
  componentMapKey,
  resolveContainerFromPath,
  type ResolveContainerOptions,
} from './containerGrouping.ts';
import type { ParsedSourceFile } from './types.ts';
import { dependencyTypeForTarget } from './nodeTypeHydrator.ts';
import { isCSharpSourcePath, resolveCSharpComponent } from './csharpGrouping.ts';

const FRAMEWORK_NAMESPACE_PREFIXES = [
  'System',
  'Microsoft',
  'Newtonsoft',
  'AutoMapper',
  'Serilog',
  'FluentValidation',
  'Swashbuckle',
  'Grpc',
  'Google.Protobuf',
  'Aspire',
  'OpenTelemetry',
];

export type CsprojFile = {
  relativePath: string;
  content: string;
};

export type CSharpNamespaceTarget = {
  containerId: string;
  componentId: string;
};

export function isFrameworkNamespace(namespace: string): boolean {
  return FRAMEWORK_NAMESPACE_PREFIXES.some(
    prefix => namespace === prefix || namespace.startsWith(`${prefix}.`)
  );
}

function registerNamespacePrefixes(
  index: Map<string, CSharpNamespaceTarget>,
  namespace: string,
  target: CSharpNamespaceTarget
) {
  const parts = namespace.split('.').filter(Boolean);
  for (let i = parts.length; i >= 1; i--) {
    const prefix = parts.slice(0, i).join('.');
    if (!index.has(prefix)) {
      index.set(prefix, target);
    }
  }
}

export function buildCSharpNamespaceIndex(
  sourceFiles: ParsedSourceFile[],
  resolveOptions: ResolveContainerOptions
): Map<string, CSharpNamespaceTarget> {
  const index = new Map<string, CSharpNamespaceTarget>();

  for (const file of sourceFiles) {
    if (!isCSharpSourcePath(file.relativePath)) continue;

    const componentIdentity = resolveCSharpComponent(file.relativePath, file.baseName);
    if (!componentIdentity) continue;

    const { containerId } = resolveContainerFromPath(file.relativePath, resolveOptions);
    const target: CSharpNamespaceTarget = {
      containerId,
      componentId: componentIdentity.componentId,
    };

    for (const namespace of file.namespaces || []) {
      registerNamespacePrefixes(index, namespace, target);
    }
  }

  return index;
}

function resolveNamespaceTarget(
  namespace: string,
  index: Map<string, CSharpNamespaceTarget>
): CSharpNamespaceTarget | undefined {
  const parts = namespace.split('.').filter(Boolean);
  for (let i = parts.length; i >= 1; i--) {
    const prefix = parts.slice(0, i).join('.');
    const found = index.get(prefix);
    if (found) return found;
  }
  return undefined;
}

export function extractCsprojContainerDependencies(
  parentRef: string,
  csprojFiles: CsprojFile[],
  containerNodesMap: Map<string, SystemNode>,
  resolveOptions: ResolveContainerOptions
): SystemDependency[] {
  const deps: SystemDependency[] = [];
  const seen = new Set<string>();

  for (const csproj of csprojFiles) {
    const fromPath = csproj.relativePath.replace(/\\/g, '/');
    const { containerId: fromContainerId } = resolveContainerFromPath(fromPath, resolveOptions);
    if (!containerNodesMap.has(fromContainerId)) continue;

    const refs = parseCsprojProjectReferences(csproj.content);
    for (const refPath of refs) {
      const resolved = resolveCsprojReferencePath(fromPath, refPath);
      const { containerId: toContainerId } = resolveContainerFromPath(resolved, resolveOptions);
      if (!fromContainerId || !toContainerId || fromContainerId === toContainerId) continue;
      if (!containerNodesMap.has(toContainerId)) continue;

      const fromRef = EntityRef.child(parentRef, fromContainerId);
      const toRef = EntityRef.child(parentRef, toContainerId);
      const key = `${fromRef}->${toRef}`;
      if (seen.has(key)) continue;
      seen.add(key);

      deps.push({
        from: fromRef,
        to: toRef,
        type: 'inter-container',
        description: 'Project reference',
      });
    }
  }

  return deps;
}

function pushContainerDependency(
  containerDependencies: SystemDependency[],
  parentRef: string,
  fromContainerId: string,
  toContainerId: string
) {
  if (!fromContainerId || !toContainerId || fromContainerId === toContainerId) return;

  const fromRef = EntityRef.child(parentRef, fromContainerId);
  const toRef = EntityRef.child(parentRef, toContainerId);
  const exists = containerDependencies.some(d => d.from === fromRef && d.to === toRef);
  if (exists) return;

  containerDependencies.push({
    from: fromRef,
    to: toRef,
    type: 'inter-container',
  });
}

export function extractCSharpDependencies(
  parentRef: string,
  sourceFiles: ParsedSourceFile[],
  componentNodesMap: Map<string, SystemNode>,
  containerNodesMap: Map<string, SystemNode>,
  resolveOptions: ResolveContainerOptions
): { componentDependencies: SystemDependency[]; containerDependencies: SystemDependency[] } {
  const componentDependencies: SystemDependency[] = [];
  const containerDependencies: SystemDependency[] = [];
  const namespaceIndex = buildCSharpNamespaceIndex(sourceFiles, resolveOptions);

  for (const file of sourceFiles) {
    if (!isCSharpSourcePath(file.relativePath)) continue;

    const fromIdentity = resolveCSharpComponent(file.relativePath, file.baseName);
    if (!fromIdentity) continue;

    const { containerId: fromContainerId } = resolveContainerFromPath(
      file.relativePath,
      resolveOptions
    );
    const fromComponent = componentNodesMap.get(
      componentMapKey(fromContainerId, fromIdentity.componentId)
    );
    if (!fromComponent) continue;

    for (const imp of file.imports) {
      const namespace = imp.moduleSpecifier;
      if (isFrameworkNamespace(namespace)) continue;

      const target = resolveNamespaceTarget(namespace, namespaceIndex);
      if (!target) continue;

      const toComponent = componentNodesMap.get(
        componentMapKey(target.containerId, target.componentId)
      );
      if (!toComponent || fromComponent.entityRef === toComponent.entityRef) continue;

      const edge = dependencyTypeForTarget(toComponent);
      const edgeExists = componentDependencies.some(
        d => d.from === fromComponent.entityRef && d.to === toComponent.entityRef
      );
      if (!edgeExists) {
        componentDependencies.push({
          from: fromComponent.entityRef,
          to: toComponent.entityRef,
          type: edge.type,
          description: edge.description,
        });
      }

      pushContainerDependency(
        containerDependencies,
        parentRef,
        fromContainerId,
        target.containerId
      );
    }
  }

  return { componentDependencies, containerDependencies };
}

export function mergeContainerDependencies(
  existing: SystemDependency[],
  incoming: SystemDependency[]
): void {
  for (const dep of incoming) {
    const exists = existing.some(d => d.from === dep.from && d.to === dep.to);
    if (!exists) existing.push(dep);
  }
}
