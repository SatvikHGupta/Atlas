import { useQuery } from '@tanstack/react-query';
import { useAuth } from './useAuth.js';
import { getProblems } from '../services/content/dataClient.js';

/**
 * canonical_id -> { title, slug, difficulty, topics, isCp } lookup.
 *
 * Progress and bookmark records in Firestore only ever store
 * canonical_id + status/timestamp - never the problem's own details - so
 * any page that displays a title/difficulty for a solved or bookmarked
 * problem (History, Bookmarks) needs to resolve it against the actual
 * problems array.
 *
 * Built from the FULL in-memory problems array (services/content/
 * dataClient.js already has it cached - this triggers zero extra network
 * requests), not a paginated/limited fetch. A `limit`-based lookup misses
 * anything outside that slice, which is what caused solved/bookmarked
 * problems outside the top N (by whatever the default sort is) to show up
 * as "Unknown problem".
 */
export function useProblemLookup() {
  const { isAuthenticated } = useAuth();

  const { data } = useQuery({
    queryKey: ['problem-lookup'],
    queryFn: async () => {
      const problems = await getProblems();
      const map = {};
      for (const p of problems) {
        map[p.canonical_id] = {
          title: p.title,
          slug: p.slug,
          difficulty: p.difficulty,
          topics: p.topics,
          // should_generate:false is this codebase's existing "is CP, not
          // DSA" signal (see lib/problems.filter.js applyFilters) - there's
          // no separate literal `mode` field on the problem objects.
          isCp: p.should_generate === false,
        };
      }
      return map;
    },
    enabled: isAuthenticated,
    staleTime: 30 * 60 * 1000,
  });

  return data || {};
}
