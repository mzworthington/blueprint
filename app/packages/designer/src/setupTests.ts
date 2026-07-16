import './setupPolyfills';
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
});

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

globalThis.ResizeObserver = ResizeObserverMock;

import { useBlueprintStore } from './application/store/store';

// Stub out async background checkPendingChanges to prevent test side-effects
if (useBlueprintStore.getState()) {
  useBlueprintStore.getState().checkPendingChanges = async () => {};
}
