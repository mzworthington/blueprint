import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useKeyboardNavigation } from './useKeyboardNavigation';
import { useBlueprintStore } from '../../../../application/store/store';

vi.mock('../../../../application/store/store');

describe('useKeyboardNavigation Hook', () => {
  let mockZoomOut: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockZoomOut = vi.fn();
    vi.mocked(useBlueprintStore).mockImplementation((selector: any) => {
      if (typeof selector === 'function') {
        return selector({ zoomOut: mockZoomOut });
      }
      return { zoomOut: mockZoomOut } as any;
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should call zoomOut when Escape key is pressed (not typing)', () => {
    const onZoomOut = vi.fn();
    renderHook(() => useKeyboardNavigation({ onZoomOut }));

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });

    expect(onZoomOut).toHaveBeenCalled();
    expect(mockZoomOut).not.toHaveBeenCalled();
  });

  it('should call zoomOut when Backspace key is pressed (not typing)', () => {
    const onZoomOut = vi.fn();
    renderHook(() => useKeyboardNavigation({ onZoomOut }));

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace' }));
    });

    expect(onZoomOut).toHaveBeenCalled();
    expect(mockZoomOut).not.toHaveBeenCalled();
  });

  it('should fall back to store zoomOut when onZoomOut is not provided', () => {
    renderHook(() => useKeyboardNavigation({}));

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });

    // Since onZoomOut is not provided, the hook should call the store's zoomOut
    // The mock should have been called when the hook accessed the store
    expect(mockZoomOut).toHaveBeenCalled();
  });

  it('should call onSearchOpen when ⌘K is pressed (not typing)', () => {
    const onSearchOpen = vi.fn();
    renderHook(() => useKeyboardNavigation({ onSearchOpen }));

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }));
    });

    expect(onSearchOpen).toHaveBeenCalled();
  });

  it('should call onSearchOpen when Ctrl+K is pressed (not typing)', () => {
    const onSearchOpen = vi.fn();
    renderHook(() => useKeyboardNavigation({ onSearchOpen }));

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
    });

    expect(onSearchOpen).toHaveBeenCalled();
  });

  it('should call onSearchOpen when / is pressed (not typing)', () => {
    const onSearchOpen = vi.fn();
    renderHook(() => useKeyboardNavigation({ onSearchOpen }));

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '/' }));
    });

    expect(onSearchOpen).toHaveBeenCalled();
  });

  it('should not trigger shortcuts when typing in INPUT', () => {
    const onZoomOut = vi.fn();
    const onSearchOpen = vi.fn();
    renderHook(() => useKeyboardNavigation({ onZoomOut, onSearchOpen }));

    // Simulate typing in an input
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '/' }));
    });

    expect(onZoomOut).not.toHaveBeenCalled();
    expect(onSearchOpen).not.toHaveBeenCalled();

    document.body.removeChild(input);
  });

  it('should not trigger shortcuts when typing in TEXTAREA', () => {
    const onZoomOut = vi.fn();
    const onSearchOpen = vi.fn();
    renderHook(() => useKeyboardNavigation({ onZoomOut, onSearchOpen }));

    // Simulate typing in a textarea
    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);
    textarea.focus();

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '/' }));
    });

    expect(onZoomOut).not.toHaveBeenCalled();
    expect(onSearchOpen).not.toHaveBeenCalled();

    document.body.removeChild(textarea);
  });

  it('should not trigger shortcuts when typing in contenteditable element', () => {
    const onZoomOut = vi.fn();
    const onSearchOpen = vi.fn();
    renderHook(() => useKeyboardNavigation({ onZoomOut, onSearchOpen }));

    // Simulate typing in a contenteditable element
    const div = document.createElement('div');
    div.setAttribute('contenteditable', 'true');
    document.body.appendChild(div);
    div.focus();

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '/' }));
    });

    expect(onZoomOut).not.toHaveBeenCalled();
    expect(onSearchOpen).not.toHaveBeenCalled();

    document.body.removeChild(div);
  });

  it('should not trigger shortcuts when disabled', () => {
    const onZoomOut = vi.fn();
    const onSearchOpen = vi.fn();
    renderHook(() => useKeyboardNavigation({ onZoomOut, onSearchOpen, disabled: true }));

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '/' }));
    });

    expect(onZoomOut).not.toHaveBeenCalled();
    expect(onSearchOpen).not.toHaveBeenCalled();
  });

  it('should cleanup event listener on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
    const { unmount } = renderHook(() => useKeyboardNavigation({}));

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    removeEventListenerSpy.mockRestore();
  });
});
