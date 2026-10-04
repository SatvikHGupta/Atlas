'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

const DEFAULT_FILTERS = {
  topic:         '',
  pattern:       '',
  difficulty:    '',
  status:        '',
  sort:          'frequency',
  search:        '',
  page:          1,
  limit:         50,
};

// ATLAS-BUG-017: v3 removes `roadmap_level`. It was persisted but had no visible control, so an old value could
// silently hide problems with no way for the user to see or clear it. Version bump + whitelist (below) mean an
// obsolete key in an old session can never reach the filter state again.
const STORE_VERSION = 3;

/** Keep only keys that exist in DEFAULT_FILTERS, with the right primitive type. Pure, exported for tests. */
export function sanitizePersistedFilters(persisted) {
  const out = { ...DEFAULT_FILTERS };
  const src = persisted && typeof persisted === 'object' ? persisted : {};
  for (const key of Object.keys(DEFAULT_FILTERS)) {
    if (key in src && typeof src[key] === typeof DEFAULT_FILTERS[key]) out[key] = src[key];
  }
  return out;
}

// Next.js renders this module on the server too (for the initial HTML) - sessionStorage doesn't exist there. A no-op storage keeps `persist` happy during SSR; the real sessionStorage takes over once hydrated in the browser.
const noopStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const storage = () => (typeof window !== 'undefined' ? window.sessionStorage : noopStorage);

export const useFilterStore = create(
  persist(
    (set) => ({
      filters: { ...DEFAULT_FILTERS },
      hydrated: false, // true once sessionStorage rehydration has run (BUG-105)

      setFilter: (key, value) =>
        set((state) => ({ filters: { ...state.filters, [key]: value, page: 1 } })),

      setPage: (page) =>
        set((state) => ({ filters: { ...state.filters, page } })),

      // BUG-105: apply several keys at once (URL init) without forcing page 1
      patchFilters: (patch) =>
        set((state) => ({ filters: { ...state.filters, ...patch } })),

      resetFilters: () =>
        set({ filters: { ...DEFAULT_FILTERS } }),
    }),
    {
      name:    'atlas-filters',
      version: STORE_VERSION,
      storage: createJSONStorage(storage),
      skipHydration: true, // hydrate manually client-side (see FilterBar) to avoid SSR/client mismatch

      partialize: (state) => ({
        filters: {
          topic:         state.filters.topic,
          pattern:       state.filters.pattern,
          difficulty:    state.filters.difficulty,
          status:        state.filters.status,
          sort:          state.filters.sort,
          search:        state.filters.search,
          page:          1,
          limit:         state.filters.limit,
        },
      }),

      // old sessions (version < 3) may carry roadmap_level: drop it instead of carrying it forward
      migrate: (persisted) => ({ ...(persisted || {}), filters: sanitizePersistedFilters(persisted?.filters) }),

      merge: (persisted, current) => ({
        ...current,
        // BUG-099: persisted is undefined on a first visit; guard so hydration finishes
        filters: sanitizePersistedFilters(persisted?.filters),
      }),

      onRehydrateStorage: () => () => {
        useFilterStore.setState({ hydrated: true });
      },
    }
  )
);
