import fakeIndexedDB, { IDBKeyRange } from 'fake-indexeddb';

// Polyfill standard Node global
globalThis.indexedDB = fakeIndexedDB;
globalThis.IDBKeyRange = IDBKeyRange;

// Polyfill window global if it exists in current scope
if (typeof window !== 'undefined') {
  window.indexedDB = fakeIndexedDB;
  window.IDBKeyRange = IDBKeyRange;
}

// Polyfill JSDOM window global inside Node vm isolation
if (typeof globalThis !== 'undefined' && (globalThis as any).window) {
  (globalThis as any).window.indexedDB = fakeIndexedDB;
  (globalThis as any).window.IDBKeyRange = IDBKeyRange;
}
