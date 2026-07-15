import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MobilePanelToggles } from './MobilePanelToggles';
import { useBlueprintStore } from '../../../../../application/store/store';

describe('MobilePanelToggles', () => {
  beforeEach(() => {
    useBlueprintStore.setState({
      leftCollapsed: true,
      rightCollapsed: true,
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('opens the schema panel from a labelled button', () => {
    render(<MobilePanelToggles />);
    fireEvent.click(screen.getByRole('button', { name: 'Open Schema Explorer' }));
    expect(useBlueprintStore.getState().leftCollapsed).toBe(false);
  });

  it('opens the properties panel from a labelled button', () => {
    render(<MobilePanelToggles />);
    fireEvent.click(screen.getByRole('button', { name: 'Open Properties Panel' }));
    expect(useBlueprintStore.getState().rightCollapsed).toBe(false);
  });

  it('hides when a panel sheet is already open', () => {
    useBlueprintStore.setState({ leftCollapsed: false, rightCollapsed: true });
    const { container } = render(<MobilePanelToggles />);
    expect(container).toBeEmptyDOMElement();
  });
});
