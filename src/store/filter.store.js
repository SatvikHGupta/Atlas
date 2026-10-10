'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

const DEFAULT_FILTERS = {
  topics:        [],
  difficulty:    '',
  status:        '',
  sort:          'frequency',
  search:        '',
  page:          1,
  limit:         50,
};

const STORE_VERSION = 3;

// Keep only keys that exist in DEFAULT_FILTERS, with the right primitive type
export function sanitizePersistedFilters(persisted) {
  const out = { ...DEFAULT_FILTERS };
  const src = persisted && typeof persisted === 'object' ? persisted : {};
  for (const key of Object.keys(DEFAULT_FILTERS)) {
    const fallback = DEFAULT_FILTERS[key];
    if (!(key in src)) continue;
    if (Array.isArray(fallback)) { if (Array.isArray(src[key]) && src[key].every((v) => typeof v === 'string')) out[key] = src[key]; }
    else if (typeof src[key] === typeof fallback) out[key] = src[key];
  }
  return out;
}

const noopStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const storage = () => (typeof window !== 'undefined' ? window.sessionStorage : noopStorage);

export const useFilterStore = create(
  persist(
    (set) => ({
      filters: { ...DEFAULT_FILTERS },
      hydrated: false,

      setFilter: (key, value) =>
        set((state) => ({ filters: { ...state.filters, [key]: value, page: 1 } })),

      setPage: (page) =>
        set((state) => ({ filters: { ...state.filters, page } })),

      patchFilters: (patch) =>
        set((state) => ({ filters: { ...state.filters, ...patch } })),

      resetFilters: () =>
        set({ filters: { ...DEFAULT_FILTERS } }),
    }),
    {
      name:    'atlas-filters',
      version: STORE_VERSION,
      storage: createJSONStorage(storage),
      skipHydration: true,

      partialize: (state) => ({
        filters: {
          topics:        state.filters.topics,
          difficulty:    state.filters.difficulty,
          status:        state.filters.status,
          sort:          state.filters.sort,
          search:        state.filters.search,
          page:          1,
          limit:         state.filters.limit,
        },
      }),

      migrate: (persisted) => ({ ...(persisted || {}), filters: sanitizePersistedFilters(persisted?.filters) }),

      merge: (persisted, current) => ({
        ...current,
        filters: sanitizePersistedFilters(persisted?.filters),
      }),

      onRehydrateStorage: () => () => {
        useFilterStore.setState({ hydrated: true });
      },
    }
  )
);
