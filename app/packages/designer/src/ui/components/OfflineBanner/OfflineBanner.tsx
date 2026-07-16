import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';
import { alwaysOnlineNetworkStatus, type NetworkStatusPort } from '../../../core';

type Props = {
  networkStatus?: NetworkStatusPort;
};

/**
 * Fixed status strip when NetworkStatusPort reports offline.
 * Local IndexedDB / File System Access work continues; remote fetches will not.
 */
export function OfflineBanner({ networkStatus = alwaysOnlineNetworkStatus }: Props) {
  const [offline, setOffline] = useState(() => !networkStatus.isOnline());

  useEffect(() => {
    setOffline(!networkStatus.isOnline());
    return networkStatus.subscribe(online => {
      setOffline(!online);
    });
  }, [networkStatus]);

  if (!offline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-0 inset-x-0 z-[60] flex items-center justify-center gap-2 border-t border-amber-500/30 bg-amber-950/95 px-4 py-2 text-xs font-mono text-amber-100 backdrop-blur-md pb-[max(0.5rem,env(safe-area-inset-bottom))]"
    >
      <WifiOff className="size-3.5 shrink-0 text-amber-400" aria-hidden />
      <span>You&apos;re offline — editing local workspace only</span>
    </div>
  );
}
