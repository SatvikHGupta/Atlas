/*
  Roadmap rules, enrichment (solved counts, lock state) and the unlock toast check.

  ONE authoritative rule lives here (lead decision, may change later):
  - Level 0 is always open.
  - A topic is complete when solved >= min(UNLOCK_THRESHOLD, totalProblems).
  - A topic with 0 problems is "empty" and is ignored by every count below.
  - Level N (N > 0) unlocks when every non-empty topic of level N-1 is complete.
    If level N-1 has no non-empty topics it counts as complete.
  Nothing outside `getLevelUnlockState` re-derives the unlock rule.

  NOTE: this is a UI lock. Progress lives client-side (Firestore, per user), so
  the lock keeps the UI honest but is not a security boundary.
*/

import { UNLOCK_THRESHOLD, ROADMAP_LEVELS } from '../constants/roadmap.js';
import { getByRoadmapTopic } from './problems.filter.js';

// BUG-096/185: derived from the constant, never hard-coded. Nothing may assume 8 or 14.
export const TOTAL_LEVELS = ROADMAP_LEVELS.length;

/* Verbatim port of backend/services/roadmap.service.js's getFullRoadmap: takes the static ROADMAP_LEVELS structure and adds per-topic/per-level `totalProblems` counts by counting the actual problems.json entries. Does NOT add solved/unlocked state - that's enrichRoadmap's job, called on the result of this function. @param {Array} roadmapStructure - ROADMAP_LEVELS from constants/roadmap.js @param {Array} allProblems - full problems.json array */
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

// Thin topics scale down: a topic with 3 problems needs 3, not 5.
export function getTopicThreshold(totalProblems) {
  return Math.min(UNLOCK_THRESHOLD, totalProblems || 0);
}

/*
  THE unlock rule (BUG-086/090). `prevTopicStates` are the enriched topics of
  level N-1 (`{ slug, isEmpty, isComplete }`). Returns which topics are still
  missing so the UI can say exactly what to finish.
*/
export function getLevelUnlockState(level, prevTopicStates = []) {
  if (!(level > 0)) return { isUnlocked: true, missingTopics: [] };
  const missingTopics = prevTopicStates
    .filter((t) => !t.isEmpty && !t.isComplete)
    .map((t) => t.slug);
  return { isUnlocked: missingTopics.length === 0, missingTopics };
}

/*
  Hint shown on locked cards, e.g. "Complete Hashing, Bit Manipulation in
  Level 2 to unlock". `nameBySlug` is optional (slug is shown when unknown).
*/
export function formatLockHint(level, missingTopics = [], nameBySlug = {}) {
  const names = missingTopics.map((s) => nameBySlug[s] || s);
  if (!names.length) return `Complete Level ${level - 1} to unlock`;
  return `Complete ${names.join(', ')} in Level ${level - 1} to unlock`;
}

/*
  Route param check for /roadmap/[level] (BUG-097/142): a plain non-negative
  integer string inside 0..levelCount-1. Rejects '', -1, 1abc, 01, 1.5, 999.
  Returns the level number, or null when invalid.
*/
export function parseLevelParam(value, levelCount = TOTAL_LEVELS) {
  if (typeof value !== 'string' || !/^(0|[1-9]\d*)$/.test(value)) return null;
  const n = Number(value);
  return Number.isSafeInteger(n) && n < levelCount ? n : null;
}

/*
  Core evaluation, shared by enrichRoadmap (display) and checkUnlock (toast) so
  both always agree. `isSolved(canonicalId)` is the only progress input.
*/
function evaluateRoadmap(roadmapStructure, allProblems, isSolved) {
  // Group roadmap problems once: "level:topic" -> canonical ids.
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
      topics: topics.map((t) => ({ ...t, isUnlocked: unlock.isUnlocked })), // topics of an open level are open
      // Sum of listed topics so the ring never exceeds totalProblems.
      solvedProblems: topics.reduce((sum, t) => sum + t.solvedProblems, 0),
      isUnlocked: unlock.isUnlocked,
      missingTopics: unlock.missingTopics,
      isComplete: nonEmpty.every((t) => t.isComplete), // canUnlockNext (BUG-090)
      isFinal: idx === roadmapStructure.length - 1,
    });
  });
  return result;
}

/* @param {Array} roadmapStructure - output of buildRoadmapWithCounts @param {Array} allProblems - full problems.json array @param {Record<string,string>} progressMap - canonical_id -> status */
export function enrichRoadmap(roadmapStructure, allProblems, progressMap) {
  if (!roadmapStructure?.length) return [];
  const map = progressMap || {};
  return evaluateRoadmap(roadmapStructure, allProblems, (id) => map[id] === 'solved');
}

/*
  Toast trigger (contract C3). Compares the unlock state WITH and WITHOUT the
  just-solved id and reports a level only when this very solve opened it
  (BUG-091/092/093). Level 0 never flips, an open level never flips again.
  `solvedIds` already includes `canonicalId`. `structure` is injectable for tests.
  @returns {{type:'level-unlocked', level:number, title:string, message:string} | null}
*/
export function checkUnlock(allProblems, solvedIds, canonicalId, structure = ROADMAP_LEVELS) {
  const problem = allProblems.find((p) => p.canonical_id === canonicalId);
  if (!problem?.is_atlas_roadmap || problem.roadmap_topic == null) return null;

  const withCounts = buildRoadmapWithCounts(structure, allProblems);
  const after = evaluateRoadmap(withCounts, allProblems, (id) => solvedIds.has(id));
  const before = evaluateRoadmap(withCounts, allProblems, (id) => id !== canonicalId && solvedIds.has(id));

  // A chain of empty levels can open several at once; announce the first.
  const idx = after.findIndex((l, i) => l.isUnlocked && !before[i].isUnlocked);
  if (idx === -1) return null;
  const { level, title } = after[idx];
  return { type: 'level-unlocked', level, title, message: `Level ${level} unlocked: ${title}` };
}

/*
  What the roadmap page SHOWS. A topic with no problems is not a topic a learner can do anything with, so it is removed from
  the chip row instead of sitting there as a greyed "No problems yet" box, and a level whose topics are ALL empty is dropped
  from the list. Level numbers are NOT renumbered: they are ids that the problems' roadmap_level and the /roadmap/<n> URLs
  already use, so renumbering would silently break links and saved progress.
  The unlock rule already ignores empty topics/levels (see getLevelUnlockState), so hiding them never changes who unlocks what.
  `isFinal` is recomputed because the last level may have been the one dropped.
*/
export function visibleRoadmap(levels) {
  const kept = (levels || [])
    .map((l) => ({ ...l, topics: (l.topics || []).filter((t) => !t.isEmpty) }))
    .filter((l) => l.topics.length > 0);
  return kept.map((l, i) => ({ ...l, isFinal: i === kept.length - 1 }));
}
