import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

const DEFAULT_FILTERS = {
  topic:         '',
  pattern:       '',
  difficulty:    '',
  roadmap_level: '',
  status:        '',
  sort:          'frequency',
  search:        '',
  page:          1,
  limit:         50,
};

// version bumped to 2 - forces Zustand to discard any old persisted state
// that may contain stale keys like is_atlas_roadmap from previous sessions
const STORE_VERSION = 2;

export const useFilterStore = create(
  persist(
    (set) => ({
      filters: { ...DEFAULT_FILTERS },

      setFilter: (key, value) =>
        set((state) => ({ filters: { ...state.filters, [key]: value, page: 1 } })),

      setPage: (page) =>
        set((state) => ({ filters: { ...state.filters, page } })),

      resetFilters: () =>
        set({ filters: { ...DEFAULT_FILTERS } }),
    }),
    {
      name:    'atlas-filters',
      version: STORE_VERSION,
      storage: createJSONStorage(() => sessionStorage),

      // only persist known filter keys - unknown/stale keys are stripped
      partialize: (state) => ({
        filters: {
          topic:         state.filters.topic,
          pattern:       state.filters.pattern,
          difficulty:    state.filters.difficulty,
          roadmap_level: state.filters.roadmap_level,
          status:        state.filters.status,
          sort:          state.filters.sort,
          search:        state.filters.search,
          page:          1,   // always reset page on tab reopen
          limit:         state.filters.limit,
        },
      }),

      // merge only known keys from persisted state - prevents stale keys bleeding in
      merge: (persisted, current) => ({
        ...current,
        filters: {
          ...DEFAULT_FILTERS,
          ...persisted.filters,
          // strip any key not in DEFAULT_FILTERS by re-spreading defaults first
        },
      }),
    }
  )
);
