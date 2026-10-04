'use client';

import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { getThemeStore } from '../theme/theme-store.js';

// React's view of the active theme ({ mode, accent, secondary }); secondary is null for Auto. State lives in the theme store (DOM attributes + localStorage),
// this hook only subscribes to it, so there is a single authoritative "current theme".
export function useThemePreference() {
  const store = getThemeStore();
  const { mode, accent, secondary } = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);

  // After hydration, make sure DOM, stored values and React agree (repairs a stale/removed id).
  useEffect(() => {
    store.sync();
  }, [store]);

  const setMode = useCallback((id) => store.setMode(id), [store]);
  const setAccent = useCallback((id) => store.setAccent(id), [store]);
  const setSecondary = useCallback((id) => store.setSecondary(id), [store]);
  return { mode, accent, secondary, setMode, setAccent, setSecondary };
}
