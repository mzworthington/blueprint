import type { NetworkStatusPort } from '../../core';

/**
 * Browser adapter for NetworkStatusPort — maps navigator.onLine and
 * window online/offline events without leaking into UI or domain code.
 */
export const BrowserNetworkStatusAdapter: NetworkStatusPort = {
  isOnline: () => navigator.onLine,

  subscribe: listener => {
    const onOnline = () => listener(true);
    const onOffline = () => listener(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  },
};
