import React, { useEffect, useState } from 'react';
import { resolveLiveSchemaUrl } from './resolveLiveSchemaUrl';

type Props = {
  channel?: string;
  baseUrl?: string;
};

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; url: string; text: string }
  | { status: 'error'; message: string };

export const LiveSchemaPreview: React.FC<Props> = ({
  channel = 'latest',
  baseUrl = import.meta.env.BASE_URL || '/',
}) => {
  const [state, setState] = useState<LoadState>({ status: 'loading' });

  useEffect(() => {
    let active = true;
    const url = resolveLiveSchemaUrl(channel, baseUrl);
    if (!url) {
      setState({
        status: 'error',
        message: `Invalid schema channel: ${channel.trim() || '(empty)'}`,
      });
      return;
    }

    setState({ status: 'loading' });
    fetch(url)
      .then(async res => {
        if (!res.ok) {
          throw new Error(`Failed to load schema (${res.status} ${res.statusText})`);
        }
        const data: unknown = await res.json();
        return { url, text: JSON.stringify(data, null, 2) };
      })
      .then(result => {
        if (active) setState({ status: 'ready', url: result.url, text: result.text });
      })
      .catch((err: unknown) => {
        if (!active) return;
        const message = err instanceof Error ? err.message : 'Failed to load schema';
        setState({ status: 'error', message });
      });

    return () => {
      active = false;
    };
  }, [channel, baseUrl]);

  if (state.status === 'loading') {
    return (
      <div
        data-testid="live-schema-loading"
        className="my-6 rounded-xl border border-brand-500/15 bg-slate-950/90 px-4 py-6 text-center font-mono text-xs text-slate-500"
      >
        Loading schema…
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div
        data-testid="live-schema-error"
        role="alert"
        className="my-6 rounded-xl border border-rose-500/30 bg-rose-950/40 px-4 py-3 font-mono text-sm text-rose-200"
      >
        {state.message}
      </div>
    );
  }

  return (
    <div className="my-6 space-y-2">
      <p
        data-testid="live-schema-source"
        className="font-mono text-[11px] text-slate-500 break-all"
      >
        Source:{' '}
        <a
          href={state.url}
          className="text-brand-400 hover:text-brand-300 underline-offset-2 hover:underline"
        >
          {state.url}
        </a>
      </p>
      <pre
        data-testid="live-schema-json"
        className="max-h-[36rem] overflow-auto rounded-xl border border-brand-500/15 bg-slate-950/90 p-4 text-sm font-mono text-slate-200 shadow-inner"
      >
        {state.text}
      </pre>
    </div>
  );
};
