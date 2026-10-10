'use client';

import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { getThemeStore } from '../theme/theme-store.js';

// React's view of the active theme
export function useThemePreference() {
  const store = getThemeStore();
  const { mode, accent, secondary } = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);

  useEffect(() => {
    store.sync();
  }, [store]);

  const setMode = useCallback((id) => store.setMode(id), [store]);
  const setAccent = useCallback((id) => store.setAccent(id), [store]);
  const setSecondary = useCallback((id) => store.setSecondary(id), [store]);
  const apply = useCallback((next) => store.apply(next), [store]);
  return { mode, accent, secondary, setMode, setAccent, setSecondary, apply };
}
