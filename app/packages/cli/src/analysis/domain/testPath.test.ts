import { describe, it, expect } from 'vitest';
import { isTestProjectSegment, isTestSourcePath, detectTestFramework } from './testPath.ts';

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

describe('detectTestFramework', () => {
  it('detects JS/TS frameworks from imports', () => {
    expect(detectTestFramework(['vitest'])).toBe('vitest');
    expect(detectTestFramework(['@jest/globals', 'react'])).toBe('jest');
    expect(detectTestFramework(['mocha', 'chai'])).toBe('mocha');
    expect(detectTestFramework(['jasmine'])).toBe('jasmine');
  });

  it('detects Python frameworks', () => {
    expect(detectTestFramework(['pytest', 'os'])).toBe('pytest');
    expect(detectTestFramework(['unittest'])).toBe('unittest');
  });

  it('detects .NET frameworks', () => {
    expect(detectTestFramework(['Xunit'])).toBe('xunit');
    expect(detectTestFramework(['NUnit.Framework'])).toBe('nunit');
    expect(detectTestFramework(['Microsoft.VisualStudio.TestTools.UnitTesting'])).toBe('mstest');
  });

  it('detects Java/Kotlin frameworks', () => {
    expect(detectTestFramework(['org.junit.jupiter.api.Test'])).toBe('junit');
    expect(detectTestFramework(['io.kotest.matchers.shouldBe'])).toBe('junit');
  });

  it('detects Go testing stdlib and testify', () => {
    expect(detectTestFramework(['testing', 'fmt'])).toBe('go-testing');
    expect(detectTestFramework(['github.com/stretchr/testify/assert'])).toBe('testify');
  });

  it('detects jest from path token when no imports', () => {
    expect(detectTestFramework([], 'jest.config.ts')).toBe('jest');
  });

  it('returns null for production code with no test imports', () => {
    expect(detectTestFramework(['react', 'zustand'])).toBeNull();
    expect(detectTestFramework([])).toBeNull();
  });
});
