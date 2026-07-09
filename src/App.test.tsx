import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';
import { useBlueprintStore } from './adapters/store';

describe('App Layout and Collapsible Panels', () => {
  it('should have panels hidden by default and support toggling them', () => {
    // Reset store state to defaults
    useBlueprintStore.setState({ leftCollapsed: true, rightCollapsed: true });

    render(<App />);

    // Find collapse toggles
    const leftToggle = screen.getByLabelText('Toggle Left Panel');
    const rightToggle = screen.getByLabelText('Toggle Right Panel');
    expect(leftToggle).toBeInTheDocument();
    expect(rightToggle).toBeInTheDocument();

    // Verify initial collapsed state
    expect(useBlueprintStore.getState().leftCollapsed).toBe(true);
    expect(useBlueprintStore.getState().rightCollapsed).toBe(true);

    // Click left toggle to expand
    fireEvent.click(leftToggle);
    expect(useBlueprintStore.getState().leftCollapsed).toBe(false);

    // Click right toggle to expand
    fireEvent.click(rightToggle);
    expect(useBlueprintStore.getState().rightCollapsed).toBe(false);

    // Click left toggle to collapse back
    fireEvent.click(leftToggle);
    expect(useBlueprintStore.getState().leftCollapsed).toBe(true);

    // Click right toggle to collapse back
    fireEvent.click(rightToggle);
    expect(useBlueprintStore.getState().rightCollapsed).toBe(true);
  });
});
