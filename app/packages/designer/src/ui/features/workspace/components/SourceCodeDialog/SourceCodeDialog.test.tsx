import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SourceCodeDialog } from './SourceCodeDialog';

vi.mock('./useSourceCodeDialog', () => ({
  useSourceCodeDialog: vi.fn(),
}));

import { useSourceCodeDialog } from './useSourceCodeDialog';

const mockedHook = vi.mocked(useSourceCodeDialog);

describe('SourceCodeDialog', () => {
  beforeEach(() => {
    mockedHook.mockReturnValue({
      result: {
        ok: true,
        content: 'export const answer = 42;',
        origin: 'remote',
        filepath: 'src/answer.ts',
        viewerUrl: 'https://github.com/org/repo/blob/abc/src/answer.ts',
        rawUrl: 'https://raw.githubusercontent.com/org/repo/abc/src/answer.ts',
      },
      loading: false,
      reload: vi.fn(),
    });
  });

  it('renders nothing when closed', () => {
    render(
      <SourceCodeDialog
        isOpen={false}
        onClose={() => {}}
        filepath="src/answer.ts"
        isWorkspaceOpen={false}
      />
    );
    expect(screen.queryByTestId('source-code-dialog')).not.toBeInTheDocument();
  });

  it('shows loaded source content when open', async () => {
    render(
      <SourceCodeDialog
        isOpen
        onClose={() => {}}
        filepath="src/answer.ts"
        isWorkspaceOpen={false}
        source={{
          remoteUrl: 'https://github.com/org/repo',
          scannedAtCommit: 'abc',
        }}
      />
    );

    expect(screen.getByTestId('source-code-dialog')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByTestId('source-code-content')).toHaveTextContent(
        'export const answer = 42;'
      );
    });
    expect(screen.getByLabelText('Open in repository browser')).toHaveAttribute(
      'href',
      'https://github.com/org/repo/blob/abc/src/answer.ts'
    );
  });
});
