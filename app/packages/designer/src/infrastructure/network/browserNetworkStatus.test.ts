import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BrowserNetworkStatusAdapter } from './browserNetworkStatus';

describe('BrowserNetworkStatusAdapter', () => {
  const originalOnline = navigator.onLine;

  beforeEach(() => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      get: () => true,
    });
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      get: () => originalOnline,
    });
  });

  it('isOnline mirrors navigator.onLine', () => {
    expect(BrowserNetworkStatusAdapter.isOnline()).toBe(true);

    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      get: () => false,
    });
    expect(BrowserNetworkStatusAdapter.isOnline()).toBe(false);
  });

  it('notifies subscribers on online/offline events and unsubscribes cleanly', () => {
    const listener = vi.fn();
    const unsubscribe = BrowserNetworkStatusAdapter.subscribe(listener);

    window.dispatchEvent(new Event('offline'));
    expect(listener).toHaveBeenCalledWith(false);

    window.dispatchEvent(new Event('online'));
    expect(listener).toHaveBeenCalledWith(true);

    listener.mockClear();
    unsubscribe();
    window.dispatchEvent(new Event('offline'));
    expect(listener).not.toHaveBeenCalled();
  });
});
