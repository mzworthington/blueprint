import { describe, it, expect } from 'vitest';
import { JavaAnalyzer } from './javaAnalyzer.ts';

const baseFile = {
  filePath: 'src/main/java/com/acme/orders/OrderService.java',
  relativePath: 'src/main/java/com/acme/orders/OrderService.java',
  baseName: 'OrderService',
  isTestFile: false,
  imports: [],
  newExpressions: [],
  callExpressions: [],
};

describe('JavaAnalyzer Strategy', () => {
  const analyzer = new JavaAnalyzer();

  it('supports java, kt, and kts', () => {
    expect(analyzer.supports('java')).toBe(true);
    expect(analyzer.supports('kt')).toBe(true);
    expect(analyzer.supports('kts')).toBe(true);
    expect(analyzer.supports('go')).toBe(false);
    expect(analyzer.supports('cs')).toBe(false);
  });

  it('creates a Java node with correct technology', () => {
    const node = analyzer.createNode(baseFile, 'orderservice', false);
    expect(node.type).toBe('background-worker');
    expect(node.properties?.technology).toBe('Java Domain Service');
  });

  it('creates a Kotlin node with correct technology', () => {
    const ktFile = {
      ...baseFile,
      relativePath: 'src/main/kotlin/com/acme/orders/OrderService.kt',
      filePath: 'src/main/kotlin/com/acme/orders/OrderService.kt',
    };
    const node = analyzer.createNode(ktFile, 'orderservice', false);
    expect(node.properties?.technology).toBe('Kotlin Domain Service');
  });

  it('marks test files', () => {
    const node = analyzer.createNode(baseFile, 'orderservice', true);
    expect(node.isTest).toBe(true);
  });

  it('derives container from package declaration (3rd segment onward)', () => {
    const node = analyzer.createNode(baseFile, 'orderservice', false);
    node.properties = { ...node.properties, namespaces: 'com.acme.orders' };
    const info = analyzer.getContainerInfo(node, 'myapp', 'java', baseFile.relativePath);
    expect(info?.entityRef).toBe('orders');
    expect(info?.type).toBe('background-worker');
    expect(info?.technology).toBe('Java / JVM');
  });

  it('classifies controller packages as rest-api', () => {
    const node = analyzer.createNode(baseFile, 'usercontroller', false);
    node.properties = { ...node.properties, namespaces: 'com.acme.controller' };
    const info = analyzer.getContainerInfo(
      node,
      'myapp',
      'java',
      'src/main/java/com/acme/controller/UserController.java'
    );
    expect(info?.type).toBe('rest-api');
  });

  it('falls back to path when no namespace is present', () => {
    const node = analyzer.createNode(baseFile, 'orderservice', false);
    const info = analyzer.getContainerInfo(
      node,
      'myapp',
      'java',
      'src/main/java/com/acme/orders/OrderService.java'
    );
    // After skipping "java" and 2 reverse-domain segments (com, acme): "orders"
    expect(info?.entityRef).toBe('orders');
  });
});
