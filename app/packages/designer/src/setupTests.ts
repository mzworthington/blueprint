import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import fakeIndexedDB, { IDBKeyRange } from 'fake-indexeddb';

// 1. Polyfill standard Node global
globalThis.indexedDB = fakeIndexedDB;
globalThis.IDBKeyRange = IDBKeyRange;

// 2. Polyfill window global if it exists in current scope
if (typeof window !== 'undefined') {
  window.indexedDB = fakeIndexedDB;
  window.IDBKeyRange = IDBKeyRange;
}

// 3. Polyfill JSDOM window global inside Node vm isolation
if (typeof globalThis !== 'undefined' && (globalThis as any).window) {
  (globalThis as any).window.indexedDB = fakeIndexedDB;
  (globalThis as any).window.IDBKeyRange = IDBKeyRange;
}

afterEach(() => {
  cleanup();
});

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

globalThis.ResizeObserver = ResizeObserverMock;
