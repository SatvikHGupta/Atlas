/**
 * Verbatim port of backend/repositories/problem.repo.js's pure logic
 * (applyFilters, applySort, findMany, search, getByRoadmapLevel,
 * getByRoadmapTopic, getDsaProblemsMap).
 *
 * Zero I/O — every function here takes the already-loaded problems array
 * (from services/content/dataClient.js) and returns derived data. This is
 * what makes these functions trivially unit-testable (see
 * lib/__tests__/problems.filter.test.js) and framework-agnostic (portable
 * to a future Next.js codebase unchanged, per docs/11-FUTURE-ROADMAP.md).
 *
 * Do not change filter/sort semantics or the slim-projection field lists
 * without checking docs/05-BUSINESS-LOGIC-MAPPING.md — these directly
 * affect what users see in lists/search and were deliberately kept
 * identical to the old backend behavior.
 */

export function applyFilters(problems, filters = {}) {
  let result = problems;

  if (filters.mode === 'cp') {
    result = result.filter((p) => p.should_generate === false);
  } else {
    result = result.filter((p) => p.should_generate === true);
  }

  if (filters.search) {
    const q = filters.search.toLowerCase();
    result = result.filter((p) => p.title?.toLowerCase().includes(q));
  }
  if (filters.topic)            result = result.filter((p) => p.topics?.includes(filters.topic));
  if (filters.pattern)          result = result.filter((p) => p.patterns?.includes(filters.pattern));
  if (filters.difficulty)       result = result.filter((p) => p.difficulty === Number(filters.difficulty));
  if (filters.difficulty_min)   result = result.filter((p) => p.difficulty >= Number(filters.difficulty_min));
  if (filters.difficulty_max)   result = result.filter((p) => p.difficulty <= Number(filters.difficulty_max));
  if (filters.is_atlas_roadmap) result = result.filter((p) => p.is_atlas_roadmap);
  if (filters.roadmap_level !== null && filters.roadmap_level !== undefined) {
    result = result.filter((p) => p.roadmap_level === filters.roadmap_level);
  }

  return result;
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

const SLIM_FIELDS = [
  'canonical_id', 'title', 'slug', 'difficulty', 'difficulty_label',
  'topics', 'patterns', 'source_platforms', 'frequency_score',
  'is_atlas_roadmap', 'roadmap_level', 'roadmap_topic', 'should_generate',
];

function toSlim(p) {
  const out = {};
  for (const f of SLIM_FIELDS) out[f] = p[f];
  return out;
}

export function findMany(allProblems, filters = {}, pagination = {}) {
  const { page = 1, limit = 50, sort = 'frequency' } = pagination;

  let filtered = applyFilters(allProblems, filters);
  filtered = applySort(filtered, sort);

  const total = filtered.length;
  const offset = (page - 1) * limit;

  const slim = filtered.slice(offset, offset + limit).map(toSlim);

  return { problems: slim, total, page, limit };
}

export function search(allProblems, q, limit = 20) {
  const lower = (q || '').toLowerCase();
  return allProblems
    .filter((p) => p.should_generate !== false && p.title?.toLowerCase().includes(lower))
    .slice(0, limit)
    .map((p) => ({
      canonical_id: p.canonical_id,
      title: p.title,
      slug: p.slug,
      difficulty: p.difficulty,
      difficulty_label: p.difficulty_label,
      topics: p.topics,
    }));
}

export function getByRoadmapLevel(allProblems, level) {
  return allProblems
    .filter((p) => p.is_atlas_roadmap && p.roadmap_level === level)
    .sort((a, b) => (a.roadmap_order || 0) - (b.roadmap_order || 0))
    .map((p) => ({
      canonical_id: p.canonical_id,
      title: p.title,
      slug: p.slug,
      difficulty: p.difficulty,
      difficulty_label: p.difficulty_label,
      topics: p.topics,
      roadmap_topic: p.roadmap_topic,
      roadmap_order: p.roadmap_order,
    }));
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
        roadmap_topic: p.roadmap_topic,
      };
    }
  }
  return map;
}
