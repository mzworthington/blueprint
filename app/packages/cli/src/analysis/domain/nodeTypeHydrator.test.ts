import { describe, it, expect } from 'vitest';
import type { ParsedSourceFile } from './types.ts';
import {
  classifyParsedSource,
  dependencyTypeForTarget,
  hydrateNodeFromSource,
} from './nodeTypeHydrator.ts';

function file(
  partial: Partial<ParsedSourceFile> & Pick<ParsedSourceFile, 'baseName' | 'relativePath'>
): ParsedSourceFile {
  return {
    filePath: partial.relativePath,
    isTestFile: false,
    imports: [],
    newExpressions: [],
    callExpressions: [],
    ...partial,
  };
}

describe('nodeTypeHydrator', () => {
  it('classifies UI packages as gateway-api', () => {
    const result = classifyParsedSource(
      file({
        baseName: 'Canvas',
        relativePath: 'src/ui/Canvas.tsx',
        imports: [{ moduleSpecifier: 'react' }],
      })
    );
    expect(result.type).toBe('gateway-api');
    expect(result.reason).toBe('ui-import');
  });

  it('classifies database imports and DbContext construction', () => {
    expect(
      classifyParsedSource(
        file({
          baseName: 'userRepo',
          relativePath: 'src/infra/userRepo.ts',
          imports: [{ moduleSpecifier: '@prisma/client' }],
        })
      ).type
    ).toBe('relational-database');

    expect(
      classifyParsedSource(
        file({
          baseName: 'AppDbContext',
          relativePath: 'src/Data/AppDbContext.cs',
          newExpressions: [{ className: 'DbContext' }],
        })
      ).type
    ).toBe('relational-database');
  });

  it('classifies event brokers from imports or class names', () => {
    expect(
      classifyParsedSource(
        file({
          baseName: 'ordersConsumer',
          relativePath: 'src/messaging/ordersConsumer.ts',
          imports: [{ moduleSpecifier: 'kafkajs' }],
        })
      ).type
    ).toBe('event-broker');

    expect(
      classifyParsedSource(
        file({
          baseName: 'bus',
          relativePath: 'src/bus.ts',
          newExpressions: [{ className: 'KafkaQueueClient' }],
        })
      ).type
    ).toBe('event-broker');
  });

  it('classifies API controllers from imports or filename markers (language-agnostic)', () => {
    expect(
      classifyParsedSource(
        file({
          baseName: 'users',
          relativePath: 'src/routes/users.ts',
          imports: [{ moduleSpecifier: 'express' }],
        })
      ).type
    ).toBe('rest-api');

    expect(
      classifyParsedSource(
        file({
          baseName: 'UserController',
          relativePath: 'src/Controllers/UserController.cs',
          imports: [],
        })
      ).type
    ).toBe('rest-api');

    expect(
      classifyParsedSource(
        file({
          baseName: 'orders',
          relativePath: 'src/api/orders.py',
          imports: [{ moduleSpecifier: 'fastapi' }],
        })
      ).type
    ).toBe('rest-api');
  });

  it('prefers rest-api over database when *Api.cs also has EF usings', () => {
    const result = classifyParsedSource(
      file({
        baseName: 'CatalogApi',
        relativePath: 'src/Catalog.API/Apis/CatalogApi.cs',
        imports: [{ moduleSpecifier: 'Microsoft.EntityFrameworkCore' }],
      })
    );
    expect(result.type).toBe('rest-api');
    expect(result.reason).toBe('api-marker');
  });

  it('classifies IntegrationEventHandler paths as event-broker', () => {
    expect(
      classifyParsedSource(
        file({
          baseName: 'OrderStartedIntegrationEventHandler',
          relativePath:
            'src/Basket.API/IntegrationEvents/EventHandling/OrderStartedIntegrationEventHandler.cs',
        })
      ).type
    ).toBe('event-broker');
  });

  it('falls back to background-worker when no markers match', () => {
    const result = classifyParsedSource(
      file({
        baseName: 'graph',
        relativePath: 'src/domain/graph.ts',
      })
    );
    expect(result.type).toBe('background-worker');
    expect(result.reason).toBe('default');
  });

  it('hydrates an existing node in place', () => {
    const node = hydrateNodeFromSource(
      {
        entityRef: 'sys/service',
        type: 'component',
        name: 'service',
        properties: { filepath: 'src/service.ts' },
      },
      file({
        baseName: 'service',
        relativePath: 'src/service.ts',
        imports: [{ moduleSpecifier: 'fastify' }],
      })
    );

    expect(node.type).toBe('rest-api');
    expect(node.properties?.technology).toBeTruthy();
    expect(node.properties?.classification).toBe('api-marker');
  });

  it('maps dependency edge types from the target node', () => {
    expect(
      dependencyTypeForTarget({
        entityRef: 'a/db',
        type: 'relational-database',
        name: 'db',
      }).type
    ).toBe('read-write');

    expect(
      dependencyTypeForTarget({
        entityRef: 'a/bus',
        type: 'event-broker',
        name: 'bus',
      }).type
    ).toBe('publish-subscribe');

    expect(
      dependencyTypeForTarget({
        entityRef: 'a/svc',
        type: 'background-worker',
        name: 'svc',
      }).type
    ).toBe('direct-call');
  });
});
