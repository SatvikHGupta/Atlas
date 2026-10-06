/* Pure functions over the full in-memory slim problem array (loaded once from /data/problems-index.json or /data/cp-index.json - see services/content/dataClient.js). Zero I/O, framework-agnostic, unit tested in lib/__tests__/problems.filter.test.js. BUG FIX (was: Problems.jsx / CpProblems.jsx in the old Vite app): status ('solved' | 'attempted' | 'unsolved' | 'bookmarked') depends on per-user Firestore progress, which can never be baked into a static page - so it has to be applied client-side. The old code fetched a *paginated* 50-item page from `findMany` and then filtered by status on top of that already-sliced page, so "Solved" showed at most 50 items (whatever solved problems happened to land on the current metadata- filtered page) and the count never matched, and page 2+ was useless. The fix: applyStatusFilter runs BEFORE pagination, on the full filtered array, exactly like every other filter here. findMany takes an optional pre-filtered array via `problems` so callers do: let list = applyFilters(all, filters); list = applyStatusFilter(list, status, progressMap, bookmarkedIds); list = applySort(list, sort); const page = list.slice(offset, offset + limit); - one filter pipeline, applied once, in the right order, every time. */

export function applyFilters(problems, filters = {}) {
  let result = problems;

  if (filters.mode === 'cp') {
    result = result.filter((p) => p.should_generate === false);
  } else if (filters.mode !== 'all') {
    result = result.filter((p) => p.should_generate === true);
  }

  if (filters.search) {
    const q = filters.search.toLowerCase();
    result = result.filter((p) => p.title?.toLowerCase().includes(q));
  }
  if (filters.topics?.length) {
    result = result.filter((p) => {
      const t = p.topics_display ?? p.topics ?? [];
      return filters.topics.every((wanted) => t.includes(wanted));
    });
  }
  if (filters.difficulty)       result = result.filter((p) => p.difficulty === Number(filters.difficulty));
  if (filters.difficulty_min)   result = result.filter((p) => p.difficulty >= Number(filters.difficulty_min));
  if (filters.difficulty_max)   result = result.filter((p) => p.difficulty <= Number(filters.difficulty_max));
  if (filters.is_atlas_roadmap) result = result.filter((p) => p.is_atlas_roadmap);

  return result;
}

/* @param {Array} problems - already metadata-filtered (applyFilters output) @param {string|null} status - 'solved' | 'attempted' | 'unsolved' | 'bookmarked' | falsy (no-op) @param {Record<string,string>} progressMap - canonical_id -> status, from useProgress() @param {Set<string>} bookmarkedIds - from useBookmarks() */
export function applyStatusFilter(problems, status, progressMap = {}, bookmarkedIds = new Set()) {
  if (!status) return problems;
  switch (status) {
    case 'solved':     return problems.filter((p) => progressMap[p.canonical_id] === 'solved');
    case 'attempted':  return problems.filter((p) => progressMap[p.canonical_id] === 'attempted');
    case 'unsolved':   return problems.filter((p) => !progressMap[p.canonical_id]);
    case 'bookmarked': return problems.filter((p) => bookmarkedIds.has(p.canonical_id));
    default:           return problems;
  }
}

export function applySort(problems, sort) {
  switch (sort) {
    case 'difficulty_asc':  return [...problems].sort((a, b) => (a.difficulty || 0) - (b.difficulty || 0));
    case 'difficulty_desc': return [...problems].sort((a, b) => (b.difficulty || 0) - (a.difficulty || 0));
    case 'title_asc':       return [...problems].sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    case 'frequency':
    default:                return [...problems].sort((a, b) => (b.frequency_score || 0) - (a.frequency_score || 0));
  }
}

/* One-shot pipeline for the list pages: filter -> status filter -> sort -> paginate. `progressMap`/`bookmarkedIds` are optional - omit them (or leave status unset) for a page that doesn't need per-user state, e.g. generateStaticParams or a logged-out CP list. */
export function findMany(allProblems, filters = {}, pagination = {}, userState = {}) {
  const { page = 1, limit = 50, sort = 'frequency' } = pagination;
  const { progressMap = {}, bookmarkedIds = new Set() } = userState;

  let filtered = applyFilters(allProblems, filters);
  filtered = applyStatusFilter(filtered, filters.status, progressMap, bookmarkedIds);
  filtered = applySort(filtered, sort);

  const total = filtered.length;
  const offset = (page - 1) * limit;
  const pageItems = filtered.slice(offset, offset + limit);

  return { problems: pageItems, total, page, limit };
}

// validTopics: the Set of topic slugs ROADMAP_LEVELS actually declares for this level (see constants/roadmap.js).
// Filtering on roadmap_level alone would show any row whose level field happens to match, even one whose
// roadmap_topic isn't declared under this level at all - a stale/mismigrated row from an older curriculum
// revision. Passing validTopics makes the page trustworthy even if roadmap_level and roadmap_topic ever drift
// out of sync in the source data again; omit it only for a quick, unchecked lookup.
export function getByRoadmapLevel(allProblems, level, validTopics) {
  return allProblems
    .filter((p) => p.is_atlas_roadmap && p.roadmap_level === level
      && (!validTopics || validTopics.has(p.roadmap_topic)))
    .sort((a, b) => (a.roadmap_order || 0) - (b.roadmap_order || 0));
}

export function getByRoadmapTopic(allProblems, level, topic) {
  return allProblems
    .filter((p) => p.is_atlas_roadmap && p.roadmap_level === level && p.roadmap_topic === topic)
    .sort((a, b) => (a.roadmap_order || 0) - (b.roadmap_order || 0));
}

export function getDsaProblemsMap(allProblems) {
  const map = {};
  for (const p of allProblems) {
    if (p.should_generate !== false) {
      map[p.canonical_id] = {
        difficulty: p.difficulty,
        topics: p.topics || [],
        topics_display: p.topics_display || p.topics || [],
        roadmap_topic: p.roadmap_topic,
      };
    }
  }
  return map;
}

// BUG-104: keep the page inside 1..lastPage. Empty results still give page 1.
export function clampPage(page, total, limit = 50) {
  const lastPage = Math.max(1, Math.ceil((total || 0) / (limit || 50)));
  const n = Number.isFinite(Number(page)) ? Math.floor(Number(page)) : 1;
  return Math.min(Math.max(1, n), lastPage);
}
