import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useKeyboardNavigation } from './useKeyboardNavigation';

describe('useKeyboardNavigation Hook', () => {
  beforeEach(() => {});

  afterEach(() => {
    vi.clearAllMocks();
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

  it('should call onZoomOut when Escape is pressed (not typing)', () => {
    const onZoomOut = vi.fn();
    renderHook(() => useKeyboardNavigation({ onZoomOut }));

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });

    expect(onZoomOut).toHaveBeenCalled();
  });

  it('should call onZoomOut when Backspace is pressed (not typing)', () => {
    const onZoomOut = vi.fn();
    renderHook(() => useKeyboardNavigation({ onZoomOut }));

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace' }));
    });

    expect(onZoomOut).toHaveBeenCalled();
  });

  it('should not call onZoomOut when typing in INPUT', () => {
    const onZoomOut = vi.fn();
    renderHook(() => useKeyboardNavigation({ onZoomOut }));

    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace' }));
    });

    expect(onZoomOut).not.toHaveBeenCalled();
    document.body.removeChild(input);
  });

  it('should not call onZoomOut when the callback is omitted', () => {
    const onZoomOut = vi.fn();
    renderHook(() => useKeyboardNavigation({}));

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });

    expect(onZoomOut).not.toHaveBeenCalled();
  });

  it('should not trigger shortcuts when typing in INPUT', () => {
    const onSearchOpen = vi.fn();
    renderHook(() => useKeyboardNavigation({ onSearchOpen }));

    // Simulate typing in an input
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '/' }));
    });

    expect(onSearchOpen).not.toHaveBeenCalled();

    document.body.removeChild(input);
  });

  it('should not trigger shortcuts when typing in TEXTAREA', () => {
    const onSearchOpen = vi.fn();
    renderHook(() => useKeyboardNavigation({ onSearchOpen }));

    // Simulate typing in a textarea
    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);
    textarea.focus();

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '/' }));
    });

    expect(onSearchOpen).not.toHaveBeenCalled();

    document.body.removeChild(textarea);
  });

  it('should not trigger shortcuts when typing in contenteditable element', () => {
    const onSearchOpen = vi.fn();
    renderHook(() => useKeyboardNavigation({ onSearchOpen }));

    // Simulate typing in a contenteditable element
    const div = document.createElement('div');
    div.setAttribute('contenteditable', 'true');
    document.body.appendChild(div);
    div.focus();

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '/' }));
    });

    expect(onSearchOpen).not.toHaveBeenCalled();

    document.body.removeChild(div);
  });

  it('should call onUndo when ⌘Z or Ctrl+Z is pressed (not typing)', () => {
    const onUndo = vi.fn();
    renderHook(() => useKeyboardNavigation({ onUndo }));

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', metaKey: true }));
    });
    expect(onUndo).toHaveBeenCalledTimes(1);

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true }));
    });
    expect(onUndo).toHaveBeenCalledTimes(2);
  });

  it('should call onRedo when ⌘Shift+Z, Ctrl+Shift+Z, ⌘Y, or Ctrl+Y is pressed (not typing)', () => {
    const onRedo = vi.fn();
    renderHook(() => useKeyboardNavigation({ onRedo }));

    act(() => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'z', metaKey: true, shiftKey: true })
      );
    });
    expect(onRedo).toHaveBeenCalledTimes(1);

    act(() => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, shiftKey: true })
      );
    });
    expect(onRedo).toHaveBeenCalledTimes(2);

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'y', metaKey: true }));
    });
    expect(onRedo).toHaveBeenCalledTimes(3);

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'y', ctrlKey: true }));
    });
    expect(onRedo).toHaveBeenCalledTimes(4);
  });

  it('should call onShortcutsOpen when ? is pressed (not typing)', () => {
    const onShortcutsOpen = vi.fn();
    renderHook(() => useKeyboardNavigation({ onShortcutsOpen }));

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '?' }));
    });

    expect(onShortcutsOpen).toHaveBeenCalled();
  });

  it('should cleanup event listener on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
    const { unmount } = renderHook(() => useKeyboardNavigation({}));

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    removeEventListenerSpy.mockRestore();
  });
});
