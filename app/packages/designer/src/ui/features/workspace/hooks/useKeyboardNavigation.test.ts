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

  it('should not trigger shortcuts when disabled', () => {
    const onSearchOpen = vi.fn();
    renderHook(() => useKeyboardNavigation({ onSearchOpen, disabled: true }));

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '/' }));
    });

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
