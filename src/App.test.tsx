import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';
import { useBlueprintStore } from './adapters/store';

describe('App Layout and Collapsible Panels', () => {
  it('should have panels hidden by default and support toggling them', () => {
    useBlueprintStore.setState({ leftCollapsed: true, rightCollapsed: true });

    render(<App />);

    const leftToggle = screen.getByLabelText('Toggle Left Panel');
    const rightToggle = screen.getByLabelText('Toggle Right Panel');
    expect(leftToggle).toBeInTheDocument();
    expect(rightToggle).toBeInTheDocument();

    expect(useBlueprintStore.getState().leftCollapsed).toBe(true);
    expect(useBlueprintStore.getState().rightCollapsed).toBe(true);

    fireEvent.click(leftToggle);
    expect(useBlueprintStore.getState().leftCollapsed).toBe(false);

    fireEvent.click(rightToggle);
    expect(useBlueprintStore.getState().rightCollapsed).toBe(false);

    fireEvent.click(leftToggle);
    expect(useBlueprintStore.getState().leftCollapsed).toBe(true);

    fireEvent.click(rightToggle);
    expect(useBlueprintStore.getState().rightCollapsed).toBe(true);
  });
});
