import { describe, it, expect } from 'vitest';
import {
  CancellationError,
  createCliCancellation,
  isCancellationError,
  throwIfAborted,
} from './cancellation.ts';

describe('cancellation', () => {
  it('throwIfAborted no-ops without a signal or when not aborted', () => {
    expect(() => throwIfAborted()).not.toThrow();
    expect(() => throwIfAborted(new AbortController().signal)).not.toThrow();
  });

  it('throwIfAborted throws CancellationError when aborted', () => {
    const controller = new AbortController();
    controller.abort();
    expect(() => throwIfAborted(controller.signal)).toThrow(CancellationError);
  });

  it('identifies cancellation errors', () => {
    expect(isCancellationError(new CancellationError())).toBe(true);
    expect(isCancellationError(new Error('nope'))).toBe(false);
    const abortErr = new Error('aborted');
    abortErr.name = 'AbortError';
    expect(isCancellationError(abortErr)).toBe(true);
  });

  it('aborts the signal when SIGINT is received', () => {
    const { signal, install } = createCliCancellation();
    const dispose = install();

    expect(signal.aborted).toBe(false);
    process.emit('SIGINT');
    expect(signal.aborted).toBe(true);

    dispose();
  });

  it('aborts the signal when SIGTERM is received', () => {
    const { signal, install } = createCliCancellation();
    const dispose = install();

    process.emit('SIGTERM');
    expect(signal.aborted).toBe(true);

    dispose();
  });
});
