import { describe, it, expect } from 'vitest';
import {
  buildCSharpNamespaceIndex,
  extractCsprojContainerDependencies,
  isFrameworkNamespace,
} from './csharpDependencies.ts';
import { ModelExtractor } from './modelExtractor.ts';
import type { ParsedSourceFile } from './types.ts';
import type { SystemNode } from '@blueprint/core';
import { EntityRef } from '@blueprint/core';

const parentRef = 'blueprint/eshop';

function makeContainerMap(ids: string[]): Map<string, SystemNode> {
  const map = new Map<string, SystemNode>();
  for (const id of ids) {
    map.set(id, {
      entityRef: EntityRef.child(parentRef, id),
      type: 'container',
      name: id,
    });
  }
  return map;
}

describe('csharpDependencies', () => {
  describe('isFrameworkNamespace', () => {
    it('filters BCL and common vendor namespaces', () => {
      expect(isFrameworkNamespace('System')).toBe(true);
      expect(isFrameworkNamespace('System.Threading.Tasks')).toBe(true);
      expect(isFrameworkNamespace('Microsoft.AspNetCore.Http')).toBe(true);
      expect(isFrameworkNamespace('eShop.Ordering.Domain')).toBe(false);
    });
  });

  describe('buildCSharpNamespaceIndex', () => {
    it('maps declared namespaces to container and component ids', () => {
      const files: ParsedSourceFile[] = [
        {
          filePath: 'src/Ordering.Domain/Aggregates/Order.cs',
          relativePath: 'src/Ordering.Domain/Aggregates/Order.cs',
          baseName: 'Order',
          isTestFile: false,
          imports: [],
          newExpressions: [],
          callExpressions: [],
          namespaces: ['eShop.Ordering.Domain.Aggregates'],
        },
      ];

      const index = buildCSharpNamespaceIndex(files, {});
      expect(index.get('eShop.Ordering.Domain.Aggregates')).toEqual({
        containerId: 'ordering-domain',
        componentId: 'aggregates',
      });
      expect(index.get('eShop.Ordering.Domain')).toEqual({
        containerId: 'ordering-domain',
        componentId: 'aggregates',
      });
    });
  });

  describe('extractCsprojContainerDependencies', () => {
    it('creates inter-container edges from ProjectReference entries', () => {
      const containerNodesMap = makeContainerMap([
        'ordering-api',
        'ordering-domain',
        'ordering-infrastructure',
      ]);

      const deps = extractCsprojContainerDependencies(
        parentRef,
        [
          {
            relativePath: 'src/Ordering.API/Ordering.API.csproj',
            content: `
<Project>
  <ItemGroup>
    <ProjectReference Include="..\\Ordering.Domain\\Ordering.Domain.csproj" />
    <ProjectReference Include="..\\Ordering.Infrastructure\\Ordering.Infrastructure.csproj" />
  </ItemGroup>
</Project>`,
          },
        ],
        containerNodesMap,
        {}
      );

      expect(deps).toHaveLength(2);
      expect(deps).toContainEqual({
        from: EntityRef.child(parentRef, 'ordering-api'),
        to: EntityRef.child(parentRef, 'ordering-domain'),
        type: 'inter-container',
        description: 'Project reference',
      });
      expect(deps).toContainEqual({
        from: EntityRef.child(parentRef, 'ordering-api'),
        to: EntityRef.child(parentRef, 'ordering-infrastructure'),
        type: 'inter-container',
        description: 'Project reference',
      });
    });
  });

  describe('extractCSharpDependencies', () => {
    it('links layers via cross-namespace usings within a project', () => {
      const extractor = new ModelExtractor(parentRef);
      const { componentDependencies, containerDependencies } = extractor.extractGraph(
        [
          {
            filePath: 'src/Ordering.API/Application/Commands/CreateOrderCommand.cs',
            relativePath: 'src/Ordering.API/Application/Commands/CreateOrderCommand.cs',
            baseName: 'CreateOrderCommand',
            isTestFile: false,
            imports: [{ moduleSpecifier: 'eShop.Ordering.Domain.Aggregates' }],
            newExpressions: [],
            callExpressions: [],
            namespaces: ['eShop.Ordering.API.Application.Commands'],
          },
          {
            filePath: 'src/Ordering.API/Apis/OrdersApi.cs',
            relativePath: 'src/Ordering.API/Apis/OrdersApi.cs',
            baseName: 'OrdersApi',
            isTestFile: false,
            imports: [{ moduleSpecifier: 'Microsoft.AspNetCore.Http' }],
            newExpressions: [],
            callExpressions: [],
            namespaces: ['eShop.Ordering.API.Apis'],
          },
          {
            filePath: 'src/Ordering.Domain/Aggregates/Order.cs',
            relativePath: 'src/Ordering.Domain/Aggregates/Order.cs',
            baseName: 'Order',
            isTestFile: false,
            imports: [],
            newExpressions: [],
            callExpressions: [],
            namespaces: ['eShop.Ordering.Domain.Aggregates'],
          },
        ],
        []
      );

      expect(componentDependencies).toHaveLength(1);
      expect(componentDependencies[0].from).toBe(
        EntityRef.child(EntityRef.child(parentRef, 'ordering-api'), 'application')
      );
      expect(componentDependencies[0].to).toBe(
        EntityRef.child(EntityRef.child(parentRef, 'ordering-domain'), 'aggregates')
      );

      expect(containerDependencies).toHaveLength(1);
      expect(containerDependencies[0]).toMatchObject({
        from: EntityRef.child(parentRef, 'ordering-api'),
        to: EntityRef.child(parentRef, 'ordering-domain'),
        type: 'inter-container',
      });
    });

    it('ignores framework usings', () => {
      const extractor = new ModelExtractor(parentRef);
      const { componentDependencies, containerDependencies } = extractor.extractGraph(
        [
          {
            filePath: 'src/Ordering.API/Apis/OrdersApi.cs',
            relativePath: 'src/Ordering.API/Apis/OrdersApi.cs',
            baseName: 'OrdersApi',
            isTestFile: false,
            imports: [{ moduleSpecifier: 'Microsoft.AspNetCore.Http' }],
            newExpressions: [],
            callExpressions: [],
            namespaces: ['eShop.Ordering.API.Apis'],
          },
        ],
        []
      );

      expect(componentDependencies).toEqual([]);
      expect(containerDependencies).toEqual([]);
    });
  });
});
