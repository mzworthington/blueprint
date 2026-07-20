import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { LiveSchemaPreview } from './LiveSchemaPreview';

describe('LiveSchemaPreview', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ type: 'object', title: 'Blueprint' }),
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('fetches latest schema and renders pretty JSON', async () => {
    render(<LiveSchemaPreview channel="latest" />);

    expect(screen.getByTestId('live-schema-loading')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId('live-schema-json')).toBeInTheDocument();
    });

    expect(fetch).toHaveBeenCalledWith('/schemas/latest/blueprint.schema.json');
    expect(screen.getByTestId('live-schema-json')).toHaveTextContent('"title": "Blueprint"');
    expect(screen.getByTestId('live-schema-source')).toHaveTextContent(
      '/schemas/latest/blueprint.schema.json'
    );
  });

  it('shows an error when the channel is invalid', async () => {
    render(<LiveSchemaPreview channel="../etc" />);

    await waitFor(() => {
      expect(screen.getByTestId('live-schema-error')).toBeInTheDocument();
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('shows an error when fetch fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      })
    );

    render(<LiveSchemaPreview channel="latest" />);

    await waitFor(() => {
      expect(screen.getByTestId('live-schema-error')).toBeInTheDocument();
    });
    expect(screen.getByTestId('live-schema-error')).toHaveTextContent('404');
  });
});
