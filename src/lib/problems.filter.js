// Pure functions over the full in-memory slim problem array

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

// One-shot pipeline for the list pages
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

// validTopics: the Set of topic slugs ROADMAP_LEVELS actually declares
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

// keep the page inside 1..lastPage
export function clampPage(page, total, limit = 50) {
  const lastPage = Math.max(1, Math.ceil((total || 0) / (limit || 50)));
  const n = Number.isFinite(Number(page)) ? Math.floor(Number(page)) : 1;
  return Math.min(Math.max(1, n), lastPage);
}
