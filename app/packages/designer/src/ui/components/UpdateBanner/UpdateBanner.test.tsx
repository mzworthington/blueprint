import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { UpdateBanner } from './UpdateBanner';

const updateServiceWorker = vi.fn();
let needRefresh = false;
const setNeedRefresh = vi.fn((value: boolean) => {
  needRefresh = value;
});

vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  }),
}));

describe('UpdateBanner', () => {
  beforeEach(() => {
    needRefresh = false;
    updateServiceWorker.mockClear();
    setNeedRefresh.mockClear();
  });

  it('is hidden when no update is pending', () => {
    render(<UpdateBanner />);
    expect(screen.queryByTestId('update-banner')).toBeNull();
  });

  it('shows refresh prompt when the service worker reports an update', () => {
    needRefresh = true;
    render(<UpdateBanner />);
    expect(screen.getByTestId('update-banner')).toHaveTextContent(/new version/i);
    fireEvent.click(screen.getByRole('button', { name: /^Refresh$/i }));
    expect(updateServiceWorker).toHaveBeenCalledWith(true);
  });

  it('dismisses the banner when Later is clicked', () => {
    needRefresh = true;
    const { rerender } = render(<UpdateBanner />);
    fireEvent.click(screen.getByRole('button', { name: /^Later$/i }));
    expect(setNeedRefresh).toHaveBeenCalledWith(false);
    needRefresh = false;
    rerender(<UpdateBanner />);
    expect(screen.queryByTestId('update-banner')).toBeNull();
  });
});
