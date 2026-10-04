'use client';

import { useEffect, useRef } from 'react';
import { useFilterStore } from '../store/filter.store.js';
import { useAuthStore } from '../store/auth.store.js';
import { isAuthResolved, shouldClearStatus } from '../lib/authGate.js';

export const useFilters = () => {
  const { filters, setFilter, resetFilters, setPage, patchFilters } = useFilterStore();
  return { filters, setFilter, resetFilters, setPage, patchFilters };
};

// BUG-105: true once sessionStorage rehydration has finished, so callers can
// safely apply URL params on top without the hydration racing past them.
export const useFiltersHydrated = () => useFilterStore((s) => s.hydrated);

/* Call once near the app root (see components/layout/Providers.jsx) - filter.store.js uses skipHydration so server & first client render match, then this pulls the persisted sessionStorage filters in right after. */
export const useHydrateFilters = () => {
  useEffect(() => {
    useFilterStore.persist.rehydrate();
  }, []);
};

/* BUG-102/103: personal status filters (solved, attempted, bookmarked) make no
   sense signed out. Clear them on sign-out, on refresh, and on user switch.
   Mounted once in Providers so it works on every page. Waits for auth to
   resolve so a refresh while signed in never wipes a valid filter. */
export const useSignedOutStatusGuard = () => {
  const status = useFilterStore((s) => s.filters.status);
  const setFilter = useFilterStore((s) => s.setFilter);
  const uid = useAuthStore((s) => s.user?.uid || null);
  const resolved = useAuthStore((s) => isAuthResolved(s));
  const prevUid = useRef(null);

  useEffect(() => {
    if (!resolved) return;
    const switched = prevUid.current !== null && prevUid.current !== uid;
    prevUid.current = uid;
    if (status && (switched || shouldClearStatus({ status, isAuthed: !!uid, resolved }))) {
      setFilter('status', '');
    }
  }, [status, uid, resolved, setFilter]);
};
