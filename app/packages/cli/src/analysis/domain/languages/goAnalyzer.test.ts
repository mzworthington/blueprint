import { describe, it, expect } from 'vitest';
import { GoAnalyzer } from './goAnalyzer.ts';

const baseFile = {
  filePath: 'pkg/store/store.go',
  relativePath: 'pkg/store/store.go',
  baseName: 'store',
  isTestFile: false,
  imports: [],
  newExpressions: [],
  callExpressions: [],
};

describe('GoAnalyzer Strategy', () => {
  const analyzer = new GoAnalyzer();

  it('supports go', () => {
    expect(analyzer.supports('go')).toBe(true);
    expect(analyzer.supports('ts')).toBe(false);
    expect(analyzer.supports('java')).toBe(false);
  });

  it('creates a node with Go technology', () => {
    const node = analyzer.createNode(baseFile, 'store', false);
    expect(node.type).toBe('background-worker');
    expect(node.properties?.technology).toBe('Go Domain Service');
    expect(node.properties?.filepath).toBe('pkg/store/store.go');
  });

  it('marks test files', () => {
    const node = analyzer.createNode(baseFile, 'store', true);
    expect(node.isTest).toBe(true);
  });

  it('derives container from last meaningful directory segment', () => {
    const node = analyzer.createNode(baseFile, 'store', false);
    const info = analyzer.getContainerInfo(node, 'myapp', 'go', 'pkg/store/store.go');
    expect(info?.entityRef).toBe('store');
    expect(info?.name).toBe('store');
    expect(info?.type).toBe('background-worker');
    expect(info?.technology).toBe('Go');
  });

  it('classifies http handler directories as rest-api', () => {
    const handlerNode = analyzer.createNode(
      { ...baseFile, relativePath: 'internal/handler/user.go', baseName: 'user' },
      'user',
      false
    );
    const info = analyzer.getContainerInfo(handlerNode, 'myapp', 'go', 'internal/handler/user.go');
    expect(info?.type).toBe('rest-api');
  });

  it('skips generic top-level dirs (cmd, internal, pkg) and takes next segment', () => {
    const node = analyzer.createNode(baseFile, 'orders', false);
    // internal/orders/handler.go → skip "internal", take "orders"
    const info = analyzer.getContainerInfo(node, 'myapp', 'go', 'internal/orders/handler.go');
    expect(info?.entityRef).toBe('orders');
  });

  it('returns null for files at root with only generic dirs', () => {
    const rootNode = analyzer.createNode(
      { ...baseFile, relativePath: 'main.go', baseName: 'main' },
      'main',
      false
    );
    const info = analyzer.getContainerInfo(rootNode, 'myapp', 'go', 'main.go');
    expect(info).toBeNull();
  });
});
