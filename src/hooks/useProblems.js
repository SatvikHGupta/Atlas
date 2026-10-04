'use client';

import { useQuery } from '@tanstack/react-query';
import { getDsaIndex, getCpIndex } from '../services/content/dataClient.js';

/* BUG-171: ONE staleTime for the static content indexes. They only change on a new deploy, so 1 hour is
   fine. NOTE this is deliberately NOT the same as the per-user progress/bookmark cache in
   store/auth.store.js (CACHE_STALE_MS = 5 minutes): that data is per user and can change from another
   device. The old comment claimed both values matched, which was wrong. */
export const INDEX_STALE_TIME_MS = 60 * 60 * 1000;

/* Loads the full slim DSA index once (cached by react-query, deduped across every page that calls this). No more "service" layer running server-shaped pagination on the client - see lib/problems.filter.js's findMany doc comment for why that's what caused the old status-filter bug. Callers run applyFilters/applyStatusFilter/applySort/slice themselves with the data they have (filters from the store, progress from useProgress, bookmarks from useBookmarks) - one pipeline, in one place, every time. */
export const useDsaIndex = () =>
  useQuery({
    queryKey: ['dsa-index'],
    queryFn: getDsaIndex,
    staleTime: INDEX_STALE_TIME_MS,
  });

/* The CP index is about 6 MB. Pass { enabled: false } until it is really needed (see resolveIds.js
   needsCpIndex) so pages like Bookmarks and Dashboard do not download it for DSA-only users. */
export const useCpIndex = ({ enabled = true } = {}) =>
  useQuery({
    queryKey: ['cp-index'],
    queryFn: getCpIndex,
    staleTime: INDEX_STALE_TIME_MS,
    enabled,
  });
