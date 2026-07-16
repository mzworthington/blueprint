import { describe, it, expect } from 'vitest';
import type { NodeType } from '@blueprint/core';
import {
  classifyCSharpContainer,
  isCSharpSourcePath,
  nodeTypePriority,
  resolveCSharpComponent,
  shouldSkipCSharpFile,
} from './csharpGrouping.ts';

describe('csharpGrouping', () => {
  describe('shouldSkipCSharpFile', () => {
    it('skips GlobalUsings, Migrations, Designer, and ModelSnapshot files', () => {
      expect(shouldSkipCSharpFile('src/Catalog.API/GlobalUsings.cs', 'GlobalUsings')).toBe(true);
      expect(
        shouldSkipCSharpFile(
          'src/Catalog.API/Infrastructure/Migrations/20231009153249_Initial.cs',
          '20231009153249_Initial'
        )
      ).toBe(true);
      expect(
        shouldSkipCSharpFile(
          'src/Catalog.API/Infrastructure/Migrations/20231009153249_Initial.Designer.cs',
          '20231009153249_Initial.Designer'
        )
      ).toBe(true);
      expect(
        shouldSkipCSharpFile(
          'src/Catalog.API/Infrastructure/Migrations/CatalogContextModelSnapshot.cs',
          'CatalogContextModelSnapshot'
        )
      ).toBe(true);
    });

    it('keeps architectural sources', () => {
      expect(shouldSkipCSharpFile('src/Ordering.API/Apis/OrdersApi.cs', 'OrdersApi')).toBe(false);
      expect(
        shouldSkipCSharpFile(
          'src/Ordering.API/Application/Commands/CreateOrderCommand.cs',
          'CreateOrderCommand'
        )
      ).toBe(false);
    });
  });

  describe('resolveCSharpComponent', () => {
    it('returns null for boilerplate files', () => {
      expect(resolveCSharpComponent('src/Catalog.API/GlobalUsings.cs', 'GlobalUsings')).toBeNull();
    });

    it('rolls up files by the first folder under the project', () => {
      expect(
        resolveCSharpComponent(
          'src/Ordering.API/Application/Commands/CreateOrderCommand.cs',
          'CreateOrderCommand'
        )
      ).toEqual({
        componentId: 'application',
        componentName: 'Application Layer',
      });

      expect(resolveCSharpComponent('src/Ordering.API/Apis/OrdersApi.cs', 'OrdersApi')).toEqual({
        componentId: 'apis',
        componentName: 'Apis Layer',
      });
    });

    it('keeps project-root files as leaf components', () => {
      expect(resolveCSharpComponent('src/Ordering.API/Program.cs', 'Program')).toEqual({
        componentId: 'program',
        componentName: 'Program',
      });
    });

    it('rolls up .NET test projects by folder under the test project', () => {
      expect(
        resolveCSharpComponent(
          'tests/Ordering.UnitTests/Domain/BuyerAggregateTest.cs',
          'BuyerAggregateTest'
        )
      ).toEqual({
        componentId: 'domain',
        componentName: 'Domain Layer',
      });
    });
  });

  describe('classifyCSharpContainer', () => {
    it.each([
      ['Ordering.API', 'ordering-api', 'rest-api'],
      ['OrderProcessor', 'orderprocessor', 'background-worker'],
      ['WebApp', 'webapp', 'web-app'],
      ['ClientApp', 'clientapp', 'web-app'],
      ['EventBus', 'eventbus', 'event-broker'],
      ['Shared', 'shared', 'container'],
    ] as const)('maps %s (%s) → %s', (name, id, type) => {
      expect(classifyCSharpContainer(name, id)).toBe(type);
    });
  });

  describe('nodeTypePriority', () => {
    it('ranks rest-api above relational-database and default', () => {
      expect(nodeTypePriority('rest-api' as NodeType)).toBeGreaterThan(
        nodeTypePriority('relational-database' as NodeType)
      );
      expect(nodeTypePriority('relational-database' as NodeType)).toBeGreaterThan(
        nodeTypePriority('background-worker' as NodeType)
      );
    });
  });

  describe('isCSharpSourcePath', () => {
    it('detects .cs paths case-insensitively', () => {
      expect(isCSharpSourcePath('src/Foo/Bar.cs')).toBe(true);
      expect(isCSharpSourcePath('src/Foo/Bar.CS')).toBe(true);
      expect(isCSharpSourcePath('src/Foo/Bar.ts')).toBe(false);
    });
  });
});
