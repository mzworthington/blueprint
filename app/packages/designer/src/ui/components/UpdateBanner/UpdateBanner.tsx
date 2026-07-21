import { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { hasRemoteBuildUpdate } from '../../../infrastructure/pwa/buildId';

/**
 * Prompt when a new production build is available (service worker or index.html build id).
 */
export function UpdateBanner() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({ immediate: true });

  const [fallbackRefresh, setFallbackRefresh] = useState(false);

  const checkForRemoteUpdate = useCallback(async () => {
    if (import.meta.env.DEV) return;
    const updated = await hasRemoteBuildUpdate(import.meta.env.BASE_URL);
    if (updated) setFallbackRefresh(true);
  }, []);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') void checkForRemoteUpdate();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [checkForRemoteUpdate]);

  const show = needRefresh || fallbackRefresh;
  if (!show) return null;

  const refresh = () => {
    if (needRefresh) {
      void updateServiceWorker(true);
      return;
    }
    window.location.reload();
  };

  const dismiss = () => {
    setNeedRefresh(false);
    setFallbackRefresh(false);
  };

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="update-banner"
      className="fixed top-0 inset-x-0 z-[60] flex flex-wrap items-center justify-center gap-3 border-b border-[#00f0ff]/25 bg-[#061125]/95 px-4 py-2 text-xs font-mono text-slate-100 backdrop-blur-md pt-[max(0.5rem,env(safe-area-inset-top))]"
    >
      <RefreshCw className="size-3.5 shrink-0 text-[#00f0ff]" aria-hidden />
      <span>A new version of Blueprint is available.</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={refresh}
          className="rounded-md border border-[#00f0ff]/40 bg-[#00f0ff]/10 px-2.5 py-1 text-[#00f0ff] hover:bg-[#00f0ff]/20 transition-colors"
        >
          Refresh
        </button>
        <button
          type="button"
          onClick={dismiss}
          className="rounded-md border border-slate-700 px-2.5 py-1 text-slate-400 hover:text-slate-200 transition-colors"
        >
          Later
        </button>
      </div>
    </div>
  );
}
