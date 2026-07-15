import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Router } from 'wouter';
import { memoryLocation } from 'wouter/memory-location';
import { DesignSystemShowcase } from './DesignSystemShowcase';

function renderShowcase() {
  const { hook } = memoryLocation({ path: '/design-system' });
  return render(
    <Router hook={hook}>
      <DesignSystemShowcase />
    </Router>
  );
}

describe('DesignSystemShowcase Component', () => {
  it('renders title and navigation', () => {
    renderShowcase();

    expect(screen.getByText('BLUEPRINT')).toBeInTheDocument();
    expect(screen.getByText('DESIGN SYSTEM')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Workspace/i })).toBeInTheDocument();
  });

  it('supports switching tabs', () => {
    renderShowcase();

    const sidebar = screen.getByRole('complementary');
    fireEvent.click(within(sidebar).getByRole('button', { name: /Design Tokens/i }));

    expect(screen.getByText(/Design Tokens \(Theme Variables\)/i)).toBeInTheDocument();
    expect(screen.getByText('Cyan Primary')).toBeInTheDocument();
    expect(screen.getByText('Blueprint Navy')).toBeInTheDocument();
  });
});
