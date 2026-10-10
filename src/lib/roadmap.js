// Roadmap rules, enrichment (solved counts, lock state) and the unlock toast check

import { UNLOCK_THRESHOLD, ROADMAP_LEVELS } from '../constants/roadmap.js';
import { getByRoadmapTopic } from './problems.filter.js';

export const TOTAL_LEVELS = ROADMAP_LEVELS.length;

// Verbatim port of backend/services/roadmap.service.js's getFullRoadmap
export function buildRoadmapWithCounts(roadmapStructure, allProblems) {
  return roadmapStructure.map((levelData) => {
    const topicsWithCounts = levelData.topicSlugs.map((slug) => {
      const problems = getByRoadmapTopic(allProblems, levelData.level, slug);
      return { slug, totalProblems: problems.length };
    });

    const levelTotal = topicsWithCounts.reduce((sum, t) => sum + t.totalProblems, 0);

    return { ...levelData, topics: topicsWithCounts, totalProblems: levelTotal };
  });
}

// Thin topics scale down: a topic with 3 problems needs 3, not 5
export function getTopicThreshold(totalProblems) {
  return Math.min(UNLOCK_THRESHOLD, totalProblems || 0);
}

// THE unlock rule
export function getLevelUnlockState(level, prevTopicStates = []) {
  if (!(level > 0)) return { isUnlocked: true, missingTopics: [] };
  const missingTopics = prevTopicStates
    .filter((t) => !t.isEmpty && !t.isComplete)
    .map((t) => t.slug);
  return { isUnlocked: missingTopics.length === 0, missingTopics };
}

// Hint shown on locked cards, e.g
export function formatLockHint(level, missingTopics = [], nameBySlug = {}) {
  const names = missingTopics.map((s) => nameBySlug[s] || s);
  if (!names.length) return `Complete Level ${level - 1} to unlock`;
  return `Complete ${names.join(', ')} in Level ${level - 1} to unlock`;
}

// Route param check for /roadmap/[level] a plain non-negative integer string
export function parseLevelParam(value, levelCount = TOTAL_LEVELS) {
  if (typeof value !== 'string' || !/^(0|[1-9]\d*)$/.test(value)) return null;
  const n = Number(value);
  return Number.isSafeInteger(n) && n < levelCount ? n : null;
}

// Core evaluation, shared by enrichRoadmap
function evaluateRoadmap(roadmapStructure, allProblems, isSolved) {
  const idsByTopic = new Map();
  for (const p of allProblems) {
    if (!p.is_atlas_roadmap || p.roadmap_topic == null) continue;
    const key = `${p.roadmap_level}:${p.roadmap_topic}`;
    if (!idsByTopic.has(key)) idsByTopic.set(key, []);
    idsByTopic.get(key).push(p.canonical_id);
  }

  const result = [];
  roadmapStructure.forEach((levelData, idx) => {
    const lvl = levelData.level;
    const topics = (levelData.topics || []).map((topic) => {
      const ids = idsByTopic.get(`${lvl}:${topic.slug}`) || [];
      const totalProblems = topic.totalProblems ?? ids.length;
      const solvedProblems = ids.filter(isSolved).length;
      const threshold = getTopicThreshold(totalProblems);
      const isEmpty = totalProblems === 0;
      return {
        slug: topic.slug,
        totalProblems,
        solvedProblems,
        threshold,
        isEmpty,
        isComplete: !isEmpty && solvedProblems >= threshold,
      };
    });

    const unlock = getLevelUnlockState(lvl, idx === 0 ? [] : result[idx - 1].topics);
    const nonEmpty = topics.filter((t) => !t.isEmpty);
    result.push({
      ...levelData,
      topics: topics.map((t) => ({ ...t, isUnlocked: unlock.isUnlocked })),
      solvedProblems: topics.reduce((sum, t) => sum + t.solvedProblems, 0),
      isUnlocked: unlock.isUnlocked,
      missingTopics: unlock.missingTopics,
      isComplete: nonEmpty.every((t) => t.isComplete),
      isFinal: idx === roadmapStructure.length - 1,
    });
  });
  return result;
}

export function enrichRoadmap(roadmapStructure, allProblems, progressMap) {
  if (!roadmapStructure?.length) return [];
  const map = progressMap || {};
  return evaluateRoadmap(roadmapStructure, allProblems, (id) => map[id] === 'solved');
}

// Toast trigger (contract )
export function checkUnlock(allProblems, solvedIds, canonicalId, structure = ROADMAP_LEVELS) {
  const problem = allProblems.find((p) => p.canonical_id === canonicalId);
  if (!problem?.is_atlas_roadmap || problem.roadmap_topic == null) return null;

  const withCounts = buildRoadmapWithCounts(structure, allProblems);
  const after = evaluateRoadmap(withCounts, allProblems, (id) => solvedIds.has(id));
  const before = evaluateRoadmap(withCounts, allProblems, (id) => id !== canonicalId && solvedIds.has(id));

  const idx = after.findIndex((l, i) => l.isUnlocked && !before[i].isUnlocked);
  if (idx === -1) return null;
  const { level, title } = after[idx];
  return { type: 'level-unlocked', level, title, message: `Level ${level} unlocked: ${title}` };
}

// What the roadmap page SHOWS
export function visibleRoadmap(levels) {
  const kept = (levels || [])
    .map((l) => ({ ...l, topics: (l.topics || []).filter((t) => !t.isEmpty) }))
    .filter((l) => l.topics.length > 0);
  return kept.map((l, i) => ({ ...l, isFinal: i === kept.length - 1 }));
}
