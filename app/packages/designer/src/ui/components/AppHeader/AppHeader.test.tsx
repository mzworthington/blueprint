import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Router } from 'wouter';
import { memoryLocation } from 'wouter/memory-location';
import { AppHeader } from './AppHeader';

function renderHeader(path = '/workspace') {
  const { hook } = memoryLocation({ path });
  return render(
    <Router hook={hook}>
      <AppHeader badge="WORKSPACE" />
    </Router>
  );
}

function mobileNav() {
  const panel = document.getElementById('app-header-mobile-nav');
  expect(panel).toBeTruthy();
  return within(panel as HTMLElement);
}

describe('AppHeader', () => {
  it('shows a burger menu on mobile and reveals navigation links', () => {
    renderHeader();

    expect(document.getElementById('app-header-mobile-nav')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Open navigation menu' }));

    const menu = mobileNav();
    expect(menu.getByRole('link', { name: 'Workspace' })).toBeInTheDocument();
    expect(menu.getByRole('link', { name: 'Forensics' })).toBeInTheDocument();
    expect(menu.getByRole('link', { name: 'Docs' })).toBeInTheDocument();
    expect(menu.getByRole('link', { name: 'Design system' })).toBeInTheDocument();
  });

  it('closes the mobile menu when a link is selected', () => {
    renderHeader();

    fireEvent.click(screen.getByRole('button', { name: 'Open navigation menu' }));
    fireEvent.click(mobileNav().getByRole('link', { name: 'Forensics' }));

    expect(document.getElementById('app-header-mobile-nav')).toBeNull();
  });

  it('closes the mobile menu when Escape is pressed', () => {
    renderHeader();

    fireEvent.click(screen.getByRole('button', { name: 'Open navigation menu' }));
    expect(mobileNav().getByRole('link', { name: 'Docs' })).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(document.getElementById('app-header-mobile-nav')).toBeNull();
  });
});
