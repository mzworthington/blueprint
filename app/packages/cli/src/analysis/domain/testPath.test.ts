import { describe, it, expect } from 'vitest';
import { isTestProjectSegment, isTestSourcePath } from './testPath.ts';

describe('testPath', () => {
  it('marks unit test files and test directories', () => {
    expect(isTestSourcePath('src/domain/graph.test.ts')).toBe(true);
    expect(isTestSourcePath('src/domain/graph.spec.tsx')).toBe(true);
    expect(isTestSourcePath('src/__tests__/graph.ts')).toBe(true);
    expect(isTestSourcePath('src/tests/helpers.ts')).toBe(true);
    expect(isTestSourcePath('src/test/setup.ts')).toBe(true);
    expect(isTestSourcePath('src/setupTests.ts')).toBe(true);
    expect(isTestSourcePath('src/domain/graph.ts')).toBe(false);
  });

  it('marks .NET, Go, Java, and Python test conventions', () => {
    expect(isTestSourcePath('tests/Ordering.UnitTests/Domain/ValueObjectTests.cs')).toBe(true);
    expect(isTestSourcePath('src/Catalog.FunctionalTests/CatalogApiTests.cs')).toBe(true);
    expect(isTestSourcePath('Services/Basket.UnitTests/BasketServiceTests.cs')).toBe(true);
    expect(isTestSourcePath('pkg/store/store_test.go')).toBe(true);
    expect(isTestSourcePath('src/test/java/com/acme/OrderServiceTest.java')).toBe(true);
    expect(isTestSourcePath('tests/test_orders.py')).toBe(true);
    expect(isTestSourcePath('orders/order_test.py')).toBe(true);

    expect(isTestSourcePath('src/Ordering.API/Controllers/OrdersController.cs')).toBe(false);
    expect(isTestSourcePath('src/Domain/Contest.cs')).toBe(false);
    expect(isTestSourcePath('src/Domain/Context.cs')).toBe(false);
    expect(isTestSourcePath('pkg/store/store.go')).toBe(false);
  });

  it('recognises dedicated test-project folder segments', () => {
    expect(isTestProjectSegment('Ordering.UnitTests')).toBe(true);
    expect(isTestProjectSegment('Catalog.FunctionalTests')).toBe(true);
    expect(isTestProjectSegment('IntegrationTests')).toBe(true);
    expect(isTestProjectSegment('Ordering.API')).toBe(false);
    expect(isTestProjectSegment('Domain')).toBe(false);
  });
});
