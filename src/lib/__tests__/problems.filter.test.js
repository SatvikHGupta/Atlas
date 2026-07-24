import { describe, it, expect } from 'vitest';
import { applyFilters, applySort, findMany, search, getByRoadmapLevel, getDsaProblemsMap } from '../problems.filter.js';

const fixture = [
  { canonical_id: 'a', title: 'Two Sum', slug: 'two-sum', difficulty: 3, difficulty_label: 'Easy', topics: ['Array', 'Hashing'], patterns: ['Two Pointers'], frequency_score: 90, should_generate: true, is_atlas_roadmap: true, roadmap_level: 1, roadmap_topic: '1D Arrays', roadmap_order: 1, source_platforms: ['leetcode'] },
  { canonical_id: 'b', title: 'Merge Intervals', slug: 'merge-intervals', difficulty: 6, difficulty_label: 'Medium', topics: ['Array', 'Sorting'], patterns: ['Merge Intervals'], frequency_score: 70, should_generate: true, is_atlas_roadmap: true, roadmap_level: 3, roadmap_topic: 'Sorting Algorithms', roadmap_order: 2, source_platforms: ['leetcode'] },
  { canonical_id: 'c', title: 'CF 1234A', slug: 'cf-1234a', difficulty: 9, difficulty_label: 'Hard', topics: ['Math'], patterns: [], frequency_score: 10, should_generate: false, is_atlas_roadmap: false, roadmap_level: null, roadmap_topic: null, source_platforms: ['codeforces'] },
];

describe('applyFilters', () => {
  it('defaults to should_generate:true (dsa mode)', () => {
    const result = applyFilters(fixture, {});
    expect(result.map((p) => p.canonical_id)).toEqual(['a', 'b']);
  });

  it('mode:cp returns should_generate:false only', () => {
    const result = applyFilters(fixture, { mode: 'cp' });
    expect(result.map((p) => p.canonical_id)).toEqual(['c']);
  });

  it('filters by case-insensitive title substring search', () => {
    const result = applyFilters(fixture, { search: 'two' });
    expect(result.map((p) => p.canonical_id)).toEqual(['a']);
  });

  it('filters by topic (array-includes)', () => {
    const result = applyFilters(fixture, { topic: 'Sorting' });
    expect(result.map((p) => p.canonical_id)).toEqual(['b']);
  });

  it('filters by exact difficulty', () => {
    const result = applyFilters(fixture, { difficulty: 3 });
    expect(result.map((p) => p.canonical_id)).toEqual(['a']);
  });

  it('filters by difficulty range', () => {
    const result = applyFilters(fixture, { difficulty_min: 4, difficulty_max: 8 });
    expect(result.map((p) => p.canonical_id)).toEqual(['b']);
  });

  it('filters by roadmap_level', () => {
    const result = applyFilters(fixture, { roadmap_level: 1 });
    expect(result.map((p) => p.canonical_id)).toEqual(['a']);
  });

  it('returns empty array when nothing matches', () => {
    const result = applyFilters(fixture, { search: 'nonexistent-xyz' });
    expect(result).toEqual([]);
  });
});

describe('applySort', () => {
  it('difficulty_asc sorts ascending', () => {
    const result = applySort(fixture, 'difficulty_asc');
    expect(result.map((p) => p.canonical_id)).toEqual(['a', 'b', 'c']);
  });

  it('difficulty_desc sorts descending', () => {
    const result = applySort(fixture, 'difficulty_desc');
    expect(result.map((p) => p.canonical_id)).toEqual(['c', 'b', 'a']);
  });

  it('title_asc sorts alphabetically', () => {
    const result = applySort(fixture, 'title_asc');
    expect(result.map((p) => p.canonical_id)).toEqual(['c', 'b', 'a']); // CF 1234A, Merge Intervals, Two Sum
  });

  it('defaults to frequency_score descending', () => {
    const result = applySort(fixture, undefined);
    expect(result.map((p) => p.canonical_id)).toEqual(['a', 'b', 'c']);
  });

  it('does not mutate the input array', () => {
    const copy = [...fixture];
    applySort(fixture, 'title_asc');
    expect(fixture).toEqual(copy);
  });
});

describe('findMany', () => {
  it('paginates and returns the slim projection with total count', () => {
    const result = findMany(fixture, {}, { page: 1, limit: 1, sort: 'frequency' });
    expect(result.total).toBe(2); // only should_generate:true
    expect(result.problems).toHaveLength(1);
    expect(result.problems[0].canonical_id).toBe('a');
    expect(result.problems[0]).not.toHaveProperty('description');
  });
});

describe('search', () => {
  it('excludes should_generate:false problems', () => {
    const result = search(fixture, 'cf');
    expect(result).toEqual([]);
  });

  it('matches should_generate:true problems by title', () => {
    const result = search(fixture, 'merge');
    expect(result.map((p) => p.canonical_id)).toEqual(['b']);
  });
});

describe('getByRoadmapLevel', () => {
  it('returns only roadmap problems for the given level, sorted by roadmap_order', () => {
    const result = getByRoadmapLevel(fixture, 1);
    expect(result.map((p) => p.canonical_id)).toEqual(['a']);
  });

  it('returns empty for a level with no roadmap problems', () => {
    expect(getByRoadmapLevel(fixture, 5)).toEqual([]);
  });
});

describe('getDsaProblemsMap', () => {
  it('includes only should_generate:true problems, keyed by canonical_id', () => {
    const map = getDsaProblemsMap(fixture);
    expect(Object.keys(map).sort()).toEqual(['a', 'b']);
    expect(map.a.topics).toEqual(['Array', 'Hashing']);
  });
});
