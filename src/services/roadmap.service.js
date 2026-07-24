/**
 * Same exported shape as before (getRoadmap, getLevelProblems), same
 * `{ data: <payload> }` contract.
 *
 * getRoadmap() ports backend roadmap.service.js's getFullRoadmap (structure
 * + totalProblems counts, no solved/unlocked state - that's computed by
 * hooks/useRoadmap.js from lib/roadmap.js's enrichRoadmap, using the
 * already-in-memory progress map).
 *
 * getLevelProblems() replaces what used to be 8 separate network requests
 * (see hooks/useRoadmap.js) with 8 calls to this same in-memory function -
 * no network involved after the initial problems.json load.
 */

import { getProblems as fetchAllProblems } from './content/dataClient.js';
import { buildRoadmapWithCounts } from '../lib/roadmap.js';
import { getByRoadmapLevel } from '../lib/problems.filter.js';
import { ROADMAP_LEVELS } from '../constants/roadmap.js';

const wrap = (data) => ({ data });

export const roadmapService = {
  async getRoadmap() {
    const allProblems = await fetchAllProblems();
    return wrap(buildRoadmapWithCounts(ROADMAP_LEVELS, allProblems));
  },

  async getLevelProblems(level) {
    const allProblems = await fetchAllProblems();
    return wrap(getByRoadmapLevel(allProblems, level));
  },
};
