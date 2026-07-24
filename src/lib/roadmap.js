/**
 * Roadmap enrichment (solved counts, unlock state) and the unlock-toast
 * trigger check.
 *
 * Two related but distinct things live here, per docs/05-BUSINESS-LOGIC-
 * MAPPING.md — do not conflate them:
 *
 *  - `enrichRoadmap` computes DISPLAY state (isUnlocked booleans, solved
 *    counts) using >= UNLOCK_THRESHOLD. This is what renders lock icons.
 *    Ported from hooks/useRoadmap.js's existing (already client-side)
 *    enrichment logic.
 *
 *  - `checkUnlock` fires the one-time "just unlocked" TOAST, using an
 *    EXACT === UNLOCK_THRESHOLD check — it must fire only at the moment a
 *    topic crosses the threshold, not on every subsequent solve in an
 *    already-unlocked topic. Ported verbatim from backend/services/
 *    progress.service.js's checkUnlock.
 */

import { UNLOCK_THRESHOLD } from '../constants/roadmap.js';
import { getByRoadmapTopic } from './problems.filter.js';

const TOTAL_LEVELS = 8; // levels 0-7

/**
 * Verbatim port of backend/services/roadmap.service.js's getFullRoadmap:
 * takes the static ROADMAP_LEVELS structure and adds per-topic/per-level
 * `totalProblems` counts by counting the actual problems.json entries.
 * Does NOT add solved/unlocked state - that's enrichRoadmap's job, called
 * on the result of this function.
 *
 * @param {Array} roadmapStructure - ROADMAP_LEVELS from constants/roadmap.js
 * @param {Array} allProblems - full problems.json array
 */
export function buildRoadmapWithCounts(roadmapStructure, allProblems) {
  return roadmapStructure.map((levelData) => {
    const topicsWithCounts = levelData.topics.map((topic) => {
      const problems = getByRoadmapTopic(allProblems, levelData.level, topic);
      return { name: topic, totalProblems: problems.length };
    });

    const levelTotal = topicsWithCounts.reduce((sum, t) => sum + t.totalProblems, 0);

    return { ...levelData, topics: topicsWithCounts, totalProblems: levelTotal };
  });
}

/**
 * @param {Array} roadmapStructure - output of buildRoadmapWithCounts
 * @param {Array} allProblems - full problems.json array
 * @param {Record<string,string>} progressMap - canonical_id -> status
 */
export function enrichRoadmap(roadmapStructure, allProblems, progressMap) {
  if (!roadmapStructure?.length) return [];

  // Pre-group roadmap problems by level once, not per-level per-render.
  const problemsByLevel = {};
  for (let i = 0; i < TOTAL_LEVELS; i++) {
    problemsByLevel[i] = allProblems.filter((p) => p.is_atlas_roadmap && p.roadmap_level === i);
  }

  const levelSolvedCounts = {};
  for (let i = 0; i < TOTAL_LEVELS; i++) {
    let solved = 0;
    for (const p of problemsByLevel[i]) {
      if (progressMap[p.canonical_id] === 'solved') solved++;
    }
    levelSolvedCounts[i] = solved;
  }

  return roadmapStructure.map((levelData) => {
    const lvl = levelData.level;
    const solvedProblems = levelSolvedCounts[lvl] ?? 0;
    const prevSolved = lvl === 0 ? Infinity : (levelSolvedCounts[lvl - 1] ?? 0);
    const isUnlocked = lvl === 0 || prevSolved >= UNLOCK_THRESHOLD;
    const levelProblems = problemsByLevel[lvl] || [];

    const enrichedTopics = (levelData.topics || []).map((topic) => {
      const topicName = typeof topic === 'string' ? topic : topic.name;
      const totalProblems = typeof topic === 'object' ? (topic.totalProblems || 0) : 0;
      const topicSolved = levelProblems.filter(
        (p) => p.roadmap_topic === topicName && progressMap[p.canonical_id] === 'solved'
      ).length;

      return {
        name: topicName,
        totalProblems,
        solvedProblems: topicSolved,
        // A topic with 0 problems is considered unlocked (nothing to solve) -
        // matches original backend: !hasProblems || solved >= UNLOCK_THRESHOLD
        isUnlocked: totalProblems === 0 || lvl === 0 || topicSolved >= UNLOCK_THRESHOLD,
        unlockProgress: Math.min(topicSolved, UNLOCK_THRESHOLD),
      };
    });

    return {
      ...levelData,
      topics: enrichedTopics,
      solvedProblems,
      isUnlocked,
    };
  });
}

/**
 * Verbatim port of backend's checkUnlock, with one adaptation: rather than
 * re-querying Firestore for "all progress" (the old backend's extra read,
 * see docs/04 cost-optimization table row 2), the caller passes in the
 * solved-id set it already has in memory, WITH the just-written solve
 * already included (since local Firestore state may not have echoed back
 * yet at the exact moment this is called from a mutation handler).
 *
 * @param {Array} allProblems
 * @param {Set<string>} solvedIds - canonical_ids with status 'solved',
 *   including the one just marked solved
 * @param {string} canonicalId - the problem that was just marked solved
 * @returns {{level:number, topic:string, solvedCount:number} | null}
 */
export function checkUnlock(allProblems, solvedIds, canonicalId) {
  const problem = allProblems.find((p) => p.canonical_id === canonicalId);
  if (!problem?.is_atlas_roadmap || problem.roadmap_topic == null) return null;

  const { roadmap_level: level, roadmap_topic: topic } = problem;

  const topicProblems = getByRoadmapTopic(allProblems, level, topic);
  const solvedInTopic = topicProblems.filter((p) => solvedIds.has(p.canonical_id)).length;

  // EXACT equality, not >= : fires only at the moment of crossing.
  if (solvedInTopic === UNLOCK_THRESHOLD) {
    return { level, topic, solvedCount: solvedInTopic };
  }

  return null;
}
