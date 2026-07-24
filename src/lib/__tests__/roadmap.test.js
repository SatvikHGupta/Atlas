import { describe, it, expect } from 'vitest';
import { checkUnlock, enrichRoadmap, buildRoadmapWithCounts } from '../roadmap.js';
import { UNLOCK_THRESHOLD } from '../../constants/roadmap.js';

// 6 roadmap problems in the same level/topic, so we can cross the
// UNLOCK_THRESHOLD (5) boundary precisely.
const allProblems = Array.from({ length: 6 }, (_, i) => ({
  canonical_id: `p${i}`,
  title: `Problem ${i}`,
  is_atlas_roadmap: true,
  roadmap_level: 1,
  roadmap_topic: '1D Arrays',
  roadmap_order: i,
  difficulty: 3,
  topics: ['Array'],
  should_generate: true,
}));

describe('checkUnlock — exact threshold crossing', () => {
  it('fires exactly when solvedInTopic === UNLOCK_THRESHOLD', () => {
    const solvedIds = new Set(['p0', 'p1', 'p2', 'p3', 'p4']); // exactly 5
    const result = checkUnlock(allProblems, solvedIds, 'p4');
    expect(result).toEqual({ level: 1, topic: '1D Arrays', solvedCount: UNLOCK_THRESHOLD });
  });

  it('does NOT fire below the threshold (4 solved)', () => {
    const solvedIds = new Set(['p0', 'p1', 'p2', 'p3']);
    const result = checkUnlock(allProblems, solvedIds, 'p3');
    expect(result).toBeNull();
  });

  it('does NOT fire again after crossing (6 solved — already past threshold)', () => {
    const solvedIds = new Set(['p0', 'p1', 'p2', 'p3', 'p4', 'p5']);
    const result = checkUnlock(allProblems, solvedIds, 'p5');
    expect(result).toBeNull();
  });

  it('returns null for a non-roadmap problem', () => {
    const nonRoadmap = { canonical_id: 'x', is_atlas_roadmap: false };
    const result = checkUnlock([...allProblems, nonRoadmap], new Set(['x']), 'x');
    expect(result).toBeNull();
  });
});

describe('enrichRoadmap — display state (>= threshold, distinct from checkUnlock)', () => {
  const structure = [
    { level: 0, title: 'Foundations', topics: [{ name: 'Loops & Patterns', totalProblems: 0 }] },
    { level: 1, title: 'Arrays & Strings', topics: [{ name: '1D Arrays', totalProblems: 6 }] },
  ];

  it('level 0 is always unlocked', () => {
    const enriched = enrichRoadmap(structure, allProblems, {});
    expect(enriched[0].isUnlocked).toBe(true);
  });

  it('level 1 is locked until level 0 has UNLOCK_THRESHOLD solves', () => {
    const enriched = enrichRoadmap(structure, allProblems, {});
    expect(enriched[1].isUnlocked).toBe(false);
  });

  it('topic isUnlocked stays true once >= threshold, not just at exactly threshold', () => {
    const progressMap = Object.fromEntries(['p0', 'p1', 'p2', 'p3', 'p4', 'p5'].map((id) => [id, 'solved']));
    const enriched = enrichRoadmap(structure, allProblems, progressMap);
    const topic = enriched[1].topics[0];
    expect(topic.solvedProblems).toBe(6);
    expect(topic.isUnlocked).toBe(true); // 6 >= 5, still unlocked (unlike checkUnlock's exact check)
  });
});

describe('buildRoadmapWithCounts', () => {
  it('computes totalProblems per topic and per level from the actual problems array', () => {
    const structure = [{ level: 1, title: 'Arrays & Strings', topics: ['1D Arrays'] }];
    const result = buildRoadmapWithCounts(structure, allProblems);
    expect(result[0].topics[0]).toEqual({ name: '1D Arrays', totalProblems: 6 });
    expect(result[0].totalProblems).toBe(6);
  });
});
