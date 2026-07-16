import { describe, it, expect } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import type { NetworkStatusPort } from '../../../core';
import { OfflineBanner } from './OfflineBanner';

function createFakeNetworkStatus(initialOnline: boolean): NetworkStatusPort & {
  setOnline: (online: boolean) => void;
} {
  let online = initialOnline;
  const listeners = new Set<(online: boolean) => void>();

  return {
    isOnline: () => online,
    subscribe: listener => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    setOnline: next => {
      online = next;
      for (const listener of listeners) listener(next);
    },
  };
}

describe('OfflineBanner', () => {
  it('is hidden when network status reports online', () => {
    render(<OfflineBanner networkStatus={createFakeNetworkStatus(true)} />);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('shows when network status reports offline on mount', () => {
    render(<OfflineBanner networkStatus={createFakeNetworkStatus(false)} />);
    expect(screen.getByRole('status')).toHaveTextContent(/offline/i);
    expect(screen.getByRole('status')).toHaveTextContent(/local workspace only/i);
  });

  it('toggles when the network status port notifies changes', () => {
    const networkStatus = createFakeNetworkStatus(true);
    render(<OfflineBanner networkStatus={networkStatus} />);
    expect(screen.queryByRole('status')).toBeNull();

    act(() => {
      networkStatus.setOnline(false);
    });
    expect(screen.getByRole('status')).toHaveTextContent(/local workspace only/i);

    act(() => {
      networkStatus.setOnline(true);
    });
    expect(screen.queryByRole('status')).toBeNull();
  });
});
