import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';
import { useBlueprintStore } from './adapters/store';

describe('App Layout and Collapsible Panels', () => {
  it('should render left and right panels by default and support toggling them', () => {
    // Reset store state
    useBlueprintStore.setState({ leftCollapsed: false, rightCollapsed: false });

    render(<App />);

    // Verify both headers exist
    expect(screen.getByText('Schema Explorer')).toBeInTheDocument();
    expect(screen.getByText('Properties Panel')).toBeInTheDocument();

    // Find collapse toggles
    const leftToggle = screen.getByLabelText('Toggle Left Panel');
    const rightToggle = screen.getByLabelText('Toggle Right Panel');
    expect(leftToggle).toBeInTheDocument();
    expect(rightToggle).toBeInTheDocument();

    // Click left toggle to collapse
    fireEvent.click(leftToggle);
    expect(useBlueprintStore.getState().leftCollapsed).toBe(true);

    // Click right toggle to collapse
    fireEvent.click(rightToggle);
    expect(useBlueprintStore.getState().rightCollapsed).toBe(true);

    // Expand them back
    fireEvent.click(leftToggle);
    expect(useBlueprintStore.getState().leftCollapsed).toBe(false);
    fireEvent.click(rightToggle);
    expect(useBlueprintStore.getState().rightCollapsed).toBe(false);
  });
});
