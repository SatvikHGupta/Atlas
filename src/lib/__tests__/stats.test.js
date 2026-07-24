import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { calcStreaks, calcWeeklySolves, getStats } from '../stats.js';

describe('calcStreaks', () => {
  it('returns zeros for no solves', () => {
    expect(calcStreaks({})).toEqual({ currentStreak: 0, longestStreak: 0 });
  });

  it('a single-day streak counts as 1', () => {
    const today = new Date().toISOString().slice(0, 10);
    const result = calcStreaks({ [today]: 1 });
    expect(result.currentStreak).toBe(1);
    expect(result.longestStreak).toBe(1);
  });

  it('detects a broken streak (gap > 1 day) and picks the longest run', () => {
    const solvesByDate = {
      '2026-01-01': 1,
      '2026-01-02': 1,
      '2026-01-03': 1,
      // gap
      '2026-01-10': 1,
    };
    const result = calcStreaks(solvesByDate);
    expect(result.longestStreak).toBe(3);
  });

  it('current streak is 0 if the most recent solve was more than 1 day ago', () => {
    const oldDate = '2020-01-01';
    const result = calcStreaks({ [oldDate]: 1 });
    expect(result.currentStreak).toBe(0);
  });

  it('current streak counts if the most recent solve was yesterday', () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const result = calcStreaks({ [yesterday]: 1 });
    expect(result.currentStreak).toBe(1);
  });
});

describe('calcWeeklySolves', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-23T12:00:00Z')); // a Thursday
  });
  afterEach(() => vi.useRealTimers());

  it('returns numWeeks buckets', () => {
    const result = calcWeeklySolves({}, 12);
    expect(result).toHaveLength(12);
    expect(result.every((n) => n === 0)).toBe(true);
  });

  it('buckets a solve into the correct week', () => {
    const result = calcWeeklySolves({ '2026-07-23': 3 }, 4);
    // last bucket = current week, should contain the 3 solves
    expect(result[result.length - 1]).toBe(3);
  });
});

describe('getStats', () => {
  const allProblems = [
    { canonical_id: 'a', difficulty: 3, topics: ['Array'], should_generate: true },
    { canonical_id: 'b', difficulty: 7, topics: ['Graph', 'BFS'], should_generate: true },
    { canonical_id: 'c', difficulty: null, topics: ['Math'], should_generate: true },
  ];

  it('counts solved/attempted and buckets by difficulty', () => {
    const progressList = [
      { canonical_id: 'a', status: 'solved', first_solved_at: '2026-07-20T00:00:00Z' },
      { canonical_id: 'b', status: 'solved', first_solved_at: '2026-07-21T00:00:00Z' },
      { canonical_id: 'c', status: 'attempted' },
    ];

    const stats = getStats(progressList, allProblems);

    expect(stats.total_solved).toBe(2);
    expect(stats.total_attempted).toBe(1);
    expect(stats.by_difficulty.Easy).toBe(1);  // difficulty 3 -> Easy
    expect(stats.by_difficulty.Hard).toBe(1);  // difficulty 7 -> Hard
    expect(stats.top_topics.find((t) => t.name === 'Array').count).toBe(1);
  });

  it('null difficulty is bucketed as Easy (matches backend behavior)', () => {
    const progressList = [{ canonical_id: 'c', status: 'solved', first_solved_at: '2026-07-20T00:00:00Z' }];
    const stats = getStats(progressList, allProblems);
    expect(stats.by_difficulty.Easy).toBe(1);
  });
});
