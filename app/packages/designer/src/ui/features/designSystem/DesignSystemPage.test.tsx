import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DesignSystemPage } from './DesignSystemPage';

vi.mock('../../components/DesignSystemShowcase', () => ({
  DesignSystemShowcase: () => <div data-testid="design-system-showcase">Showcase</div>,
}));

describe('DesignSystemPage Component', () => {
  it('should render the design system showcase', () => {
    render(<DesignSystemPage />);
    expect(screen.getByTestId('design-system-showcase')).toBeInTheDocument();
  });
});
