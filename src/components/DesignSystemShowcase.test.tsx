import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DesignSystemShowcase } from './DesignSystemShowcase';

describe('DesignSystemShowcase Component', () => {
  it('renders title and close button', () => {
    const handleClose = vi.fn();
    render(<DesignSystemShowcase onClose={handleClose} />);

    expect(screen.getByText('BLUEPRINT')).toBeInTheDocument();
    expect(screen.getByText('DESIGN SYSTEM')).toBeInTheDocument();

    const closeBtn = screen.getByRole('button', { name: /✕ Close System View/i });
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('supports switching tabs', () => {
    render(<DesignSystemShowcase onClose={() => {}} />);

    const tokensTab = screen.getByRole('button', { name: /Design Tokens/i });
    fireEvent.click(tokensTab);

    expect(screen.getByText(/Design Tokens \(Theme Variables\)/i)).toBeInTheDocument();
    expect(screen.getByText('Cyan Primary')).toBeInTheDocument();
    expect(screen.getByText('Blueprint Navy')).toBeInTheDocument();
  });
});
