'use client';
// SSR-safe media query hook. Author: Satvik Hemant Gupta

import { useSyncExternalStore } from 'react';

// Server and first client render use `serverValue`, so markup matches.
export function useMediaQuery(query, serverValue = false) {
  return useSyncExternalStore(
    (cb) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', cb);
      return () => mql.removeEventListener('change', cb);
    },
    () => window.matchMedia(query).matches,
    () => serverValue
  );
}
