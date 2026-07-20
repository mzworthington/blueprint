import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { StartupWorkspaceDialog } from './StartupWorkspaceDialog';

describe('StartupWorkspaceDialog', () => {
  it('renders the startup choices when open', () => {
    render(
      <StartupWorkspaceDialog
        isOpen
        onLoadSandbox={vi.fn()}
        onOpenDirectory={vi.fn()}
        onImportMermaid={vi.fn()}
        onImportIac={vi.fn()}
      />
    );

    expect(screen.getByRole('dialog', { name: /Open workspace/i })).toBeInTheDocument();
    expect(screen.getByTestId('startup-load-sandbox')).toHaveTextContent(/Load sandbox/i);
    expect(screen.getByTestId('startup-open-directory')).toHaveTextContent(
      /Open workspace from directory/i
    );
    expect(screen.getByTestId('startup-import-mermaid')).toHaveTextContent(
      /Import Mermaid diagram/i
    );
    expect(screen.getByTestId('startup-import-iac')).toHaveTextContent(/Import infrastructure/i);
  });

  it('does not expose the dialog when closed', () => {
    render(
      <StartupWorkspaceDialog
        isOpen={false}
        onLoadSandbox={vi.fn()}
        onOpenDirectory={vi.fn()}
        onImportMermaid={vi.fn()}
        onImportIac={vi.fn()}
      />
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('invokes the matching handler for each choice', () => {
    const onLoadSandbox = vi.fn();
    const onOpenDirectory = vi.fn();
    const onImportMermaid = vi.fn();
    const onImportIac = vi.fn();

    render(
      <StartupWorkspaceDialog
        isOpen
        onLoadSandbox={onLoadSandbox}
        onOpenDirectory={onOpenDirectory}
        onImportMermaid={onImportMermaid}
        onImportIac={onImportIac}
      />
    );

    fireEvent.click(screen.getByTestId('startup-load-sandbox'));
    fireEvent.click(screen.getByTestId('startup-open-directory'));
    fireEvent.click(screen.getByTestId('startup-import-mermaid'));
    fireEvent.click(screen.getByTestId('startup-import-iac'));

    expect(onLoadSandbox).toHaveBeenCalledTimes(1);
    expect(onOpenDirectory).toHaveBeenCalledTimes(1);
    expect(onImportMermaid).toHaveBeenCalledTimes(1);
    expect(onImportIac).toHaveBeenCalledTimes(1);
  });
});
